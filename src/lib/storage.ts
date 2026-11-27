import { Preferences } from '@capacitor/preferences';
import { validateImportPayload } from './validation';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { calculateSubjectStats, calculateOverallStats } from './calculations';
import { toISODateStr } from './dateUtils';
import type { Subject, AttendanceRecord, AppSettings } from './types';
import { APP_VERSION_NAME } from './constants';
import { suppressAppLockTemporarily } from './appLockBridge';
import { cancelAllNotifications } from './notifications';
import { buildAttendanceReportPdf } from './pdfReport';

const escapeCsvField = (field: string): string => {
  if (/[,"\n\r]/.test(field) || /^[=+\-@\t\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const toBase64 = (str: string): string => bytesToBase64(new TextEncoder().encode(str));

const STORAGE_VERSION = 3;

export const saveToStorage = async (key: string, value: unknown) => {
  await Preferences.set({
    key,
    value: JSON.stringify(value),
  });
};

export const getFromStorage = async <T>(key: string): Promise<T | null> => {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn(`Corrupted storage JSON for key "${key}", ignoring:`, err);
    return null;
  }
};


export const clearAllStorage = async () => {
  await cancelAllNotifications();
  await Preferences.clear();
};

/**
 * Run on app startup to migrate storage schema if needed.
 * Ensures backward compatibility when new storage keys are introduced.
 */
export const migrateStorageIfNeeded = async () => {
  const version = await getFromStorage<number>('storage_version');

  if (!version || version < 2) {
    // v1 -> v2: Initialize archived_semesters if missing
    const existing = await getFromStorage('archived_semesters');
    if (!existing) {
      await saveToStorage('archived_semesters', []);
    }
  }

  if (!version || version < 3) {
    // v2 -> v3: Patch subjects with default attendedSoFar: 0 and missedSoFar: 0 if undefined
    const storedSubjects = await getFromStorage<Subject[]>('subjects');
    if (storedSubjects && Array.isArray(storedSubjects)) {
      const patchedSubjects = storedSubjects.map((s) => ({
        ...s,
        attendedSoFar: s.attendedSoFar ?? 0,
        missedSoFar: s.missedSoFar ?? 0,
      }));
      await saveToStorage('subjects', patchedSubjects);
    }
    await saveToStorage('storage_version', STORAGE_VERSION);
  }
};

export const exportAppState = async () => {
  const subjects = await getFromStorage('subjects');
  const attendance = await getFromStorage('attendance_records');
  const rawSettings = await getFromStorage<AppSettings>('app_settings');
  const archived = await getFromStorage('archived_semesters');

  // Scrub PIN hash & lock flag from exported backups to avoid leaking PIN material or locking out restored devices
  const settings = rawSettings
    ? { ...rawSettings, appLockPin: undefined, appLockEnabled: false }
    : rawSettings;

  const data = {
    subjects,
    attendance,
    settings,
    archived_semesters: archived,
    exportedAt: new Date().toISOString(),
    version: APP_VERSION_NAME
  };

  const fileName = `bunkcalc_backup_${toISODateStr(new Date())}.json`;

  if (Capacitor.isNativePlatform()) {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const base64Data = toBase64(jsonStr);
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      suppressAppLockTemporarily();
      await Share.share({
        title: 'BunkCalc Backup',
        text: 'My BunkCalc Attendance Backup file.',
        files: [savedFile.uri],
        dialogTitle: 'Save BunkCalc Backup',
      });
      return;
    } catch (err) {
      console.error('Native app backup share failed, falling back to web download:', err);
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importAppState = async (file: File): Promise<unknown> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size exceeds 5 MB limit.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawText = e.target?.result as string;
        const data = JSON.parse(rawText);
        
        const validated = validateImportPayload(data);
        if (!validated.valid || !validated.data) {
          throw new Error(validated.error || "Invalid import file format.");
        }
        
        const cleanData = validated.data;
        if (cleanData.subjects) await saveToStorage('subjects', cleanData.subjects);
        if (cleanData.attendance) await saveToStorage('attendance_records', cleanData.attendance);
        if (cleanData.settings) await saveToStorage('app_settings', cleanData.settings);
        if (cleanData.archived_semesters) await saveToStorage('archived_semesters', cleanData.archived_semesters);
        
        resolve(cleanData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const exportToCSV = async () => {
  const subjects = (await getFromStorage<Subject[]>('subjects')) || [];
  const attendance = (await getFromStorage<AttendanceRecord[]>('attendance_records')) || [];
  
  const header = 'Date,Subject,Status,Credits';
  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const rows = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
    const subject = subjectMap.get(record.subjectId);
    const subjectName = subject ? subject.name : 'Unknown';
    const credits = subject ? subject.credits : 0;
    return `${record.date},${escapeCsvField(subjectName)},${record.status},${credits}`;
  });
  
  const csvContent = [header, ...rows].join('\n');
  const fileName = `bunkcalc_attendance_${toISODateStr(new Date())}.csv`;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = toBase64(csvContent);
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      suppressAppLockTemporarily();
      await Share.share({
        title: 'BunkCalc CSV Report',
        text: 'My BunkCalc Attendance Report.',
        files: [savedFile.uri],
        dialogTitle: 'Save BunkCalc CSV',
      });
      return;
    } catch (err) {
      console.error('Native app CSV share failed, falling back to web download:', err);
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async () => {
  const subjects = (await getFromStorage<Subject[]>('subjects')) || [];
  const attendance = (await getFromStorage<AttendanceRecord[]>('attendance_records')) || [];
  const settings = await getFromStorage<AppSettings>('app_settings');

  const overall = calculateOverallStats(
    subjects,
    attendance,
    settings?.semesterEndDate || '',
    settings?.holidays || [],
    settings?.globalThreshold ?? 0.75
  );

  const pdfBytes = buildAttendanceReportPdf({
    title: 'BunkCalc Attendance Report',
    subtitle: `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    summaryLine: `Overall: ${overall.percentage}% (${overall.totalAttended}/${overall.totalClasses}) | Safe Bunks: ${overall.totalSafeBunks}`,
    rows: subjects.map((subject) => {
      const stats = calculateSubjectStats(
        subject,
        attendance,
        settings?.semesterEndDate,
        settings?.holidays,
        settings?.globalThreshold
      );
      return {
        subjectName: `${subject.name}${subject.isLab ? ' (Lab)' : ''}`,
        attended: stats.attendedCount,
        total: stats.totalClasses,
        percentage: `${stats.attendancePct.toFixed(1)}%`,
        budgetLabel: stats.bunkBudget >= 0 ? `${stats.bunkBudget} safe` : `Need ${stats.classesNeededToRecover}`,
      };
    }),
    footer: `Generated by BunkCalc v${APP_VERSION_NAME} - Offline Attendance Tracker`,
  });

  const fileName = `bunkcalc_report_${toISODateStr(new Date())}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = bytesToBase64(pdfBytes);
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      suppressAppLockTemporarily();
      await Share.share({
        title: 'BunkCalc Attendance Report',
        text: 'My BunkCalc Attendance Report (PDF).',
        files: [savedFile.uri],
        dialogTitle: 'Share Attendance Report',
      });
      return;
    } catch (err) {
      console.error('Native PDF share failed, falling back to browser download:', err);
    }
  }

  const pdfBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};



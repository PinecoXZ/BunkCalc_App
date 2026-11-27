import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Subject, AttendanceRecord, AppSettings, ArchivedSemester } from '../../lib/types';
import { calculateOverallStats } from '../../lib/calculations';
import { sanitizeName, validateArchiveName } from '../../lib/validation';
import { saveToStorage } from '../../lib/storage';
import { cancelAllNotifications } from '../../lib/notifications';

interface Props {
  isOpen: boolean;
  subjects: Subject[];
  records: AttendanceRecord[];
  settings: AppSettings;
  onArchive: (archived: ArchivedSemester) => Promise<void>;
  onClose: () => void;
  onError: (title: string, message: string) => void;
}

export const ArchiveSemesterModal: React.FC<Props> = ({
  isOpen,
  subjects,
  records,
  settings,
  onArchive,
  onClose,
  onError,
}) => {
  const [archiveName, setArchiveName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleArchive = async () => {
    const sanitized = sanitizeName(archiveName);
    const validation = validateArchiveName(sanitized);
    if (!validation.valid) {
      onError('Archive Failed', validation.error || 'Please enter a valid semester name.');
      return;
    }
    if (subjects.length === 0) {
      onError('Archive Failed', 'No subjects to archive.');
      return;
    }

    setIsSubmitting(true);
    try {
      const stats = calculateOverallStats(
        subjects,
        records,
        settings.semesterEndDate,
        settings.holidays,
        settings.globalThreshold
      );

      const archived: ArchivedSemester = {
        id: uuidv4(),
        name: sanitized,
        endDate: settings.semesterEndDate,
        archivedAt: new Date().toISOString(),
        subjects: [...subjects],
        records: [...records],
        overallPct: stats.percentage,
      };

      await onArchive(archived);
      await saveToStorage('subjects', []);
      await saveToStorage('attendance_records', []);
      await saveToStorage('app_settings', { ...settings, semesterEndDate: '' });
      await cancelAllNotifications();
      onClose();
      window.location.reload();
    } catch {
      onError('Archive Error', 'Failed to archive current semester data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-modal-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <h3 id="archive-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">Archive Current Semester</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Save your current attendance records and subjects into your archive history, then start a fresh semester.
        </p>
        <input
          placeholder="e.g. 5th Semester (Autumn 2026)"
          value={archiveName}
          onChange={(e) => setArchiveName(e.target.value)}
          disabled={isSubmitting}
          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleArchive}
            disabled={isSubmitting}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Archiving...' : 'Archive & Reset'}
          </button>
        </div>
      </div>
    </div>
  );
};

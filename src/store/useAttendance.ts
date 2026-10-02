import { create } from 'zustand';
import type { AttendanceRecord } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';
import { handleAttendanceAlerts } from '../lib/notifications';
import { calculateAttendanceStreak } from '../lib/calculations';
import { syncNotificationsAndWidgets } from './syncHelpers';
import { useSubjects } from './useSubjects';
import { useSettings } from './useSettings';

interface LastAction {
  record: AttendanceRecord;
  previousRecord: AttendanceRecord | null; // null if no prior record for that subject+date
}

interface AttendanceState {
  records: AttendanceRecord[];
  lastAction: LastAction | null;
  markAttendance: (record: AttendanceRecord) => Promise<void>;
  markMultipleAttendance: (records: AttendanceRecord[]) => Promise<void>;
  unmarkAttendance: (id: string) => Promise<void>;
  unmarkMultipleAttendance: (recordIds: string[]) => Promise<void>;
  undoLastAction: () => Promise<void>;
  clearLastAction: () => void;
  loadRecords: () => Promise<void>;
  getStreak: () => number;
  deleteRecordsForSubject: (subjectId: string) => Promise<void>;
}

export const useAttendance = create<AttendanceState>((set, get) => ({
  records: [],
  lastAction: null,
  markAttendance: async (record) => {
    let oldRecords: AttendanceRecord[] = [];
    let newRecords: AttendanceRecord[] = [];
    let previousRecord: AttendanceRecord | null = null;
    
    set((state) => {
      oldRecords = state.records;
      previousRecord = oldRecords.find(
        r => r.subjectId === record.subjectId && r.date === record.date
      ) || null;
      const filtered = oldRecords.filter(r => !(r.subjectId === record.subjectId && r.date === record.date));
      newRecords = [...filtered, record];
      return { 
        records: newRecords,
        lastAction: { record, previousRecord }
      };
    });

    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
    }

    // Advanced Notifications logic
    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;
    const subject = allSubjects.find(s => s.id === record.subjectId);
    if (subject) {
      await handleAttendanceAlerts(
        subject, 
        oldRecords, 
        newRecords, 
        settings
      );
    }
    // Re-sync scheduled class reminders and widgets to ensure marked classes are updated
    await syncNotificationsAndWidgets(allSubjects, settings, newRecords);
  },
  markMultipleAttendance: async (newEntries) => {
    if (newEntries.length === 0) return;
    let oldRecords: AttendanceRecord[] = [];
    let updatedRecords: AttendanceRecord[] = [];

    set((state) => {
      oldRecords = state.records;
      const keySet = new Set(newEntries.map(e => `${e.subjectId}_${e.date}`));
      const remaining = oldRecords.filter(r => !keySet.has(`${r.subjectId}_${r.date}`));
      updatedRecords = [...remaining, ...newEntries];
      return {
        records: updatedRecords,
        lastAction: null,
      };
    });

    try {
      await saveToStorage('attendance_records', updatedRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
    }

    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;

    for (const entry of newEntries) {
      const subject = allSubjects.find(s => s.id === entry.subjectId);
      if (subject) {
        await handleAttendanceAlerts(subject, oldRecords, updatedRecords, settings);
      }
    }

    await syncNotificationsAndWidgets(allSubjects, settings, updatedRecords);
  },
  unmarkAttendance: async (id) => {
    let oldRecords: AttendanceRecord[] = [];
    let newRecords: AttendanceRecord[] = [];
    let record: AttendanceRecord | undefined;
    
    set((state) => {
      oldRecords = state.records;
      record = oldRecords.find(r => r.id === id);
      newRecords = oldRecords.filter((r) => r.id !== id);
      return { 
        records: newRecords,
        lastAction: record ? { record, previousRecord: record } : null
      };
    });
    
    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
    }

    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;
    const targetRecord = record;
    if (targetRecord) {
      const subject = allSubjects.find(s => s.id === targetRecord.subjectId);
      if (subject) {
        await handleAttendanceAlerts(
          subject, 
          oldRecords, 
          newRecords, 
          settings
        );
      }
    }
    await syncNotificationsAndWidgets(allSubjects, settings, newRecords);
  },
  unmarkMultipleAttendance: async (recordIds) => {
    if (recordIds.length === 0) return;
    let updatedRecords: AttendanceRecord[] = [];
    const idSet = new Set(recordIds);

    set((state) => {
      updatedRecords = state.records.filter(r => !idSet.has(r.id));
      return {
        records: updatedRecords,
        lastAction: null,
      };
    });

    try {
      await saveToStorage('attendance_records', updatedRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
    }

    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;
    await syncNotificationsAndWidgets(allSubjects, settings, updatedRecords);
  },
  undoLastAction: async () => {
    const { lastAction } = get();
    if (!lastAction) return;

    const { record, previousRecord } = lastAction;
    let oldRecords: AttendanceRecord[] = [];
    let newRecords: AttendanceRecord[] = [];

    set((state) => {
      oldRecords = state.records;
      newRecords = oldRecords.filter(
        r => !(r.subjectId === record.subjectId && r.date === record.date)
      );
      if (previousRecord) {
        newRecords = [...newRecords, previousRecord];
      }
      return { records: newRecords, lastAction: null };
    });

    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
    }

    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;

    // Sync threshold alerts after undo
    const subject = allSubjects.find(s => s.id === record.subjectId);
    if (subject) {
      await handleAttendanceAlerts(subject, oldRecords, newRecords, settings);
    }

    await syncNotificationsAndWidgets(allSubjects, settings, newRecords);
  },
  clearLastAction: () => {
    set({ lastAction: null });
  },
  deleteRecordsForSubject: async (subjectId) => {
    set((state) => ({
      records: state.records.filter(r => r.subjectId !== subjectId),
      lastAction: null,
    }));
    const newRecords = get().records;
    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
    }
  },
  loadRecords: async () => {
    const stored = await getFromStorage<AttendanceRecord[]>('attendance_records');
    if (stored) set({ records: stored });
  },
  getStreak: () => {
    return calculateAttendanceStreak(
      get().records,
      useSubjects.getState().subjects,
      useSettings.getState().settings.holidays
    );
  },
}));


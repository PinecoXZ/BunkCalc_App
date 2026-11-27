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
  storageError: string | null;
  clearStorageError: () => void;
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

const matchesRecordTarget = (existing: AttendanceRecord, target: AttendanceRecord): boolean => {
  if (existing.subjectId !== target.subjectId || existing.date !== target.date) return false;
  if (!target.slot || !existing.slot) return true;
  return existing.slot === target.slot;
};

export const useAttendance = create<AttendanceState>((set, get) => ({
  records: [],
  lastAction: null,
  storageError: null,
  clearStorageError: () => set({ storageError: null }),
  markAttendance: async (record) => {
    const previousState = { records: get().records, lastAction: get().lastAction };
    let oldRecords: AttendanceRecord[] = [];
    let newRecords: AttendanceRecord[] = [];
    let previousRecord: AttendanceRecord | null = null;
    
    set((state) => {
      oldRecords = state.records;
      previousRecord = oldRecords.find(r => matchesRecordTarget(r, record)) || null;
      const filtered = oldRecords.filter(r => !matchesRecordTarget(r, record));
      newRecords = [...filtered, record];
      return { 
        records: newRecords,
        lastAction: { record, previousRecord },
        storageError: null,
      };
    });

    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
      set({
        records: previousState.records,
        lastAction: previousState.lastAction,
        storageError: 'Failed to save attendance record to device storage.',
      });
      return;
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
        settings,
        record.slot
      );
    }
    // Re-sync scheduled class reminders and widgets to ensure marked classes are updated
    await syncNotificationsAndWidgets(allSubjects, settings, newRecords);
  },
  markMultipleAttendance: async (newEntries) => {
    if (newEntries.length === 0) return;
    const previousState = { records: get().records, lastAction: get().lastAction };
    let oldRecords: AttendanceRecord[] = [];
    let updatedRecords: AttendanceRecord[] = [];

    set((state) => {
      oldRecords = state.records;
      const remaining = oldRecords.filter(
        r => !newEntries.some(entry => matchesRecordTarget(r, entry))
      );
      updatedRecords = [...remaining, ...newEntries];
      return {
        records: updatedRecords,
        lastAction: null,
        storageError: null,
      };
    });

    try {
      await saveToStorage('attendance_records', updatedRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
      set({
        records: previousState.records,
        lastAction: previousState.lastAction,
        storageError: 'Failed to save attendance records to device storage.',
      });
      return;
    }

    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;

    const alertedSubjectIds = new Set<string>();
    for (const entry of newEntries) {
      const subject = allSubjects.find(s => s.id === entry.subjectId);
      if (subject && !alertedSubjectIds.has(subject.id)) {
        alertedSubjectIds.add(subject.id);
        await handleAttendanceAlerts(subject, oldRecords, updatedRecords, settings, entry.slot);
      }
    }

    await syncNotificationsAndWidgets(allSubjects, settings, updatedRecords);
  },
  unmarkAttendance: async (id) => {
    const previousState = { records: get().records, lastAction: get().lastAction };
    let oldRecords: AttendanceRecord[] = [];
    let newRecords: AttendanceRecord[] = [];
    let record: AttendanceRecord | undefined;
    
    set((state) => {
      oldRecords = state.records;
      record = oldRecords.find(r => r.id === id);
      newRecords = oldRecords.filter((r) => r.id !== id);
      return { 
        records: newRecords,
        lastAction: record ? { record, previousRecord: record } : null,
        storageError: null,
      };
    });
    
    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
      set({
        records: previousState.records,
        lastAction: previousState.lastAction,
        storageError: 'Failed to remove attendance record from device storage.',
      });
      return;
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
          settings,
          targetRecord.slot
        );
      }
    }
    await syncNotificationsAndWidgets(allSubjects, settings, newRecords);
  },
  unmarkMultipleAttendance: async (recordIds) => {
    if (recordIds.length === 0) return;
    const previousState = { records: get().records, lastAction: get().lastAction };
    let updatedRecords: AttendanceRecord[] = [];
    const idSet = new Set(recordIds);

    set((state) => {
      updatedRecords = state.records.filter(r => !idSet.has(r.id));
      return {
        records: updatedRecords,
        lastAction: null,
        storageError: null,
      };
    });

    try {
      await saveToStorage('attendance_records', updatedRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
      set({
        records: previousState.records,
        lastAction: previousState.lastAction,
        storageError: 'Failed to clear attendance records from device storage.',
      });
      return;
    }

    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;
    await syncNotificationsAndWidgets(allSubjects, settings, updatedRecords);
  },
  undoLastAction: async () => {
    const { lastAction } = get();
    if (!lastAction) return;

    const previousState = { records: get().records, lastAction };
    const { record, previousRecord } = lastAction;
    let oldRecords: AttendanceRecord[] = [];
    let newRecords: AttendanceRecord[] = [];

    set((state) => {
      oldRecords = state.records;
      newRecords = oldRecords.filter(r => !matchesRecordTarget(r, record));
      if (previousRecord) {
        newRecords = [...newRecords, previousRecord];
      }
      return { records: newRecords, lastAction: null, storageError: null };
    });

    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
      set({
        records: previousState.records,
        lastAction: previousState.lastAction,
        storageError: 'Failed to undo attendance change in device storage.',
      });
      return;
    }

    const allSubjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;

    // Sync threshold alerts after undo
    const subject = allSubjects.find(s => s.id === record.subjectId);
    if (subject) {
      await handleAttendanceAlerts(subject, oldRecords, newRecords, settings, record.slot);
    }

    await syncNotificationsAndWidgets(allSubjects, settings, newRecords);
  },
  clearLastAction: () => {
    set({ lastAction: null });
  },
  deleteRecordsForSubject: async (subjectId) => {
    const previousState = { records: get().records, lastAction: get().lastAction };
    set((state) => ({
      records: state.records.filter(r => r.subjectId !== subjectId),
      lastAction: null,
      storageError: null,
    }));
    const newRecords = get().records;
    try {
      await saveToStorage('attendance_records', newRecords);
    } catch (err) {
      console.error('Failed to persist attendance_records:', err);
      set({
        records: previousState.records,
        lastAction: previousState.lastAction,
        storageError: 'Failed to delete subject records from device storage.',
      });
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


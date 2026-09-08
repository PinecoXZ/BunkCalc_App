import { create } from 'zustand';
import type { AttendanceRecord } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';
import { handleAttendanceAlerts, scheduleDailyClassReminders } from '../lib/notifications';
import { syncWidgetData } from '../lib/widgetData';
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
  unmarkAttendance: (id: string) => Promise<void>;
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
    // Re-sync scheduled class reminders to ensure already-marked classes are excluded
    await scheduleDailyClassReminders(allSubjects, settings, newRecords);
    await syncWidgetData(allSubjects, newRecords, settings);
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
    await scheduleDailyClassReminders(allSubjects, settings, newRecords);
    await syncWidgetData(allSubjects, newRecords, settings);
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

    await scheduleDailyClassReminders(allSubjects, settings, newRecords);
    await syncWidgetData(allSubjects, newRecords, settings);
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
    const { records } = get();
    const subjects = useSubjects.getState().subjects;
    const settings = useSettings.getState().settings;
    if (subjects.length === 0 || records.length === 0) return 0;

    // Walk backwards from today counting consecutive days where ALL scheduled classes were 'present' (skip 'cancelled' and 'holidays')
    const now = new Date();
    let streak = 0;

    for (let daysBack = 0; daysBack < 365; daysBack++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - daysBack);
      const dayOfWeek = checkDate.getDay();
      const dateStr = checkDate.toLocaleDateString('en-CA');

      // Check if this date falls within a configured holiday
      const isHoliday = settings.holidays?.some(h => dateStr >= h.startDate && dateStr <= h.endDate);
      if (isHoliday) continue; // Skip holidays without breaking streak

      // Find subjects scheduled for this day
      const scheduledSubjects = subjects.filter(s =>
        s.schedule.some(slot => Number(slot.day) === dayOfWeek)
      );

      // No classes scheduled → skip this day (don't break streak)
      if (scheduledSubjects.length === 0) continue;

      // Check attendance for each scheduled subject on this date
      const dayRecords = records.filter(r => r.date === dateStr);
      
      // If no records at all for today (today might not have started yet)
      if (dayRecords.length === 0) {
        if (daysBack === 0) continue; // Today hasn't been marked yet, skip
        break; // Past day with no records = missed
      }

      let hasAbsent = false;
      let hasPresent = false;
      let unmarkedCount = 0;

      for (const sub of scheduledSubjects) {
        const rec = dayRecords.find(r => r.subjectId === sub.id);
        if (!rec) {
          unmarkedCount++;
        } else if (rec.status === 'absent') {
          hasAbsent = true;
          break;
        } else if (rec.status === 'present') {
          hasPresent = true;
        }
      }

      if (hasAbsent) break;

      if (daysBack === 0) {
        if (hasPresent && unmarkedCount === 0) {
          streak++;
        }
        continue;
      }

      if (unmarkedCount > 0) break;
      streak++;
    }

    return streak;
  },
}));

import { create } from 'zustand';
import type { Subject } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';
import { cancelSubjectNotifications } from '../lib/notifications';
import { syncNotificationsAndWidgets } from './syncHelpers';
import { useAttendance } from './useAttendance';
import { useSettings } from './useSettings';

interface SubjectsState {
  subjects: Subject[];
  storageError: string | null;
  clearStorageError: () => void;
  addSubject: (subject: Subject) => Promise<void>;
  addMultipleSubjects: (subjects: Subject[]) => Promise<void>;
  updateSubject: (subject: Subject) => Promise<void>;
  updateAllSubjectsThreshold: (threshold: number) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  loadSubjects: () => Promise<void>;
}

export const useSubjects = create<SubjectsState>((set, get) => ({
  subjects: [],
  storageError: null,
  clearStorageError: () => set({ storageError: null }),
  addSubject: async (subject) => {
    const previous = get().subjects;
    const newSubjects = [...previous, subject];
    set({ subjects: newSubjects, storageError: null });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subjects:', err);
      set({ subjects: previous, storageError: 'Failed to save subject to device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after adding subject:', err);
    }
  },
  addMultipleSubjects: async (subjectsToAdd) => {
    if (subjectsToAdd.length === 0) return;
    const previous = get().subjects;
    const newSubjects = [...previous, ...subjectsToAdd];
    set({ subjects: newSubjects, storageError: null });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subjects:', err);
      set({ subjects: previous, storageError: 'Failed to save subjects to device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after adding subjects:', err);
    }
  },
  updateSubject: async (subject) => {
    const previous = get().subjects;
    const newSubjects = previous.map((s) => (s.id === subject.id ? subject : s));
    set({ subjects: newSubjects, storageError: null });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subjects:', err);
      set({ subjects: previous, storageError: 'Failed to update subject in device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after updating subject:', err);
    }
  },
  updateAllSubjectsThreshold: async (threshold) => {
    const previous = get().subjects;
    const newSubjects = previous.map((s) => ({ ...s, threshold }));
    set({ subjects: newSubjects, storageError: null });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subject thresholds:', err);
      set({ subjects: previous, storageError: 'Failed to update subject thresholds in device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after updating subject thresholds:', err);
    }
  },
  deleteSubject: async (id) => {
    const previous = get().subjects;
    const newSubjects = previous.filter((s) => s.id !== id);
    set({ subjects: newSubjects, storageError: null });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subjects:', err);
      set({ subjects: previous, storageError: 'Failed to delete subject from device storage.' });
      return;
    }
    
    try {
      await cancelSubjectNotifications(id);
      await syncNotificationsAndWidgets(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to cancel notifications:', err);
    }

    try {
      await useAttendance.getState().deleteRecordsForSubject(id);
    } catch (err) {
      console.error('Failed to cleanup attendance records:', err);
    }
  },
  loadSubjects: async () => {
    const stored = await getFromStorage<Subject[]>('subjects');
    if (stored) set({ subjects: stored });
  },
}));

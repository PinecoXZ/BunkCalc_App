import { create } from 'zustand';
import type { Subject } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';
import { cancelSubjectNotifications } from '../lib/notifications';
import { syncNotificationsAndWidgets } from './syncHelpers';
import { useAttendance } from './useAttendance';
import { useSettings } from './useSettings';

interface SubjectsState {
  subjects: Subject[];
  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  loadSubjects: () => Promise<void>;
}

export const useSubjects = create<SubjectsState>((set) => ({
  subjects: [],
  addSubject: async (subject) => {
    let newSubjects: Subject[] = [];
    set((state) => {
      newSubjects = [...state.subjects, subject];
      return { subjects: newSubjects };
    });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subjects:', err);
    }

    try {
      await syncNotificationsAndWidgets(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after adding subject:', err);
    }
  },
  updateSubject: async (subject) => {
    let newSubjects: Subject[] = [];
    set((state) => {
      newSubjects = state.subjects.map((s) => (s.id === subject.id ? subject : s));
      return { subjects: newSubjects };
    });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subjects:', err);
    }

    try {
      await syncNotificationsAndWidgets(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after updating subject:', err);
    }
  },
  deleteSubject: async (id) => {
    let newSubjects: Subject[] = [];
    set((state) => {
      newSubjects = state.subjects.filter((s) => s.id !== id);
      return { subjects: newSubjects };
    });
    try {
      await saveToStorage('subjects', newSubjects);
    } catch (err) {
      console.error('Failed to persist subjects:', err);
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

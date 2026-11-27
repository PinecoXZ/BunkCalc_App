import { create } from 'zustand';
import type { AppSettings, ArchivedSemester, Holiday } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';
import { hashPin, isHashedPin } from '../lib/pinUtils';
import { syncNotificationsAndWidgets } from './syncHelpers';
import { useSubjects } from './useSubjects';
import { useAttendance } from './useAttendance';

interface SettingsState {
  settings: AppSettings;
  archivedSemesters: ArchivedSemester[];
  storageError: string | null;
  clearStorageError: () => void;
  setSettings: (settings: AppSettings) => Promise<void>;
  addHoliday: (holiday: Holiday) => Promise<void>;
  addMultipleHolidays: (holidays: Holiday[]) => Promise<void>;
  updateHoliday: (holiday: Holiday) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  loadArchivedSemesters: () => Promise<void>;
  archiveSemester: (semester: ArchivedSemester) => Promise<void>;
  deleteArchivedSemester: (id: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  semesterEndDate: `${new Date().getFullYear()}-12-31`,
  globalThreshold: 0.75,
  warningBuffer: 0.05,
  notificationsEnabled: true,
  preClassReminder: true,
  postClassReminder: true,
  sundaySummaryNotification: true,
  dailyScheduleDigest: true,
  dailyDigestTime: '07:30',
  reminderMinutesBefore: 10,
  holidayMode: false,
  hapticsEnabled: true,
  theme: 'dark',
  themeAccent: 'blue',
  toneMode: 'standard',
  autoUpdateCheck: true,
  holidays: [],
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  archivedSemesters: [],
  storageError: null,
  clearStorageError: () => set({ storageError: null }),
  setSettings: async (settings) => {
    const previous = get().settings;
    set({ settings, storageError: null });
    try {
      await saveToStorage('app_settings', settings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
      set({ settings: previous, storageError: 'Failed to save settings to device storage.' });
      return;
    }
    applyTheme(settings.theme, settings.themeAccent);

    try {
      await syncNotificationsAndWidgets(useSubjects.getState().subjects, settings, useAttendance.getState().records);
    } catch (err) {
      console.warn('Failed to sync reminders on settings change:', err);
    }
  },
  addHoliday: async (holiday) => {
    const currentSettings = get().settings;
    const currentHolidays = currentSettings.holidays || [];
    const updatedSettings: AppSettings = {
      ...currentSettings,
      holidays: [...currentHolidays, holiday],
    };
    set({ settings: updatedSettings, storageError: null });
    try {
      await saveToStorage('app_settings', updatedSettings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
      set({ settings: currentSettings, storageError: 'Failed to save holiday to device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(useSubjects.getState().subjects, updatedSettings, useAttendance.getState().records);
    } catch (err) {
      console.warn('Failed to sync reminders on holiday add:', err);
    }
  },
  addMultipleHolidays: async (holidaysToAdd) => {
    if (holidaysToAdd.length === 0) return;
    const currentSettings = get().settings;
    const currentHolidays = currentSettings.holidays || [];
    const updatedSettings: AppSettings = {
      ...currentSettings,
      holidays: [...currentHolidays, ...holidaysToAdd],
    };
    set({ settings: updatedSettings, storageError: null });
    try {
      await saveToStorage('app_settings', updatedSettings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
      set({ settings: currentSettings, storageError: 'Failed to save holidays to device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(useSubjects.getState().subjects, updatedSettings, useAttendance.getState().records);
    } catch (err) {
      console.warn('Failed to sync reminders on bulk holiday add:', err);
    }
  },
  updateHoliday: async (holiday) => {
    const currentSettings = get().settings;
    const currentHolidays = currentSettings.holidays || [];
    const updatedSettings: AppSettings = {
      ...currentSettings,
      holidays: currentHolidays.map((h) => (h.id === holiday.id ? holiday : h)),
    };
    set({ settings: updatedSettings, storageError: null });
    try {
      await saveToStorage('app_settings', updatedSettings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
      set({ settings: currentSettings, storageError: 'Failed to update holiday in device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(useSubjects.getState().subjects, updatedSettings, useAttendance.getState().records);
    } catch (err) {
      console.warn('Failed to sync reminders on holiday update:', err);
    }
  },
  deleteHoliday: async (id) => {
    const currentSettings = get().settings;
    const currentHolidays = currentSettings.holidays || [];
    const updatedSettings: AppSettings = {
      ...currentSettings,
      holidays: currentHolidays.filter((h) => h.id !== id),
    };
    set({ settings: updatedSettings, storageError: null });
    try {
      await saveToStorage('app_settings', updatedSettings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
      set({ settings: currentSettings, storageError: 'Failed to delete holiday from device storage.' });
      return;
    }

    try {
      await syncNotificationsAndWidgets(useSubjects.getState().subjects, updatedSettings, useAttendance.getState().records);
    } catch (err) {
      console.warn('Failed to sync reminders on holiday delete:', err);
    }
  },
  loadSettings: async () => {
    const stored = await getFromStorage<AppSettings>('app_settings');
    if (stored) {
      let merged: AppSettings = { ...defaultSettings, ...stored, holidays: stored.holidays || [] };
      if (merged.appLockPin && !isHashedPin(merged.appLockPin)) {
        const hashed = await hashPin(merged.appLockPin);
        merged = { ...merged, appLockPin: hashed };
        try {
          await saveToStorage('app_settings', merged);
        } catch (err) {
          console.warn('Failed to migrate legacy PIN hash:', err);
        }
      }
      set({ settings: merged });
      applyTheme(merged.theme, merged.themeAccent);
    } else {
      applyTheme(defaultSettings.theme, defaultSettings.themeAccent);
    }
  },
  loadArchivedSemesters: async () => {
    const stored = await getFromStorage<ArchivedSemester[]>('archived_semesters');
    if (stored) set({ archivedSemesters: stored });
  },
  archiveSemester: async (semester) => {
    const current = get().archivedSemesters;
    const updated = [...current, semester];
    set({ archivedSemesters: updated, storageError: null });
    try {
      await saveToStorage('archived_semesters', updated);
    } catch (err) {
      console.error('Failed to persist archived_semesters:', err);
      set({ archivedSemesters: current, storageError: 'Failed to archive semester to device storage.' });
      throw err;
    }
  },
  deleteArchivedSemester: async (id) => {
    const current = get().archivedSemesters;
    const updated = current.filter(s => s.id !== id);
    set({ archivedSemesters: updated, storageError: null });
    try {
      await saveToStorage('archived_semesters', updated);
    } catch (err) {
      console.error('Failed to persist archived_semesters:', err);
      set({ archivedSemesters: current, storageError: 'Failed to delete archived semester.' });
    }
  },
}));

let systemThemeMediaListener: ((e: MediaQueryListEvent) => void) | null = null;

const DARK_THEMES = new Set<string>(['dark', 'oled', 'dracula', 'cyberpunk', 'nord', 'forest']);

function applyTheme(theme: AppSettings['theme'] | string, accent: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' = 'blue') {
  const root = window.document.documentElement;
  
  // Clean up previous system theme listener if any
  if (systemThemeMediaListener) {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', systemThemeMediaListener);
    systemThemeMediaListener = null;
  }

  if (theme === 'system') {
    const listener = (e: MediaQueryListEvent) => {
      const rootEl = window.document.documentElement;
      if (e.matches) {
        rootEl.classList.add('dark');
      } else {
        rootEl.classList.remove('dark');
      }
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);
    systemThemeMediaListener = listener;
  }

  const isDark = DARK_THEMES.has(theme) || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.classList.remove('accent-blue', 'accent-purple', 'accent-emerald', 'accent-amber', 'accent-rose');
  root.classList.add(`accent-${accent || 'blue'}`);
}


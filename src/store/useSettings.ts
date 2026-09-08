import { create } from 'zustand';
import type { AppSettings, ArchivedSemester, Holiday } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';
import { syncNotificationsAndWidgets } from './syncHelpers';
import { useSubjects } from './useSubjects';
import { useAttendance } from './useAttendance';

interface SettingsState {
  settings: AppSettings;
  archivedSemesters: ArchivedSemester[];
  setSettings: (settings: AppSettings) => void;
  addHoliday: (holiday: Holiday) => void;
  updateHoliday: (holiday: Holiday) => void;
  deleteHoliday: (id: string) => void;
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
  holidays: [],
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  archivedSemesters: [],
  setSettings: async (settings) => {
    set({ settings });
    try {
      await saveToStorage('app_settings', settings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
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
    set({ settings: updatedSettings });
    try {
      await saveToStorage('app_settings', updatedSettings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
    }

    try {
      await syncNotificationsAndWidgets(useSubjects.getState().subjects, updatedSettings, useAttendance.getState().records);
    } catch (err) {
      console.warn('Failed to sync reminders on holiday add:', err);
    }
  },
  updateHoliday: async (holiday) => {
    const currentSettings = get().settings;
    const currentHolidays = currentSettings.holidays || [];
    const updatedSettings: AppSettings = {
      ...currentSettings,
      holidays: currentHolidays.map((h) => (h.id === holiday.id ? holiday : h)),
    };
    set({ settings: updatedSettings });
    try {
      await saveToStorage('app_settings', updatedSettings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
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
    set({ settings: updatedSettings });
    try {
      await saveToStorage('app_settings', updatedSettings);
    } catch (err) {
      console.error('Failed to persist app_settings:', err);
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
      const merged = { ...defaultSettings, ...stored, holidays: stored.holidays || [] };
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
    set({ archivedSemesters: updated });
    try {
      await saveToStorage('archived_semesters', updated);
    } catch (err) {
      console.error('Failed to persist archived_semesters:', err);
    }
  },
  deleteArchivedSemester: async (id) => {
    const current = get().archivedSemesters;
    const updated = current.filter(s => s.id !== id);
    set({ archivedSemesters: updated });
    try {
      await saveToStorage('archived_semesters', updated);
    } catch (err) {
      console.error('Failed to persist archived_semesters:', err);
    }
  },
}));

let systemThemeMediaListener: ((e: MediaQueryListEvent) => void) | null = null;

function applyTheme(theme: 'light' | 'dark' | 'oled' | 'system', accent: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' = 'blue') {
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
      rootEl.classList.remove('oled');
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);
    systemThemeMediaListener = listener;
  }

  const isDark = theme === 'dark' || theme === 'oled' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isOled = theme === 'oled';
  
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (isOled) {
    root.classList.add('oled');
  } else {
    root.classList.remove('oled');
  }

  root.classList.remove('accent-blue', 'accent-purple', 'accent-emerald', 'accent-amber', 'accent-rose');
  root.classList.add(`accent-${accent || 'blue'}`);
}


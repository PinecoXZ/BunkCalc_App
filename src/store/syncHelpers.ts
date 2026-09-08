import type { Subject } from '../lib/types';
import type { AppSettings } from '../lib/types';
import type { AttendanceRecord } from '../lib/types';
import { scheduleDailyClassReminders } from '../lib/notifications';
import { syncWidgetData } from '../lib/widgetData';

/**
 * Shared helper to re-sync notifications and widget data after any
 * subject or settings change.
 */
export async function syncNotificationsAndWidgets(
  subjects: Subject[],
  settings: AppSettings,
  records: AttendanceRecord[]
): Promise<void> {
  try {
    await scheduleDailyClassReminders(subjects, settings, records);
    await syncWidgetData(subjects, records, settings);
  } catch (err) {
    console.warn('Failed to sync notifications/widgets:', err);
  }
}


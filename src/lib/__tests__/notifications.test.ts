import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AppSettings, AttendanceRecord, Subject } from '../types';

const lnMocks = vi.hoisted(() => ({
  getPending: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
  registerActionTypes: vi.fn(),
  ensureNotificationPermission: vi.fn(),
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    getPending: lnMocks.getPending,
    cancel: lnMocks.cancel,
    schedule: lnMocks.schedule,
    registerActionTypes: lnMocks.registerActionTypes,
  },
}));

vi.mock('../permissions', () => ({
  ensureNotificationPermission: lnMocks.ensureNotificationPermission,
}));

import {
  cancelAllNotifications,
  scheduleDailyClassReminders,
  scheduleDailyScheduleDigest,
} from '../notifications';

const baseSettings: AppSettings = {
  globalThreshold: 0.75,
  warningBuffer: 0.05,
  semesterEndDate: '2026-12-31',
  holidays: [],
  notificationsEnabled: true,
  reminderMinutesBefore: 15,
  preClassReminder: true,
  postClassReminder: true,
  dailyScheduleDigest: true,
  dailyDigestTime: '00:00',
  sundaySummaryNotification: true,
  theme: 'light',
  holidayMode: false,
  hapticsEnabled: true,
  toneMode: 'standard',
};

const multiSlotSubject: Subject = {
  id: 'sub-multi',
  name: 'Data Structures',
  credits: 4,
  threshold: 0.75,
  isLab: false,
  schedule: [
    { day: 1, slot: '09:00' },
    { day: 1, slot: '14:00' },
  ],
};

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Monday 2026-10-05 06:00 local time
    vi.setSystemTime(new Date(2026, 9, 5, 6, 0, 0));
    lnMocks.getPending.mockResolvedValue({ notifications: [] });
    lnMocks.cancel.mockResolvedValue(undefined);
    lnMocks.schedule.mockResolvedValue(undefined);
    lnMocks.ensureNotificationPermission.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('respects midnight 00:00 dailyDigestTime without falling back to 07:30', async () => {
    const tuesdaySubject: Subject = {
      ...multiSlotSubject,
      schedule: [{ day: 2, slot: '09:00' }],
    };

    await scheduleDailyScheduleDigest([tuesdaySubject], baseSettings, []);

    expect(lnMocks.schedule).toHaveBeenCalledTimes(1);
    const scheduled = lnMocks.schedule.mock.calls[0][0].notifications;
    expect(scheduled.length).toBeGreaterThan(0);
    const firstAt: Date = scheduled[0].schedule.at;
    expect(firstAt.getHours()).toBe(0);
    expect(firstAt.getMinutes()).toBe(0);
  });

  it('schedules remaining unmarked slots on a multi-slot day', async () => {
    const records: AttendanceRecord[] = [
      { id: 'r1', subjectId: 'sub-multi', date: '2026-10-05', slot: '09:00', status: 'present' },
    ];

    await scheduleDailyClassReminders([multiSlotSubject], baseSettings, records);

    const allScheduled = lnMocks.schedule.mock.calls.flatMap((call) => call[0].notifications);
    const todaySlots = allScheduled
      .filter((n) => n.extra?.subjectId === 'sub-multi')
      .map((n) => n.extra?.slot);

    // 2026-10-05 (Monday) has 09:00 marked, so only 14:00 should be scheduled today; next Monday falls outside 7-day window (offset 0..6)
    expect(todaySlots).toEqual(['14:00', '14:00']);
  });

  it('cancels all pending notifications when cancelAllNotifications is called', async () => {
    lnMocks.getPending.mockResolvedValueOnce({
      notifications: [{ id: 1001 }, { id: 2002 }, { id: 6000001 }],
    });

    await cancelAllNotifications();

    expect(lnMocks.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1001 }, { id: 2002 }, { id: 6000001 }],
    });
  });

  it('does not schedule class reminders or digests after semesterEndDate has passed', async () => {
    const expiredSettings: AppSettings = {
      ...baseSettings,
      semesterEndDate: '2026-10-04', // before current mock date 2026-10-05
    };

    await scheduleDailyClassReminders([multiSlotSubject], expiredSettings, []);

    expect(lnMocks.schedule).not.toHaveBeenCalled();
  });
});

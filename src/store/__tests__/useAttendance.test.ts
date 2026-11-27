import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveToStorage: vi.fn(),
  getFromStorage: vi.fn(),
  handleAttendanceAlerts: vi.fn(),
  syncNotificationsAndWidgets: vi.fn(),
  subjects: [
    {
      id: 'sub-1',
      name: 'Algorithms',
      credits: 4,
      threshold: 0.75,
      isLab: false,
      schedule: [
        { day: 1, slot: '09:00' },
        { day: 1, slot: '14:00' },
      ],
    },
  ],
  settings: {
    globalThreshold: 0.75,
    warningBuffer: 0.05,
    semesterEndDate: '2026-12-31',
    holidays: [],
    notificationsEnabled: true,
    reminderMinutesBefore: 15,
    theme: 'light' as const,
    holidayMode: false,
    toneMode: 'professional' as const,
  },
}));

vi.mock('../../lib/storage', () => ({
  saveToStorage: mocks.saveToStorage,
  getFromStorage: mocks.getFromStorage,
}));

vi.mock('../../lib/notifications', () => ({
  handleAttendanceAlerts: mocks.handleAttendanceAlerts,
}));

vi.mock('../syncHelpers', () => ({
  syncNotificationsAndWidgets: mocks.syncNotificationsAndWidgets,
}));

vi.mock('../useSubjects', () => ({
  useSubjects: {
    getState: () => ({ subjects: mocks.subjects }),
  },
}));

vi.mock('../useSettings', () => ({
  useSettings: {
    getState: () => ({ settings: mocks.settings }),
  },
}));

import { useAttendance } from '../useAttendance';

describe('useAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveToStorage.mockResolvedValue(undefined);
    mocks.handleAttendanceAlerts.mockResolvedValue(undefined);
    mocks.syncNotificationsAndWidgets.mockResolvedValue(undefined);
    useAttendance.setState({
      records: [],
      lastAction: null,
      storageError: null,
    });
  });

  it('tracks multiple slots independently on the same subject and date', async () => {
    await useAttendance.getState().markAttendance({
      id: 'r-morning',
      subjectId: 'sub-1',
      date: '2026-10-05',
      slot: '09:00',
      status: 'present',
    });
    await useAttendance.getState().markAttendance({
      id: 'r-afternoon',
      subjectId: 'sub-1',
      date: '2026-10-05',
      slot: '14:00',
      status: 'absent',
    });

    expect(useAttendance.getState().records).toHaveLength(2);

    // Updating the 09:00 slot replaces only the 09:00 record
    await useAttendance.getState().markAttendance({
      id: 'r-morning-edit',
      subjectId: 'sub-1',
      date: '2026-10-05',
      slot: '09:00',
      status: 'absent',
    });

    const records = useAttendance.getState().records;
    expect(records).toHaveLength(2);
    expect(records.find((r) => r.slot === '09:00')?.status).toBe('absent');
    expect(records.find((r) => r.slot === '14:00')?.status).toBe('absent');
  });

  it('rolls back state and sets storageError when saveToStorage fails', async () => {
    const initialRecord = {
      id: 'r-init',
      subjectId: 'sub-1',
      date: '2026-10-05',
      slot: '09:00',
      status: 'present' as const,
    };
    useAttendance.setState({ records: [initialRecord], lastAction: null, storageError: null });
    mocks.saveToStorage.mockRejectedValueOnce(new Error('Disk full'));

    await useAttendance.getState().markAttendance({
      id: 'r-fail',
      subjectId: 'sub-1',
      date: '2026-10-06',
      slot: '09:00',
      status: 'absent',
    });

    expect(useAttendance.getState().records).toEqual([initialRecord]);
    expect(useAttendance.getState().storageError).toContain('Failed to save');
    expect(mocks.handleAttendanceAlerts).not.toHaveBeenCalled();

    useAttendance.getState().clearStorageError();
    expect(useAttendance.getState().storageError).toBeNull();
  });

  it('deduplicates alert evaluation per subject in markMultipleAttendance', async () => {
    await useAttendance.getState().markMultipleAttendance([
      { id: 'r1', subjectId: 'sub-1', date: '2026-10-05', slot: '09:00', status: 'present' },
      { id: 'r2', subjectId: 'sub-1', date: '2026-10-05', slot: '14:00', status: 'absent' },
    ]);

    expect(mocks.handleAttendanceAlerts).toHaveBeenCalledTimes(1);
    expect(mocks.syncNotificationsAndWidgets).toHaveBeenCalledTimes(1);
  });
});

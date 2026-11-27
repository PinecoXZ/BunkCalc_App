import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { countRemainingSessions, countCancelledSessions, isSemesterEnded, toISODateStr } from '../dateUtils';
import type { AttendanceRecord, Holiday, ScheduleSlot } from '../types';

describe('dateUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Monday, 2026-10-05 10:00 local time
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats local dates as YYYY-MM-DD', () => {
    expect(toISODateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toISODateStr(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('counts remaining scheduled sessions inclusively up to semesterEndDate', () => {
    const schedule: ScheduleSlot[] = [
      { day: 1, slot: '09:00' }, // Mon
      { day: 3, slot: '09:00' }, // Wed
      { day: 5, slot: '09:00' }, // Fri
    ];
    // Oct 5 (Mon) -> Oct 9 (Fri): Mon, Wed, Fri = 3 sessions
    expect(countRemainingSessions(schedule, '2026-10-09')).toBe(3);
  });

  it('skips today when today is already marked for the subject', () => {
    const schedule: ScheduleSlot[] = [
      { day: 1, slot: '09:00' },
      { day: 3, slot: '09:00' },
    ];
    const records: AttendanceRecord[] = [
      { id: 'r1', subjectId: 'sub-1', date: '2026-10-05', status: 'present' },
    ];
    // Oct 5 marked -> only Oct 7 (Wed) remains
    expect(countRemainingSessions(schedule, '2026-10-09', records, 'sub-1')).toBe(1);
  });

  it('counts unmarked slots individually on multi-slot days today', () => {
    const schedule: ScheduleSlot[] = [
      { day: 1, slot: '09:00' },
      { day: 1, slot: '14:00' },
      { day: 3, slot: '09:00' },
    ];
    const records: AttendanceRecord[] = [
      { id: 'r1', subjectId: 'sub-1', date: '2026-10-05', slot: '09:00', status: 'present' },
    ];
    // Oct 5 09:00 is marked, Oct 5 14:00 + Oct 7 09:00 = 2 sessions remain
    expect(countRemainingSessions(schedule, '2026-10-09', records, 'sub-1')).toBe(2);
  });

  it('excludes dates falling inside holidays and applies 2x lab multiplier', () => {
    const schedule: ScheduleSlot[] = [
      { day: 1, slot: '09:00' }, // Oct 5
      { day: 3, slot: '09:00' }, // Oct 7 (holiday)
      { day: 5, slot: '09:00' }, // Oct 9
    ];
    const holidays: Holiday[] = [
      { id: 'h1', name: 'Mid-Week Break', startDate: '2026-10-07', endDate: '2026-10-07' },
    ];
    // Mon + Fri = 2 classes * 2 lab multiplier = 4 sessions
    expect(countRemainingSessions(schedule, '2026-10-09', [], 'sub-1', holidays, true)).toBe(4);
  });

  it('returns 0 when semesterEndDate is in the past or schedule is empty', () => {
    expect(countRemainingSessions([{ day: 1, slot: '09:00' }], '2026-10-01')).toBe(0);
    expect(countRemainingSessions([], '2026-10-15')).toBe(0);
    expect(countRemainingSessions([{ day: 1, slot: '09:00' }], '')).toBe(0);
  });

  it('counts cancelled sessions only for the target subject', () => {
    const records: AttendanceRecord[] = [
      { id: '1', subjectId: 'sub-1', date: '2026-10-01', status: 'cancelled' },
      { id: '2', subjectId: 'sub-1', date: '2026-10-02', status: 'present' },
      { id: '3', subjectId: 'sub-1', date: '2026-10-03', status: 'cancelled' },
      { id: '4', subjectId: 'sub-2', date: '2026-10-04', status: 'cancelled' },
    ];
    expect(countCancelledSessions(records, 'sub-1')).toBe(2);
    expect(countCancelledSessions(records, 'sub-2')).toBe(1);
  });

  it('detects semester completion only after semesterEndDate has passed', () => {
    expect(isSemesterEnded('2026-10-04', '2026-10-05')).toBe(true);
    expect(isSemesterEnded('2026-10-05', '2026-10-05')).toBe(false);
    expect(isSemesterEnded('2026-10-05T12:00:00Z', '2026-10-06')).toBe(true);
    expect(isSemesterEnded('', '2026-10-05')).toBe(false);
  });
});

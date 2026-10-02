import { describe, it, expect } from 'vitest';
import { 
  calculateSubjectStats, 
  calculateWeekdayStats,
  calculateOverallStats,
  calculateBunkBudget,
  calculateClassesNeededToRecover,
  calculateAttendanceStreak
} from '../calculations';
import type { Subject, AttendanceRecord } from '../types';

describe('BunkCalc Calculation Engine (TRD §3)', () => {
  const createSubject = (overrides?: Partial<Subject>): Subject => ({
    id: 'sub-1',
    name: 'Operating Systems',
    credits: 4,
    threshold: 0.75,
    schedule: [
      { day: 1, slot: '09:00' }, // Monday
      { day: 3, slot: '09:00' }, // Wednesday
      { day: 5, slot: '09:00' }, // Friday
    ],
    isLab: false,
    attendedSoFar: 0,
    missedSoFar: 0,
    ...overrides,
  });

  describe('Fresh Semester Setup', () => {
    it('calculates 100% attendance and correct budget for a fresh semester', () => {
      const subject = createSubject();
      const stats = calculateSubjectStats(subject, []);
      
      expect(stats.attendedCount).toBe(0);
      expect(stats.absentCount).toBe(0);
      expect(stats.totalClasses).toBe(0);
      expect(stats.attendancePct).toBe(100);
      expect(stats.classesNeededToRecover).toBe(0);
    });

    it('calculates safe bunks for 100 total sessions at 75% threshold', () => {
      const subject = createSubject({
        threshold: 0.75,
        attendedSoFar: 0,
        missedSoFar: 0,
      });

      const stats = calculateSubjectStats(subject, [], '2026-12-31');
      expect(stats.requiredSessions).toBe(Math.ceil(stats.totalSessions * 0.75));
      expect(stats.bunkBudget).toBe(stats.totalSessions - stats.requiredSessions - stats.absentCount);
    });
  });

  describe('Cancelled Class Behavior (PRD Section 2)', () => {
    it('shrinks total session pool and does not count as free bunk', () => {
      // PRD example: 100 total sessions -> 75 required -> 25 bunk budget.
      // After 1 cancellation: 99 total -> 75 required (ceil) -> 24 budget.
      const totalSessionsBefore = 100;
      const requiredBefore = Math.ceil(totalSessionsBefore * 0.75); // 75
      const budgetBefore = totalSessionsBefore - requiredBefore; // 25
      expect(budgetBefore).toBe(25);

      const totalSessionsAfter = 99; // 1 cancelled class removed from total pool
      const requiredAfter = Math.ceil(totalSessionsAfter * 0.75); // 75
      const budgetAfter = totalSessionsAfter - requiredAfter; // 24
      expect(budgetAfter).toBe(24);
      expect(budgetAfter).toBeLessThan(budgetBefore);
    });
  });

  describe('Floating-Point Precision in Recovery Mode', () => {
    it('calculates exactly 1 class to recover for 80% threshold (IEEE-754 precision guard)', () => {
      // With threshold = 0.8, attended = 3, missed = 1:
      // Current attendance = 3 / 4 = 75%.
      // Attending 1 more class -> 4 / 5 = 80% -> exactly reaches target!
      // Previously, float drift (1.000000000000001) caused Math.ceil to output 2.
      const subject = createSubject({
        threshold: 0.8,
        attendedSoFar: 3,
        missedSoFar: 1,
      });

      const stats = calculateSubjectStats(subject, []);
      expect(stats.attendancePct).toBe(75);
      expect(stats.classesNeededToRecover).toBe(1);
    });

    it('calculates correct recovery classes when far below threshold', () => {
      // Threshold 0.75. Attended 6, Missed 4 (Total 10 -> 60%).
      // (6 + X) / (10 + X) >= 0.75 -> 6 + X >= 7.5 + 0.75X -> 0.25X >= 1.5 -> X >= 6.
      const subject = createSubject({
        threshold: 0.75,
        attendedSoFar: 6,
        missedSoFar: 4,
      });

      const stats = calculateSubjectStats(subject, []);
      expect(stats.classesNeededToRecover).toBe(6);
      
      const newPct = ((6 + 6) / (10 + 6)) * 100;
      expect(newPct).toBe(75);
    });
  });

  describe('Mid-Semester Setup', () => {
    it('correctly incorporates past attended and missed sessions', () => {
      const subject = createSubject({
        attendedSoFar: 15,
        missedSoFar: 5,
        threshold: 0.75,
      });

      const records: AttendanceRecord[] = [
        { id: '1', subjectId: 'sub-1', date: '2026-08-01', status: 'present' },
        { id: '2', subjectId: 'sub-1', date: '2026-08-02', status: 'absent' },
      ];

      const stats = calculateSubjectStats(subject, records);
      expect(stats.attendedCount).toBe(16); // 15 + 1
      expect(stats.absentCount).toBe(6);     // 5 + 1
      expect(stats.totalClasses).toBe(22);   // 16 + 6
      expect(stats.attendancePct).toBeCloseTo((16 / 22) * 100, 2);
    });
  });

  describe('Lab Multiplier (2x session counts)', () => {
    it('multiplies daily recorded attendance by 2 and maintains session history', () => {
      const labSubject = createSubject({
        isLab: true,
        attendedSoFar: 4, // 2 lab classes past attended = 4 sessions
        missedSoFar: 2,   // 1 lab class past missed = 2 sessions
      });

      const records: AttendanceRecord[] = [
        { id: '1', subjectId: 'sub-1', date: '2026-08-01', status: 'present' },   // 1 lab class -> 2 sessions
        { id: '2', subjectId: 'sub-1', date: '2026-08-02', status: 'absent' },    // 1 lab class -> 2 sessions
        { id: '3', subjectId: 'sub-1', date: '2026-08-03', status: 'cancelled' }, // 1 lab class -> 2 sessions cancelled
      ];

      const stats = calculateSubjectStats(labSubject, records);
      expect(stats.attendedCount).toBe(6); // 4 + (1 * 2) = 6
      expect(stats.absentCount).toBe(4);   // 2 + (1 * 2) = 4
      expect(stats.totalClasses).toBe(10);
      expect(stats.cancelledCount).toBe(2);
      expect(stats.attendancePct).toBe(60); // 6 / 10 = 60%
    });

    it('calculates safe lab bunk budget in actual lab class units (floor of sessionBudget / 2)', () => {
      // 20 total sessions (10 lab classes) at 75% threshold -> required 15 sessions -> session budget = 5.
      // Since each lab bunk uses 2 sessions, student can safely skip floor(5 / 2) = 2 lab classes.
      // Bunking 2 labs = 4 sessions missed -> 16/20 = 80% >= 75%.
      // Bunking 3 labs = 6 sessions missed -> 14/20 = 70% < 75% (detention).
      const labSubject = createSubject({
        isLab: true,
        threshold: 0.75,
        attendedSoFar: 0,
        missedSoFar: 0,
      });

      // Passing semesterEndDate that produces remaining sessions
      const stats = calculateSubjectStats(labSubject, [], '2026-12-31');
      const expectedSessionBudget = stats.totalSessions - stats.requiredSessions - stats.absentCount;
      const expectedLabBunks = Math.floor(expectedSessionBudget / 2);

      expect(stats.bunkBudget).toBe(expectedLabBunks);
      expect(stats.safeBunks).toBe(expectedLabBunks);
    });

    it('calculates accurate lab recovery taking 2x session credit per lab attended', () => {
      // Threshold 75%.
      // Attended: 6 sessions (3 labs), Missed: 6 sessions (3 labs). Total = 12 sessions (50%).
      // Formula: (6 + 2k) / (12 + 2k) >= 0.75
      // 6 + 2k >= 9 + 1.5k => 0.5k >= 3 => k >= 6 lab classes.
      const labSubject = createSubject({
        isLab: true,
        threshold: 0.75,
        attendedSoFar: 6,
        missedSoFar: 6,
      });

      const stats = calculateSubjectStats(labSubject, []);
      expect(stats.attendancePct).toBe(50);
      expect(stats.classesNeededToRecover).toBe(6);

      // Verify that attending 6 labs recovers attendance to exactly 75%
      const recoveredAttended = 6 + 6 * 2; // 18 sessions
      const recoveredTotal = 12 + 6 * 2;   // 24 sessions
      expect((recoveredAttended / recoveredTotal) * 100).toBe(75);

      // Verify that attending 5 labs would fail (16 / 22 = 72.7%)
      const insufficientAttended = 6 + 5 * 2;
      const insufficientTotal = 12 + 5 * 2;
      expect((insufficientAttended / insufficientTotal) * 100).toBeLessThan(75);
    });

    it('calculates exact recovery for 80% threshold lab subject (4 attended, 2 missed -> requires 2 labs)', () => {
      // Threshold 80%.
      // Attended: 4 sessions (2 labs), Missed: 2 sessions (1 lab). Total = 6 sessions (66.67%).
      // Formula: (4 + 2k) / (6 + 2k) >= 0.8
      // 4 + 2k >= 4.8 + 1.6k => 0.4k >= 0.8 => k >= 2 lab classes.
      const labSubject = createSubject({
        isLab: true,
        threshold: 0.8,
        attendedSoFar: 4,
        missedSoFar: 2,
      });

      const stats = calculateSubjectStats(labSubject, []);
      expect(stats.attendancePct).toBeCloseTo(66.67, 1);
      expect(stats.classesNeededToRecover).toBe(2);

      // Verify that attending 2 labs gives 8/10 = 80%
      expect(((4 + 2 * 2) / (6 + 2 * 2)) * 100).toBe(80);
      // Verify that attending 1 lab gives 6/8 = 75% < 80%
      expect(((4 + 1 * 2) / (6 + 1 * 2)) * 100).toBe(75);
    });
  });

  describe('Weekday Stats', () => {
    it('aggregates attended, missed, and cancelled counts by day of week', () => {
      const records: AttendanceRecord[] = [
        { id: '1', subjectId: 'sub-1', date: '2026-09-14', status: 'present' },
        { id: '2', subjectId: 'sub-2', date: '2026-09-14', status: 'absent' },
        { id: '3', subjectId: 'sub-3', date: '2026-09-14', status: 'cancelled' },
      ];

      const weekdayStats = calculateWeekdayStats(records);
      const monday = weekdayStats.find(d => d.shortName === 'Mon');
      
      expect(monday).toBeDefined();
      expect(monday?.attended).toBe(1);
      expect(monday?.missed).toBe(1);
      expect(monday?.cancelled).toBe(1);
      expect(monday?.total).toBe(2);
      expect(monday?.percentage).toBe(50);
    });
  });

  describe('Consolidated Overall Stats & Formula Helpers', () => {
    it('accurately calculates overall stats across multiple subjects', () => {
      const sub1 = createSubject({ id: 'sub-1', attendedSoFar: 10, missedSoFar: 2 });
      const sub2 = createSubject({ id: 'sub-2', attendedSoFar: 8, missedSoFar: 0 });
      // Total attended = 18, Total classes = 20 -> 90%
      const overall = calculateOverallStats([sub1, sub2], [], '', [], 0.75);

      expect(overall.totalAttended).toBe(18);
      expect(overall.totalClasses).toBe(20);
      expect(overall.percentage).toBe(90);
      expect(overall.isSafe).toBe(true);
      expect(overall.status).toBe('safe');
    });

    it('identifies warning status when overall percentage is between 75% and 84%', () => {
      const sub1 = createSubject({ id: 'sub-1', attendedSoFar: 8, missedSoFar: 2 }); // 80%
      const overall = calculateOverallStats([sub1], [], '', [], 0.75);

      expect(overall.percentage).toBe(80);
      expect(overall.isSafe).toBe(true);
      expect(overall.status).toBe('warning');
    });

    it('identifies critical status when overall percentage is below 75%', () => {
      const sub1 = createSubject({ id: 'sub-1', attendedSoFar: 5, missedSoFar: 5 }); // 50%
      const overall = calculateOverallStats([sub1], [], '', [], 0.75);

      expect(overall.percentage).toBe(50);
      expect(overall.isSafe).toBe(false);
      expect(overall.status).toBe('critical');
    });

    it('correctly computes bunk budget via helper', () => {
      // 100 sessions, 0 missed, 75% threshold -> 75 required -> 25 safe bunks
      expect(calculateBunkBudget(100, 0, 0.75, 1)).toBe(25);
      // For lab multiplier 2: 25 / 2 = 12 lab bunks
      expect(calculateBunkBudget(100, 0, 0.75, 2)).toBe(12);
    });

    it('correctly computes classes needed to recover via helper', () => {
      // 3 attended, 1 missed, 80% threshold (75% current) -> 1 class needed to reach 80%
      expect(calculateClassesNeededToRecover(3, 1, 0.8, 1)).toBe(1);
      // Lab multiplier 2: 4 attended, 2 missed, 80% threshold -> 2 labs needed
      expect(calculateClassesNeededToRecover(4, 2, 0.8, 2)).toBe(2);
    });
  });

  describe('Attendance Streak Calculation (calculateAttendanceStreak)', () => {
    const formatDate = (daysAgo: number): { dateStr: string; dayOfWeek: number } => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      const dayOfWeek = d.getDay();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { dateStr, dayOfWeek };
    };

    it('returns 0 for empty subjects or empty records', () => {
      expect(calculateAttendanceStreak([], [])).toBe(0);
      expect(calculateAttendanceStreak([], [createSubject()])).toBe(0);
    });

    it('calculates streak for consecutive attended days', () => {
      const subject = createSubject({
        schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, slot: '10:00' })),
      });

      const day0 = formatDate(0);
      const day1 = formatDate(1);
      const day2 = formatDate(2);

      const records: AttendanceRecord[] = [
        { id: '1', subjectId: subject.id, date: day0.dateStr, status: 'present' },
        { id: '2', subjectId: subject.id, date: day1.dateStr, status: 'present' },
        { id: '3', subjectId: subject.id, date: day2.dateStr, status: 'present' },
      ];

      expect(calculateAttendanceStreak(records, [subject])).toBe(3);
    });

    it('breaks streak when an absent status is encountered', () => {
      const subject = createSubject({
        schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, slot: '10:00' })),
      });

      const day0 = formatDate(0);
      const day1 = formatDate(1);
      const day2 = formatDate(2);

      const records: AttendanceRecord[] = [
        { id: '1', subjectId: subject.id, date: day0.dateStr, status: 'present' },
        { id: '2', subjectId: subject.id, date: day1.dateStr, status: 'absent' },
        { id: '3', subjectId: subject.id, date: day2.dateStr, status: 'present' },
      ];

      expect(calculateAttendanceStreak(records, [subject])).toBe(1);
    });

    it('skips registered holidays without breaking streak', () => {
      const subject = createSubject({
        schedule: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, slot: '10:00' })),
      });

      const day0 = formatDate(0);
      const day1 = formatDate(1);
      const day2 = formatDate(2);

      const holidays = [
        { id: 'h1', name: 'Festive Holiday', startDate: day1.dateStr, endDate: day1.dateStr },
      ];

      const records: AttendanceRecord[] = [
        { id: '1', subjectId: subject.id, date: day0.dateStr, status: 'present' },
        { id: '3', subjectId: subject.id, date: day2.dateStr, status: 'present' },
      ];

      expect(calculateAttendanceStreak(records, [subject], holidays)).toBe(2);
    });
  });
});

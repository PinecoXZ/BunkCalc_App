import type { AttendanceRecord, Subject, Holiday } from './types';
import { countRemainingSessions, countCancelledSessions } from './dateUtils';

export interface SubjectStats {
  attendedCount: number;         // totalAttended (past + recorded)
  absentCount: number;           // totalMissed (past + recorded)
  totalClasses: number;          // total logged classes (attendedCount + absentCount)
  totalSessions: number;         // total semester sessions pool
  remainingClasses: number;      // sessions remaining from today to end
  cancelledCount: number;        // cancelled sessions count
  attendancePct: number;         // current attendance percentage
  bunkBudget: number;            // safe bunks left (can be negative)
  safeBunks: number;             // Math.max(0, bunkBudget) for backward compatibility
  requiredSessions: number;      // required sessions to meet threshold
  classesNeededToRecover: number;// consecutive classes needed to attend if bunkBudget < 0
  maxPossiblePct: number;        // % if student attends 100% of remaining classes
  maxAttended: number;
  potentialTotal: number;
}

export const calculateSubjectStats = (
  subject: Subject,
  records: AttendanceRecord[],
  semesterEndDate?: string,
  holidays?: Holiday[],
  globalThreshold?: number
): SubjectStats => {
  const subjectRecords = records.filter((r) => r.subjectId === subject.id);
  const multiplier = subject.isLab ? 2 : 1;
  const threshold = subject.threshold ?? globalThreshold ?? 0.75;

  // Past history is stored in session units per TRD §2 & §3
  const attendedSoFar = subject.attendedSoFar || 0;
  const missedSoFar = subject.missedSoFar || 0;

  const recordedAttended = subjectRecords.filter((r) => r.status === 'present').length * multiplier;
  const recordedMissed = subjectRecords.filter((r) => r.status === 'absent').length * multiplier;
  const cancelledCount = countCancelledSessions(records, subject.id) * multiplier;

  const totalAttended = attendedSoFar + recordedAttended;
  const totalMissed = missedSoFar + recordedMissed;
  const totalClasses = totalAttended + totalMissed;

  // Remaining sessions count from dateUtils if semesterEndDate provided, else 0
  const remainingClasses = semesterEndDate
    ? countRemainingSessions(subject.schedule, semesterEndDate, records, subject.id, holidays || [], !!subject.isLab)
    : 0;

  // Total sessions in semester pool = past attended/missed + recorded attended/missed + remaining future sessions
  // (Past cancelled classes are already excluded from both totalClasses and remainingClasses)
  const totalSessions = Math.max(
    totalClasses,
    totalClasses + remainingClasses
  );

  const requiredSessions = Math.ceil(totalSessions * threshold);

  // Bunk budget in actual class bunks:
  // For a theory class, 1 bunk = 1 session.
  // For a lab class, 1 bunk = multiplier sessions (2 sessions).
  // Math.floor(sessionBudget / multiplier) gives the exact number of classes a student can safely skip.
  let bunkBudget = calculateBunkBudget(totalSessions, totalMissed, threshold, multiplier);

  if (!semesterEndDate && remainingClasses === 0 && bunkBudget > 0) {
    bunkBudget = 0;
  }

  // Current attendance %
  const attendancePct = totalClasses === 0 ? 100 : (totalAttended / totalClasses) * 100;

  // Classes needed to recover if bunk budget is negative (semester-forward deficit per TRD §3).
  let classesNeededToRecover = 0;
  if (bunkBudget < 0) {
    classesNeededToRecover = calculateClassesNeededToRecover(totalAttended, totalMissed, threshold, multiplier);
  }

  // Max possible % if all remaining sessions are attended
  const potentialTotal = totalClasses + remainingClasses;
  const maxAttended = totalAttended + remainingClasses;
  const maxPossiblePct = potentialTotal === 0 ? 100 : (maxAttended / potentialTotal) * 100;

  return {
    attendedCount: totalAttended,
    absentCount: totalMissed,
    totalClasses,
    totalSessions,
    remainingClasses,
    cancelledCount,
    attendancePct,
    bunkBudget,
    safeBunks: Math.max(0, bunkBudget),
    requiredSessions,
    classesNeededToRecover,
    maxPossiblePct,
    maxAttended,
    potentialTotal,
  };
};

export const calculateBunkBudget = (
  totalSessions: number,
  totalMissed: number,
  threshold: number,
  multiplier: number = 1
): number => {
  const requiredSessions = Math.ceil(totalSessions * threshold);
  const sessionBudget = totalSessions - requiredSessions - totalMissed;
  return multiplier > 1 ? Math.floor(sessionBudget / multiplier) : sessionBudget;
};

export const calculateClassesNeededToRecover = (
  totalAttended: number,
  totalMissed: number,
  threshold: number,
  multiplier: number = 1
): number => {
  const denominator = multiplier * (1 - threshold);
  if (denominator <= 0) {
    return totalMissed > 0 ? 999 : 0;
  }
  const numerator = threshold * totalMissed - totalAttended * (1 - threshold);
  // Epsilon adjustment / decimal rounding to prevent IEEE-754 precision drift (e.g. 1.000000000000001 -> ceil -> 2)
  return Math.max(0, Math.ceil(Number((numerator / denominator).toFixed(6))));
};

export interface OverallStats {
  percentage: number;
  totalAttended: number;
  totalClasses: number;
  totalSafeBunks: number;
  classesNeededTotal: number;
  isSafe: boolean;
  status: 'safe' | 'warning' | 'critical';
}

export const calculateOverallStats = (
  subjects: Subject[],
  records: AttendanceRecord[],
  semesterEndDate: string,
  holidays: Holiday[] = [],
  globalThreshold: number = 0.75
): OverallStats => {
  let attended = 0;
  let total = 0;
  let bunks = 0;
  let classesNeeded = 0;

  subjects.forEach((s) => {
    const stats = calculateSubjectStats(s, records, semesterEndDate, holidays, globalThreshold);
    attended += stats.attendedCount;
    total += stats.totalClasses;
    bunks += Math.max(0, stats.bunkBudget);
    if (stats.bunkBudget < 0) {
      classesNeeded += stats.classesNeededToRecover;
    }
  });

  const percentage = total === 0 ? 100 : Math.round((attended / total) * 100);
  const thresholdPct = globalThreshold * 100;
  const isSafe = percentage >= thresholdPct;
  const status: 'safe' | 'warning' | 'critical' = percentage >= thresholdPct + 10 ? 'safe' : percentage >= thresholdPct ? 'warning' : 'critical';

  return {
    percentage,
    totalAttended: attended,
    totalClasses: total,
    totalSafeBunks: bunks,
    classesNeededTotal: classesNeeded,
    isSafe,
    status,
  };
};

export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};


export const getStatusColor = (percentage: number, threshold: number = 0.75) => {
  const thresholdPct = threshold * 100;
  if (percentage >= thresholdPct + 10) return 'text-green-500';
  if (percentage >= thresholdPct) return 'text-amber-500';
  return 'text-red-500';
};

export interface WeekdayStat {
  dayIndex: number;
  dayName: string;
  shortName: string;
  attended: number;
  missed: number;
  cancelled: number;
  total: number;
  percentage: number;
}

const WEEKDAY_NAMES = [
  { short: 'Sun', full: 'Sunday' },
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
];

export const calculateWeekdayStats = (records: AttendanceRecord[]): WeekdayStat[] => {
  const map = new Map<number, { attended: number; missed: number; cancelled: number }>();
  for (let i = 0; i < 7; i++) {
    map.set(i, { attended: 0, missed: 0, cancelled: 0 });
  }

  records.forEach((r) => {
    const day = parseLocalDate(r.date).getDay();
    const current = map.get(day)!;
    if (r.status === 'present') current.attended++;
    else if (r.status === 'absent') current.missed++;
    else if (r.status === 'cancelled') current.cancelled++;
  });

  return WEEKDAY_NAMES.map((name, idx) => {
    const counts = map.get(idx)!;
    const total = counts.attended + counts.missed;
    const percentage = total === 0 ? 100 : (counts.attended / total) * 100;
    return {
      dayIndex: idx,
      dayName: name.full,
      shortName: name.short,
      attended: counts.attended,
      missed: counts.missed,
      cancelled: counts.cancelled,
      total,
      percentage: Number(percentage.toFixed(1)),
    };
  });
};

/**
 * Calculates current consecutive attendance streak (days where all scheduled classes were attended).
 * Automatically skips weekends, holidays, and days with no classes.
 */
export const calculateAttendanceStreak = (
  records: AttendanceRecord[],
  subjects: Subject[],
  holidays: Holiday[] = []
): number => {
  if (subjects.length === 0 || records.length === 0) return 0;

  // Index records by date -> subjectId -> list of records for multi-slot awareness
  const recordsByDate = new Map<string, Map<string, AttendanceRecord[]>>();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    let dayMap = recordsByDate.get(r.date);
    if (!dayMap) {
      dayMap = new Map();
      recordsByDate.set(r.date, dayMap);
    }
    const existing = dayMap.get(r.subjectId);
    if (existing) {
      existing.push(r);
    } else {
      dayMap.set(r.subjectId, [r]);
    }
  }

  const now = new Date();
  let streak = 0;

  for (let daysBack = 0; daysBack < 365; daysBack++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - daysBack);
    const dayOfWeek = checkDate.getDay();
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

    // Check if this date falls within a configured holiday
    const isHoliday = holidays.some((h) => dateStr >= h.startDate && dateStr <= h.endDate);
    if (isHoliday) continue;

    // Find subjects scheduled for this day
    const scheduledSubjects = subjects.filter((s) =>
      s.schedule.some((slot) => Number(slot.day) === dayOfWeek)
    );

    // No classes scheduled -> skip this day without breaking streak
    if (scheduledSubjects.length === 0) continue;

    // Check attendance for each scheduled subject on this date
    const dayMap = recordsByDate.get(dateStr);

    if (!dayMap || dayMap.size === 0) {
      if (daysBack === 0) continue; // Today hasn't been marked yet, skip
      break; // Past day with no records = missed
    }

    let hasAbsent = false;
    let hasPresent = false;
    let unmarkedCount = 0;

    for (const sub of scheduledSubjects) {
      const subRecords = dayMap.get(sub.id);
      if (!subRecords || subRecords.length === 0) {
        unmarkedCount++;
        continue;
      }

      if (subRecords.some((r) => r.status === 'absent')) {
        hasAbsent = true;
        break;
      }

      if (subRecords.some((r) => r.status === 'present')) {
        hasPresent = true;
      }

      const hasLegacyRecord = subRecords.some((r) => !r.slot);
      if (!hasLegacyRecord) {
        const scheduledSlots = sub.schedule.filter((slot) => Number(slot.day) === dayOfWeek);
        const markedSlots = new Set(subRecords.map((r) => r.slot).filter(Boolean));
        const missingSlots = scheduledSlots.filter((slot) => !markedSlots.has(slot.slot)).length;
        if (missingSlots > 0 && subRecords.length < scheduledSlots.length) {
          unmarkedCount += missingSlots;
        }
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
};




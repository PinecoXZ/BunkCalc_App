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
  holidays?: Holiday[]
): SubjectStats => {
  const subjectRecords = records.filter((r) => r.subjectId === subject.id);
  const multiplier = subject.isLab ? 2 : 1;
  const threshold = subject.threshold ?? 0.75;

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
  let bunkBudget = totalSessions - requiredSessions - totalMissed;

  if (!semesterEndDate && remainingClasses === 0) {
    bunkBudget = 0;
  }

  // Current attendance %
  const attendancePct = totalClasses === 0 ? 100 : (totalAttended / totalClasses) * 100;

  // Classes needed to recover if below threshold or negative budget
  let classesNeededToRecover = 0;
  if (bunkBudget < 0 || attendancePct < threshold * 100) {
    const denominator = 1 - threshold;
    if (denominator > 0) {
      const numerator = threshold * totalMissed - totalAttended * (1 - threshold);
      classesNeededToRecover = Math.max(0, Math.ceil(numerator / denominator));
    } else {
      classesNeededToRecover = totalMissed > 0 ? 999 : 0;
    }
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

export const getStatusBgColor = (percentage: number, threshold: number = 0.75) => {
  const thresholdPct = threshold * 100;
  if (percentage >= thresholdPct + 10) return 'bg-green-500';
  if (percentage >= thresholdPct) return 'bg-amber-500';
  return 'bg-red-500';
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



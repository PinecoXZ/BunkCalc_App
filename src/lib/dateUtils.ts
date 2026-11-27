import type { ScheduleSlot, AttendanceRecord, Holiday } from './types';
export const toISODateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Normalizes an ISO date or timestamp string into YYYY-MM-DD, or '' if invalid. */
export const normalizeISODate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = (dateStr.includes('T') ? dateStr.split('T')[0] : dateStr).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : '';
};

/** Returns true when semesterEndDate is configured and strictly before referenceDateStr. */
export const isSemesterEnded = (
  semesterEndDate?: string,
  referenceDateStr: string = toISODateStr(new Date())
): boolean => {
  const cleanEnd = normalizeISODate(semesterEndDate);
  if (!cleanEnd) return false;
  return referenceDateStr > cleanEnd;
};

/**
 * Count remaining class sessions from today (or tomorrow if today is marked) to semesterEndDate,
 * automatically excluding dates that fall within specified college holidays/exams.
 */
export const countRemainingSessions = (
  schedule: ScheduleSlot[],
  semesterEndDate: string,
  records: AttendanceRecord[] = [],
  subjectId?: string,
  holidays: Holiday[] = [],
  isLab: boolean = false
): number => {
  if (!semesterEndDate || !schedule || schedule.length === 0) return 0;

  const parseEndDate = (dateStr: string): Date => {
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    }
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const endDate = parseEndDate(semesterEndDate);
  
  const now = new Date();
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  const todayStr = toISODateStr(now);

  // Determine how much of today's scheduled slots for this subject are already marked
  const todayRecords = subjectId
    ? records.filter((r) => r.subjectId === subjectId && r.date === todayStr)
    : [];
  const hasLegacyTodayRecord = todayRecords.some((r) => !r.slot);
  const markedTodaySlots = new Set(
    todayRecords.map((r) => r.slot).filter((s): s is string => Boolean(s))
  );

  const multiplier = isLab ? 2 : 1;
  let sessionCount = 0;
  while (current <= endDate) {
    const currentStr = toISODateStr(current);
    
    // Check if current date is inside any configured college holiday / exam range
    const isHoliday = holidays.some((h) => currentStr >= h.startDate && currentStr <= h.endDate);
    
    if (!isHoliday) {
      const day = current.getDay();
      const daySlots = schedule.filter((s) => Number(s.day) === day);
      let classesOnDay = daySlots.length;

      if (currentStr === todayStr && subjectId) {
        if (hasLegacyTodayRecord) {
          classesOnDay = 0;
        } else if (markedTodaySlots.size > 0) {
          const unmarkedBySlot = daySlots.filter((s) => !markedTodaySlots.has(s.slot)).length;
          classesOnDay = Math.min(unmarkedBySlot, Math.max(0, daySlots.length - markedTodaySlots.size));
        }
      }

      sessionCount += classesOnDay * multiplier;
    }
    
    current.setDate(current.getDate() + 1);
  }

  return sessionCount;
};

/**
 * Count cancelled records for a subject.
 */
export const countCancelledSessions = (
  records: AttendanceRecord[],
  subjectId: string
): number => {
  const cancelledCount = records.filter(
    (r) => r.subjectId === subjectId && r.status === 'cancelled'
  ).length;
  return cancelledCount;
};

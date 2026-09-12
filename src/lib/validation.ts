import type { Subject, AttendanceRecord, AppSettings, ArchivedSemester, Holiday } from './types';

export function sanitizeName(name: string): string {
  if (typeof name !== 'string') return '';
  let sanitized = name.trim();
  
  // Strip script tags first
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Strip HTML tags entirely to prevent any HTML injection
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Strip control characters (C0 and C1 control codes) and non-printable characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\u202E\u202F]/g, '');

  // Collapse inner multiple spaces/whitespace to one space
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

export function validateSubjectName(name: string, existingNames: string[]): { valid: boolean; error?: string } {
  const sanitized = sanitizeName(name);
  if (!sanitized) {
    return { valid: false, error: 'Subject name cannot be empty.' };
  }
  if (sanitized.length > 40) {
    return { valid: false, error: 'Subject name cannot exceed 40 characters.' };
  }
  const lowerSanitized = sanitized.toLowerCase();
  const isDuplicate = existingNames.some(existing => sanitizeName(existing).toLowerCase() === lowerSanitized);
  if (isDuplicate) {
    return { valid: false, error: 'A subject with this name already exists.' };
  }
  return { valid: true };
}

export function validateArchiveName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeName(name);
  if (!sanitized) {
    return { valid: false, error: 'Archive name cannot be empty.' };
  }
  if (sanitized.length > 50) {
    return { valid: false, error: 'Archive name cannot exceed 50 characters.' };
  }
  return { valid: true };
}

function hasPrototypePollution(obj: unknown): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasPrototypePollution(item)) {
        return true;
      }
    }
  } else {
    const rec = obj as Record<string, unknown>;
    const keys = Object.keys(rec);
    for (const key of keys) {
      if (key === '__proto__') {
        return true;
      }
      if (hasPrototypePollution(rec[key])) {
        return true;
      }
    }
  }
  return false;
}

function isString(val: unknown): val is string {
  return typeof val === 'string';
}

function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val);
}

function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean';
}

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/; // HH:MM
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

function validateScheduleSlot(slot: unknown): boolean {
  if (!slot || typeof slot !== 'object') return false;
  const s = slot as Record<string, unknown>;
  if (!isNumber(s.day) || s.day < 0 || s.day > 6) return false;
  if (!isString(s.slot) || !TIME_REGEX.test(s.slot)) return false;
  return true;
}

function validateSubject(sub: unknown): { valid: boolean; data?: Subject } {
  if (!sub || typeof sub !== 'object') return { valid: false };
  const s = sub as Record<string, unknown>;
  if (!isString(s.id) || !s.id.trim()) return { valid: false };
  if (!isString(s.name)) return { valid: false };
  
  const sanitizedName = sanitizeName(s.name);
  if (!sanitizedName || sanitizedName.length > 40) return { valid: false };
  
  if (!isNumber(s.credits) || s.credits < 1 || s.credits > 5) return { valid: false };
  if (!isNumber(s.threshold) || s.threshold < 0 || s.threshold > 1) return { valid: false };
  
  if (!Array.isArray(s.schedule)) return { valid: false };
  for (const slot of s.schedule) {
    if (!validateScheduleSlot(slot)) return { valid: false };
  }
  
  const isLab = typeof s.isLab === 'boolean' ? s.isLab : s.labMultiplier === 2;
  
  const attendedSoFar = isNumber(s.attendedSoFar) && s.attendedSoFar >= 0 ? Math.floor(s.attendedSoFar) : 0;
  const missedSoFar = isNumber(s.missedSoFar) && s.missedSoFar >= 0 ? Math.floor(s.missedSoFar) : 0;

  const validSchedule = (s.schedule as Array<Record<string, unknown>>).map((slot) => ({
    day: Number(slot.day),
    slot: String(slot.slot),
    room: typeof slot.room === 'string' ? sanitizeName(slot.room) : undefined,
    faculty: typeof slot.faculty === 'string' ? sanitizeName(slot.faculty) : undefined,
  }));

  return {
    valid: true,
    data: {
      id: s.id.trim(),
      name: sanitizedName,
      credits: s.credits,
      threshold: s.threshold,
      schedule: validSchedule,
      isLab,
      attendedSoFar,
      missedSoFar,
      color: typeof s.color === 'string' ? s.color : undefined,
      code: typeof s.code === 'string' ? sanitizeName(s.code) : undefined,
      room: typeof s.room === 'string' ? sanitizeName(s.room) : undefined,
      faculty: typeof s.faculty === 'string' ? sanitizeName(s.faculty) : undefined,
    }
  };
}

function validateAttendanceRecord(rec: unknown): { valid: boolean; data?: AttendanceRecord } {
  if (!rec || typeof rec !== 'object') return { valid: false };
  const r = rec as Record<string, unknown>;
  if (!isString(r.id) || !r.id.trim()) return { valid: false };
  if (!isString(r.subjectId) || !r.subjectId.trim()) return { valid: false };
  if (!isString(r.date) || !DATE_REGEX.test(r.date)) return { valid: false };
  if (r.status !== 'present' && r.status !== 'absent' && r.status !== 'cancelled') return { valid: false };
  
  return {
    valid: true,
    data: {
      id: r.id.trim(),
      subjectId: r.subjectId.trim(),
      date: r.date,
      status: r.status
    }
  };
}

function validateSettings(set: unknown): { valid: boolean; data?: AppSettings } {
  if (!set || typeof set !== 'object') return { valid: false };
  const s = set as Record<string, unknown>;
  if (!isNumber(s.globalThreshold) || s.globalThreshold < 0 || s.globalThreshold > 1) return { valid: false };
  if (!isNumber(s.warningBuffer) || s.warningBuffer < 0 || s.warningBuffer > 1) return { valid: false };
  if (!isBoolean(s.notificationsEnabled)) return { valid: false };
  
  const validReminderMinutes = [5, 10, 15, 30];
  if (!validReminderMinutes.includes(s.reminderMinutesBefore as number)) return { valid: false };
  
  if (!isBoolean(s.holidayMode)) return { valid: false };
  if (!isBoolean(s.hapticsEnabled)) return { valid: false };
  
  const validThemes = ['light', 'dark', 'system'];
  const theme = s.theme === 'oled' ? 'dark' : (validThemes.includes(s.theme as string) ? s.theme : 'system');

  const validAccents = ['blue', 'purple', 'emerald', 'amber', 'rose'];
  const themeAccent = validAccents.includes(s.themeAccent as string) ? (s.themeAccent as AppSettings['themeAccent']) : 'blue';
  
  const result: AppSettings = {
    semesterEndDate: isString(s.semesterEndDate) ? s.semesterEndDate : '',
    globalThreshold: s.globalThreshold,
    warningBuffer: s.warningBuffer,
    notificationsEnabled: s.notificationsEnabled,
    preClassReminder: s.preClassReminder !== false,
    postClassReminder: s.postClassReminder !== false,
    sundaySummaryNotification: s.sundaySummaryNotification !== false,
    reminderMinutesBefore: s.reminderMinutesBefore as 5 | 10 | 15 | 30,
    holidayMode: s.holidayMode,
    hapticsEnabled: s.hapticsEnabled,
    theme: theme as AppSettings['theme'],
    themeAccent,
  };

  if (s.semesterEndDate !== undefined) {
    if (!isString(s.semesterEndDate)) return { valid: false };
    const datePart = s.semesterEndDate.split('T')[0];
    if (!DATE_REGEX.test(datePart)) return { valid: false };
    result.semesterEndDate = s.semesterEndDate;
  }

  // Validate holidays
  if (Array.isArray(s.holidays)) {
    const validatedHolidays: Holiday[] = [];
    for (const h of s.holidays) {
      if (h && typeof h === 'object') {
        const item = h as Record<string, unknown>;
        if (isString(item.id) && isString(item.name) && isString(item.startDate) && isString(item.endDate)) {
          if (DATE_REGEX.test(item.startDate) && DATE_REGEX.test(item.endDate)) {
            validatedHolidays.push({
              id: item.id.trim(),
              name: sanitizeName(item.name) || 'Holiday',
              startDate: item.startDate,
              endDate: item.endDate,
            });
          }
        }
      }
    }
    result.holidays = validatedHolidays;
  }

  return {
    valid: true,
    data: result
  };
}

function validateArchivedSemester(sem: unknown): { valid: boolean; data?: ArchivedSemester } {
  if (!sem || typeof sem !== 'object') return { valid: false };
  const s = sem as Record<string, unknown>;
  if (!isString(s.id) || !s.id.trim()) return { valid: false };
  if (!isString(s.name)) return { valid: false };
  
  const sanitizedName = sanitizeName(s.name);
  if (!sanitizedName || sanitizedName.length > 50) return { valid: false };
  
  if (!isString(s.endDate)) return { valid: false };
  if (!isString(s.archivedAt)) return { valid: false };
  if (!isNumber(s.overallPct) || s.overallPct < 0 || s.overallPct > 100) return { valid: false };
  
  if (!Array.isArray(s.subjects)) return { valid: false };
  const validatedSubjects: Subject[] = [];
  for (const sub of s.subjects) {
    const v = validateSubject(sub);
    if (!v.valid || !v.data) return { valid: false };
    validatedSubjects.push(v.data);
  }
  
  if (!Array.isArray(s.records)) return { valid: false };
  const validatedRecords: AttendanceRecord[] = [];
  for (const rec of s.records) {
    const v = validateAttendanceRecord(rec);
    if (!v.valid || !v.data) return { valid: false };
    validatedRecords.push(v.data);
  }
  
  return {
    valid: true,
    data: {
      id: s.id.trim(),
      name: sanitizedName,
      endDate: s.endDate,
      archivedAt: s.archivedAt,
      overallPct: s.overallPct,
      subjects: validatedSubjects,
      records: validatedRecords
    }
  };
}

export interface ValidatedImportPayload {
  subjects: Subject[];
  attendance: AttendanceRecord[];
  settings?: AppSettings;
  archived_semesters?: ArchivedSemester[];
}

export function validateImportPayload(data: unknown): { valid: boolean; error?: string; data?: ValidatedImportPayload } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Import payload must be a valid JSON object.' };
  }

  if (hasPrototypePollution(data)) {
    return { valid: false, error: 'Prototype pollution detected in import payload.' };
  }

  const payload = data as Record<string, unknown>;

  // Validate subjects
  if (!payload.subjects || !Array.isArray(payload.subjects)) {
    return { valid: false, error: 'Import data is missing "subjects" array.' };
  }
  if (payload.subjects.length > 100) {
    return { valid: false, error: 'Subjects count exceeds the limit of 100.' };
  }
  const sanitizedSubjects: Subject[] = [];
  for (let i = 0; i < payload.subjects.length; i++) {
    const v = validateSubject(payload.subjects[i]);
    if (!v.valid || !v.data) {
      return { valid: false, error: `Invalid subject schema at index ${i}.` };
    }
    sanitizedSubjects.push(v.data);
  }

  // Validate attendance
  if (!payload.attendance || !Array.isArray(payload.attendance)) {
    return { valid: false, error: 'Import data is missing "attendance" array.' };
  }
  if (payload.attendance.length > 50000) {
    return { valid: false, error: 'Attendance records count exceeds the limit of 50,000.' };
  }
  const sanitizedAttendance: AttendanceRecord[] = [];
  for (let i = 0; i < payload.attendance.length; i++) {
    const v = validateAttendanceRecord(payload.attendance[i]);
    if (!v.valid || !v.data) {
      return { valid: false, error: `Invalid attendance record schema at index ${i}.` };
    }
    sanitizedAttendance.push(v.data);
  }

  // Validate settings (optional)
  let sanitizedSettings: AppSettings | undefined = undefined;
  if (payload.settings !== undefined) {
    const v = validateSettings(payload.settings);
    if (!v.valid || !v.data) {
      return { valid: false, error: 'Invalid settings schema.' };
    }
    sanitizedSettings = v.data;
  }

  // Validate archived_semesters (optional)
  const sanitizedArchived: ArchivedSemester[] = [];
  if (payload.archived_semesters !== undefined) {
    if (!Array.isArray(payload.archived_semesters)) {
      return { valid: false, error: '"archived_semesters" must be an array.' };
    }
    if (payload.archived_semesters.length > 50) {
      return { valid: false, error: 'Archived semesters count exceeds the limit of 50.' };
    }
    for (let i = 0; i < payload.archived_semesters.length; i++) {
      const v = validateArchivedSemester(payload.archived_semesters[i]);
      if (!v.valid || !v.data) {
        return { valid: false, error: `Invalid archived semester schema at index ${i}.` };
      }
      sanitizedArchived.push(v.data);
    }
  }

  const result: ValidatedImportPayload = {
    subjects: sanitizedSubjects,
    attendance: sanitizedAttendance,
  };
  if (sanitizedSettings !== undefined) {
    result.settings = sanitizedSettings;
  }
  if (payload.archived_semesters !== undefined) {
    result.archived_semesters = sanitizedArchived;
  }

  return {
    valid: true,
    data: result
  };
}

import { v4 as uuidv4 } from 'uuid';
import type { Subject, ScheduleSlot } from './types';
import { sanitizeName } from './validation';

export interface ParsedTimetableResult {
  subjects: Subject[];
  rawText: string;
  detectedCount: number;
}

const DAY_KEYWORDS: Record<string, number> = {
  'mon': 1, 'monday': 1, 'mo': 1, 'm': 1,
  'tue': 2, 'tues': 2, 'tuesday': 2, 'tu': 2, 't': 2,
  'wed': 3, 'wednesday': 3, 'we': 3, 'w': 3,
  'thu': 4, 'thur': 4, 'thurs': 4, 'thursday': 4, 'th': 4,
  'fri': 5, 'friday': 5, 'fr': 5, 'f': 5,
  'sat': 6, 'saturday': 6, 'sa': 6,
  'sun': 0, 'sunday': 0, 'su': 0,
};

const DEFAULT_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

/**
 * Parses raw timetable text (from OCR or direct user paste) into structured Subject objects.
 */
export const parseTimetableText = (text: string): ParsedTimetableResult => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const subjectMap = new Map<string, {
    name: string;
    isLab: boolean;
    credits: number;
    slots: Set<string>; // "day@slot"
  }>();

  // Common noise words to ignore in subject extraction
  const ignoreTokens = new Set([
    'lunch', 'break', 'recess', 'library', 'sports', 'cocurricular',
    'period', 'time', 'slot', 'day', 'days', 'monday', 'tuesday',
    'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'room', 'hall', 'block', 'faculty', 'mentor', 'attendance'
  ]);

  let currentDay = 1; // Default Monday

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Check if line indicates a day header
    const firstWord = lower.split(/[\s,:\-_|]+/)[0];
    if (DAY_KEYWORDS[firstWord] !== undefined) {
      currentDay = DAY_KEYWORDS[firstWord];
      continue;
    }

    // Check if line contains a time pattern (e.g. 09:00 or 9:00 AM or 10-11)
    const timeMatch = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    let matchedSlot = '09:00';
    if (timeMatch) {
      const h = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
      const m = String(timeMatch[2]).padStart(2, '0');
      matchedSlot = `${h}:${m}`;
    }

    // Split line into cell tokens (by comma, tab, pipe, semicolon, or multi-space)
    const cellTokens = line.split(/[|\t,;]+|\s{2,}/).map(t => t.trim()).filter(Boolean);

    for (let c = 0; c < cellTokens.length; c++) {
      const rawToken = cellTokens[c];
      const tokenLower = rawToken.toLowerCase().trim();

      if (tokenLower.length < 2 || ignoreTokens.has(tokenLower)) continue;
      if (/^(\d{1,2}:\d{2}|\d{1,2}-\d{1,2}|period\s*\d+|slot\s*\d+)$/i.test(tokenLower)) continue;

      // Extract subject name
      let subjectName = sanitizeName(rawToken.replace(/\(.*?\)/g, ' '));
      // If contains faculty name or room number like "Data Structures (LH-101) - Prof X", extract course name
      subjectName = subjectName.split(/[-–—/]/)[0].trim();

      if (subjectName.length < 2 || ignoreTokens.has(subjectName.toLowerCase())) continue;

      const isLab = /lab|practical|workshop|studio|project/i.test(rawToken);
      const slotTime = timeMatch ? matchedSlot : DEFAULT_SLOTS[Math.min(c, DEFAULT_SLOTS.length - 1)];

      const key = subjectName.toLowerCase();
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          name: subjectName,
          isLab,
          credits: isLab ? 2 : 3,
          slots: new Set(),
        });
      }

      const existing = subjectMap.get(key)!;
      existing.slots.add(`${currentDay}@${slotTime}`);
    }
  }

  // Convert map to Subject objects
  const subjects: Subject[] = Array.from(subjectMap.values()).map(item => {
    const schedule: ScheduleSlot[] = Array.from(item.slots).map(slotToken => {
      const [dayStr, timeStr] = slotToken.split('@');
      return {
        day: Number(dayStr) || 1,
        slot: timeStr || '09:00',
      };
    });

    return {
      id: uuidv4(),
      name: item.name,
      credits: item.credits,
      threshold: 0.75,
      isLab: item.isLab,
      schedule: schedule.length > 0 ? schedule : [{ day: 1, slot: '09:00' }],
      attendedSoFar: 0,
      missedSoFar: 0,
    };
  });

  return {
    subjects,
    rawText: text,
    detectedCount: subjects.length,
  };
};

/**
 * Preprocesses an image on a Canvas element to enhance contrast & binarize text for OCR readability.
 */
export const preprocessImageForOCR = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Grayscale and dynamic contrast stretching
  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = maxLum - minLum || 1;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let lum = (0.299 * r + 0.587 * g + 0.114 * b - minLum) * (255 / range);
    
    // High-contrast binarization threshold
    lum = lum > 140 ? 255 : 0;

    data[i] = lum;
    data[i + 1] = lum;
    data[i + 2] = lum;
  }

  ctx.putImageData(imgData, 0, 0);
};


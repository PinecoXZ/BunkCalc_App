import type { Holiday } from './types';
import { v4 as uuidv4 } from 'uuid';
import { toISODateStr } from './dateUtils';
import { sanitizeName } from './validation';

const unescapeICSText = (text: string): string =>
  text
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');

/**
 * Parses an RFC 5545 .ics file text and extracts holiday event date ranges
 */
export const parseICSFile = (icsText: string): Holiday[] => {
  const holidays: Holiday[] = [];
  // RFC 5545 line unfolding: CRLF or LF followed by single space/tab continues previous line
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);
  
  let inEvent = false;
  let summary = '';
  let dtStart = '';
  let dtEnd = '';

  const parseDate = (val: string): string => {
    // Format could be 20261025 or 20261025T090000Z or VALUE=DATE:20261025
    const clean = val.includes(':') ? val.split(':').pop() || '' : val;
    const match = clean.match(/^(\d{4})(\d{2})(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      summary = '';
      dtStart = '';
      dtEnd = '';
    } else if (trimmed === 'END:VEVENT') {
      if (inEvent && dtStart) {
        const start = parseDate(dtStart);
        let end = dtEnd ? parseDate(dtEnd) : start;
        const dtEndValue = dtEnd.includes(':') ? dtEnd.split(':').pop() || '' : dtEnd;
        const hasTimeComponent = /T\d{4,6}/i.test(dtEndValue);
        // RFC 5545: DTEND for all-day events (VALUE=DATE) is exclusive
        // If end date differs from start and dtEnd has no time component, subtract 1 day
        if (end && dtEnd && !hasTimeComponent && end !== start) {
          const [ey, em, ed] = end.split('-').map(Number);
          const endDate = new Date(ey, em - 1, ed);
          endDate.setDate(endDate.getDate() - 1);
          end = toISODateStr(endDate);
        }
        if (start) {
          const cleanName = sanitizeName(unescapeICSText(summary));
          holidays.push({
            id: uuidv4(),
            name: cleanName || 'Academic Holiday',
            startDate: start,
            endDate: end || start,
          });
        }
      }
      inEvent = false;
    } else if (inEvent) {
      const summaryMatch = trimmed.match(/^SUMMARY(?:;[^:]*)?:(.*)$/i);
      if (summaryMatch) {
        summary = summaryMatch[1];
      } else if (trimmed.startsWith('DTSTART')) {
        dtStart = trimmed;
      } else if (trimmed.startsWith('DTEND')) {
        dtEnd = trimmed;
      }
    }
  }

  return holidays;
};

interface HolidayPreset {
  name: string;
  category: string;
  holidays: Array<{
    name: string;
    startDate: string;
    endDate: string;
  }>;
}

/**
 * Common Indian University Academic Calendar Presets
 */
export const HOLIDAY_PRESETS: HolidayPreset[] = [
  {
    name: 'Autumn / Odd Semester Major Breaks',
    category: 'Autumn Semester',
    holidays: [
      { name: 'Mid-Sem Exam Prep Week', startDate: '2026-09-21', endDate: '2026-09-26' },
      { name: 'Durga Puja / Dussehra Break', startDate: '2026-10-18', endDate: '2026-10-24' },
      { name: 'Diwali & Kali Puja Vacation', startDate: '2026-11-08', endDate: '2026-11-13' },
      { name: 'End-Sem Exam & Study Break', startDate: '2026-12-01', endDate: '2026-12-14' },
      { name: 'Winter Vacation', startDate: '2026-12-20', endDate: '2026-12-31' },
    ],
  },
  {
    name: 'Spring / Even Semester Major Breaks',
    category: 'Spring Semester',
    holidays: [
      { name: 'Spring Mid-Sem Exam Week', startDate: '2026-02-23', endDate: '2026-02-28' },
      { name: 'Maha Shivratri & Holi Break', startDate: '2026-03-24', endDate: '2026-03-29' },
      { name: 'Spring Fest / Cultural Break', startDate: '2026-04-10', endDate: '2026-04-13' },
      { name: 'End-Sem Exam Prep', startDate: '2026-05-01', endDate: '2026-05-15' },
      { name: 'Summer Vacation', startDate: '2026-05-20', endDate: '2026-06-30' },
    ],
  },
];

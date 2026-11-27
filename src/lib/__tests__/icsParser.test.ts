import { describe, it, expect } from 'vitest';
import { parseICSFile } from '../icsParser';

describe('icsParser', () => {
  it('parses all-day VEVENT with exclusive DTEND adjusted by 1 day', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Diwali Break',
      'DTSTART;VALUE=DATE:20261108',
      'DTEND;VALUE=DATE:20261114',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseICSFile(ics);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Diwali Break');
    expect(result[0].startDate).toBe('2026-11-08');
    expect(result[0].endDate).toBe('2026-11-13');
  });

  it('defaults endDate to startDate when DTEND is omitted', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Republic Day',
      'DTSTART:20260126',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const result = parseICSFile(ics);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toBe('2026-01-26');
    expect(result[0].endDate).toBe('2026-01-26');
  });

  it('preserves same-day endDate when DTEND includes a time component', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Convocation',
      'DTSTART:20261108T090000Z',
      'DTEND:20261109T170000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const result = parseICSFile(ics);
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toBe('2026-11-08');
    expect(result[0].endDate).toBe('2026-11-09');
  });

  it('ignores non-event text and returns empty array for invalid input', () => {
    expect(parseICSFile('not a calendar')).toEqual([]);
  });

  it('unfolds folded lines, supports parameterized SUMMARY, unescapes text, and sanitizes HTML', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY;LANGUAGE=en:Mid-Sem\\, <script>Exam</script>',
      ' \\; Break\\nWeek',
      'DTSTART;VALUE=DATE:20261012',
      'DTEND;VALUE=DATE:20261015',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseICSFile(ics);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Mid-Sem, ; Break Week');
    expect(result[0].startDate).toBe('2026-10-12');
    expect(result[0].endDate).toBe('2026-10-14');
  });
});

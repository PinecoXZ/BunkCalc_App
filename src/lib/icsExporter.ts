import type { Subject, AppSettings } from './types';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const formatICSDate = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}${s}Z`;
};

/**
 * Builds standard RFC 5545 iCalendar (.ics) string representing the recurring timetable schedule.
 */
export const generateTimetableICS = (
  subjects: Subject[],
  settings: AppSettings
): string => {
  const now = new Date();
  const dtStamp = formatICSDate(now);
  const untilDateStr = settings.semesterEndDate 
    ? `${settings.semesterEndDate.replace(/-/g, '')}T235959Z`
    : `${now.getFullYear()}1231T235959Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BunkCalc//Academic Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:University Timetable',
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  // Map each subject and schedule slot to a recurring VEVENT
  subjects.forEach((subject) => {
    (subject.schedule || []).forEach((slot, slotIdx) => {
      const [hourStr, minStr] = slot.slot.split(':');
      const startHour = parseInt(hourStr, 10) || 9;
      const startMin = parseInt(minStr, 10) || 0;
      const durationHours = subject.isLab ? 2 : 1;
      const endHour = startHour + durationHours;

      // Find the first upcoming instance of this day of week starting from semester start or current week
      const targetDay = Number(slot.day);
      const firstEventDate = new Date();
      const currentDay = firstEventDate.getDay();
      const diffDays = (targetDay - currentDay + 7) % 7;
      firstEventDate.setDate(firstEventDate.getDate() + diffDays);
      firstEventDate.setHours(startHour, startMin, 0, 0);

      const firstEndDate = new Date(firstEventDate);
      firstEndDate.setHours(endHour, startMin, 0, 0);

      const uid = `bunkcalc-${subject.id}-slot-${slotIdx}-${targetDay}@bunkcalc.app`;
      const byDay = DAY_CODES[targetDay] || 'MO';
      const room = slot.room || subject.room || '';
      const faculty = slot.faculty || subject.faculty || '';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtStamp}`);
      lines.push(`DTSTART:${formatICSDate(firstEventDate)}`);
      lines.push(`DTEND:${formatICSDate(firstEndDate)}`);
      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilDateStr}`);
      lines.push(`SUMMARY:${subject.name}${subject.isLab ? ' (Lab)' : ''}`);
      
      const descParts = [
        `Subject: ${subject.name}`,
        `Credits: ${subject.credits}`,
        subject.isLab ? 'Type: Practical Lab (2 Hours)' : 'Type: Lecture',
      ];
      if (faculty) descParts.push(`Faculty: ${faculty}`);
      if (room) descParts.push(`Room: ${room}`);
      lines.push(`DESCRIPTION:${descParts.join('\\n')}`);

      if (room) {
        lines.push(`LOCATION:${room}`);
      }

      // Add holiday exemption dates if configured
      if (settings.holidays && settings.holidays.length > 0) {
        const exdates: string[] = [];
        settings.holidays.forEach(h => {
          const [sy, sm, sd] = h.startDate.split('-').map(Number);
          const [ey, em, ed] = h.endDate.split('-').map(Number);
          const cur = new Date(sy, sm - 1, sd);
          const end = new Date(ey, em - 1, ed);
          while (cur <= end) {
            if (cur.getDay() === targetDay) {
              const y = cur.getFullYear();
              const m = String(cur.getMonth() + 1).padStart(2, '0');
              const d = String(cur.getDate()).padStart(2, '0');
              exdates.push(`${y}${m}${d}T${String(startHour).padStart(2, '0')}${String(startMin).padStart(2, '0')}00`);
            }
            cur.setDate(cur.getDate() + 1);
          }
        });
        if (exdates.length > 0) {
          lines.push(`EXDATE:${exdates.join(',')}`);
        }
      }

      lines.push('STATUS:CONFIRMED');
      lines.push('END:VEVENT');
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

/**
 * Initiates export of timetable .ics file via native share or browser download.
 */
export const exportTimetableToICS = async (
  subjects: Subject[],
  settings: AppSettings
): Promise<{ success: boolean; error?: string }> => {
  try {
    const icsContent = generateTimetableICS(subjects, settings);
    const fileName = `BunkCalc_Timetable_${Date.now()}.ics`;

    if (Capacitor.isNativePlatform()) {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: icsContent,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'BunkCalc Class Timetable',
        text: 'Import your class schedule into Google Calendar or Apple Calendar.',
        files: [savedFile.uri],
        dialogTitle: 'Export Timetable Calendar',
      });
      return { success: true };
    }

    // Web download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('ICS export error:', err);
    return { success: false, error: errorMsg || 'Failed to export calendar file.' };
  }
};

import { calculateSubjectStats } from './calculations';
import { saveToStorage } from './storage';
import { toISODateStr } from './dateUtils';
import type { Subject, AttendanceRecord, AppSettings, WidgetSyncData, WidgetClassItem } from './types';

export const calculateWidgetData = (
  subjects: Subject[],
  records: AttendanceRecord[],
  settings: AppSettings
): WidgetSyncData => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeVal = currentHours * 60 + currentMinutes;
  const todayStr = toISODateStr(now);

  let totalAttended = 0;
  let totalPossible = 0;
  let totalSafeBunks = 0;

  subjects.forEach((s) => {
    const stats = calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays);
    totalAttended += stats.attendedCount;
    totalPossible += stats.totalClasses;
    totalSafeBunks += Math.max(0, stats.bunkBudget);
  });

  const overallPercentage = totalPossible === 0 ? 100 : (totalAttended / totalPossible) * 100;
  const isSafe = overallPercentage >= (settings.globalThreshold * 100);
  const statusColorHex = overallPercentage >= 85 ? '#22c55e' : overallPercentage >= 75 ? '#f59e0b' : '#ef4444';

  // Check today's classes
  const isTodayHoliday = !!settings.holidayMode || (settings.holidays || []).some(
    (h) => todayStr >= h.startDate && todayStr <= h.endDate
  );
  const todayRecords = records.filter(r => r.date === todayStr);
  const todayClassItems: WidgetClassItem[] = [];

  if (!isTodayHoliday) {
    subjects.forEach((sub) => {
      const matchingSlots = (sub.schedule || []).filter(slot => Number(slot.day) === currentDay);
    matchingSlots.forEach(slot => {
      const [h, m] = slot.slot.split(':').map(Number);
      const slotTimeVal = (h || 0) * 60 + (m || 0);
      const durationMin = sub.isLab ? 120 : 60;
      const classEndVal = slotTimeVal + durationMin;

      const record = todayRecords.find(r => r.subjectId === sub.id);
      let status: WidgetClassItem['status'] = 'upcoming';

      if (record) {
        status = record.status;
      } else if (currentTimeVal >= slotTimeVal && currentTimeVal <= classEndVal) {
        status = 'ongoing';
      } else if (currentTimeVal > classEndVal) {
        status = 'unmarked';
      }

      const room = slot.room || sub.room;
      const faculty = slot.faculty || sub.faculty;

      todayClassItems.push({
        id: `${sub.id}_${slot.slot}`,
        subjectName: sub.name,
        time: slot.slot,
        status,
        isLab: !!sub.isLab,
        room,
        faculty,
      });
    });
  });
  }

  // Sort today's classes chronologically
  todayClassItems.sort((a, b) => {
    const [ah, am] = a.time.split(':').map(Number);
    const [bh, bm] = b.time.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  // Determine next upcoming class
  let nextClass: WidgetSyncData['nextClass'] = null;
  for (const item of todayClassItems) {
    const [h, m] = item.time.split(':').map(Number);
    const slotTimeVal = (h || 0) * 60 + (m || 0);
    if (slotTimeVal > currentTimeVal && item.status !== 'present' && item.status !== 'absent' && item.status !== 'cancelled') {
      nextClass = {
        subjectName: item.subjectName,
        time: item.time,
        isLab: item.isLab,
        room: item.room,
        faculty: item.faculty,
      };
      break;
    }
  }

  return {
    overallPercentage: Number(overallPercentage.toFixed(1)),
    totalSafeBunks,
    isSafe,
    statusColorHex,
    nextClass,
    todayClasses: todayClassItems,
    lastUpdated: now.toISOString(),
  };
};

export const syncWidgetData = async (
  subjects: Subject[],
  records: AttendanceRecord[],
  settings: AppSettings
): Promise<WidgetSyncData> => {
  const data = calculateWidgetData(subjects, records, settings);
  try {
    await saveToStorage('bunkcalc_widget_data', data);
  } catch (err) {
    console.warn('Failed to sync widget data cache:', err);
  }
  return data;
};


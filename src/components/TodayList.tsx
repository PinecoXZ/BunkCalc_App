import React, { useState, useRef, useCallback } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { v4 as uuidv4 } from 'uuid';
import type { AttendanceStatus, Subject } from '../lib/types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import UndoToast from './UndoToast';
import { AppModal } from './AppModal';
import CelebrationOverlay from './CelebrationOverlay';
import { useSwipeGesture } from '../lib/useSwipeGesture';

import { calculateSubjectStats } from '../lib/calculations';
import { getFromStorage, saveToStorage } from '../lib/storage';
import { toISODateStr } from '../lib/dateUtils';

const TodayList: React.FC = () => {
  const subjects = useSubjects((state) => state.subjects);
  const { records, markAttendance, unmarkAttendance, undoLastAction, clearLastAction } = useAttendance();
  const settings = useSettings((state) => state.settings);

  // Toast & Celebration state
  const [toast, setToast] = useState<{ subjectName: string; status: AttendanceStatus } | null>(null);
  const [celebration, setCelebration] = useState<'present' | 'absent' | null>(null);

  // Modal Dialog state for validation/errors
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Helper to determine bunk safety
  const bunkSafeties = React.useMemo(() => {
    const safeties: Record<string, { label: string; color: string }> = {};
    subjects.forEach(subject => {
      const stats = calculateSubjectStats(subject, records, settings.semesterEndDate, settings.holidays);
      const threshold = (subject.threshold || settings.globalThreshold) * 100;
      const warningZone = ((subject.threshold || settings.globalThreshold) + settings.warningBuffer) * 100;

      if (stats.bunkBudget < 0 || (stats.totalClasses > 0 && stats.attendancePct < threshold)) {
        safeties[subject.id] = { label: 'CRITICAL', color: 'bg-red-500 text-white' };
      } else if (stats.bunkBudget <= 2 || stats.attendancePct <= warningZone) {
        safeties[subject.id] = { label: 'RISKY', color: 'bg-amber-500 text-white' };
      } else {
        safeties[subject.id] = { label: 'SAFE', color: 'bg-green-500 text-white' };
      }
    });
    return safeties;
  }, [subjects, records, settings]);

  const getBunkSafety = (subject: Subject) => {
    return bunkSafeties[subject.id] || { label: 'SAFE', color: 'bg-green-500 text-white' };
  };

  // Use local date for consistency across the app
  const now = new Date();
  const today = now.getDay(); // 0-6 local
  
  // Format: YYYY-MM-DD local
  const dateStr = toISODateStr(now);

  const todayHoliday = settings.holidays?.find(
    (h) => dateStr >= h.startDate && dateStr <= h.endDate
  );
  const [showOverriddenSchedule, setShowOverriddenSchedule] = useState(false);

  const todayClasses = subjects.filter((s) => 
    s.schedule.some((slot) => Number(slot.day) === today)
  );

  const todayRecords = records.filter((r) => r.date === dateStr);

  const handleClearTodayRecords = async () => {
    for (const r of todayRecords) {
      await unmarkAttendance(r.id);
    }
    setToast({ subjectName: "Today's holiday records", status: 'cancelled' });
  };

  const handleMarkRef = useRef<((subjectId: string, status: AttendanceStatus, slot: string, bypassTimeCheck?: boolean) => Promise<void>) | null>(null);

  // Swipe and gesture handling via custom hook
  const {
    swipeOffsets,
    snappedLeft,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    resetSwipe,
  } = useSwipeGesture({
    onSwipeRight: (subjectId, slotTime) => {
      handleMarkRef.current?.(subjectId, 'present', slotTime);
    },
  });

  const executeMark = useCallback(async (subjectId: string, status: AttendanceStatus) => {
    // Trigger haptic feedback
    if (settings.hapticsEnabled) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (err) {
        console.warn('Haptic feedback failed or not supported:', err);
      }
    }

    const subjectName = subjects.find(s => s.id === subjectId)?.name || '';

    await markAttendance({
      id: uuidv4(),
      subjectId,
      date: dateStr,
      status,
    });

    // Reset swipe and snap offsets for this subject
    resetSwipe(subjectId);

    // Show undo toast & visual celebration feedback
    setToast({ subjectName, status });
    if (status === 'present' || status === 'absent') {
      setCelebration(status);
    }

    // Show cancelled class explanation if status is cancelled
    if (status === 'cancelled') {
      getFromStorage<string>('has_seen_cancelled_tooltip').then(hasSeen => {
        if (!hasSeen) {
          saveToStorage('has_seen_cancelled_tooltip', 'true');
          setModal({
            isOpen: true,
            title: "Cancelled Class Behavior",
            message: "A cancelled class shrinks your total semester session pool. This slightly reduces your bunk budget — it does not count as a free bunk.",
            type: "alert",
            confirmText: "Got It",
            onConfirm: () => setModal(null)
          });
        }
      });
    }
  }, [settings.hapticsEnabled, markAttendance, dateStr, subjects, resetSwipe]);

  const handleMark = useCallback(async (subjectId: string, status: AttendanceStatus, slot: string, bypassTimeCheck: boolean = false) => {
    // Check if class has started
    const [hours, minutes] = slot.split(':').map(Number);
    const classStartTime = new Date();
    classStartTime.setHours(hours, minutes, 0, 0);

    if (!bypassTimeCheck && new Date().getTime() < classStartTime.getTime()) {
      setModal({
        isOpen: true,
        title: "Class Not Started Yet",
        message: `This class is scheduled at ${slot}. Would you like to mark attendance early anyway?`,
        type: "confirm",
        confirmText: "Mark Anyway",
        onConfirm: async () => {
          setModal(null);
          await executeMark(subjectId, status);
        }
      });
      // Slide it back to closed
      resetSwipe(subjectId);
      return;
    }

    await executeMark(subjectId, status);
  }, [executeMark, resetSwipe]);

  handleMarkRef.current = handleMark;

  // Batch Mark All Present
  const handleMarkAllPresent = async () => {
    if (settings.hapticsEnabled) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch {
        // web fallback
      }
    }

    const unmarked = todayClasses.filter(s => !getStatusForToday(s.id));
    for (const s of unmarked) {
      await markAttendance({
        id: uuidv4(),
        subjectId: s.id,
        date: dateStr,
        status: 'present',
      });
    }

    setCelebration('present');
    setToast({ subjectName: `All ${unmarked.length} Classes`, status: 'present' });
  };

  const handleUndo = useCallback(async () => {
    await undoLastAction();
    setToast(null);
  }, [undoLastAction]);

  const handleDismissToast = useCallback(() => {
    clearLastAction();
    setToast(null);
  }, [clearLastAction]);

  const getStatusForToday = (subjectId: string) => {
    return records.find((r) => r.subjectId === subjectId && r.date === dateStr)?.status;
  };

  if (settings.holidayMode) {
    return (
      <div className="bg-blue-500/10 rounded-2xl p-8 text-center border border-blue-500/30 space-y-3">
        <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <div>
          <p className="text-blue-400 font-bold text-base">Holiday Mode Active</p>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Enjoy your break! Notifications and class reminders are currently paused.
          </p>
        </div>
      </div>
    );
  }

  if (todayHoliday && !showOverriddenSchedule) {
    return (
      <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-in fade-in duration-200">
        <div className="bg-amber-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
            <span>No Classes Scheduled</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {todayHoliday.name || 'Academic Holiday'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Classes on this day are automatically excluded from your semester attendance requirement and bunk budget.
          </p>
          {todayHoliday.startDate !== todayHoliday.endDate && (
            <p className="text-[11px] font-semibold text-amber-600/80 dark:text-amber-400/80 mt-2">
              Break period: {todayHoliday.startDate} to {todayHoliday.endDate}
            </p>
          )}
        </div>

        {todayRecords.length > 0 && (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{todayRecords.length} class(es) marked on this holiday</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              If marked by mistake, clear them so they are not counted in your attendance:
            </p>
            <button
              onClick={handleClearTodayRecords}
              className="w-full py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Clear Today's Marked Attendance
            </button>
          </div>
        )}

        {todayClasses.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowOverriddenSchedule(true)}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Had a special makeup class? View regular timetable ({todayClasses.length} slots) ↓
            </button>
          </div>
        )}
      </div>
    );
  }

  if (todayClasses.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 border-dashed">
        <div className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-slate-400 dark:text-slate-400 font-medium">No classes scheduled for today.</p>
        <p className="text-slate-500 dark:text-slate-600 text-xs mt-1">Check your dashboard to see all subjects.</p>
      </div>
    );
  }

  const markedCount = todayClasses.filter(s => !!getStatusForToday(s.id)).length;
  const totalToday = todayClasses.length;
  const allMarked = totalToday > 0 && markedCount === totalToday;
  const progressPct = totalToday > 0 ? (markedCount / totalToday) * 100 : 0;

  return (
    <>
      {todayHoliday && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold">🏖️ Holiday Active:</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{todayHoliday.name}</span>
          </div>
          <button
            onClick={() => setShowOverriddenSchedule(false)}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 underline cursor-pointer"
          >
            Hide Timetable
          </button>
        </div>
      )}
      {/* â”€â”€ Today's Progress Card & Quick Actions â”€â”€ */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-4 space-y-3 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Today's Logging Progress
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {markedCount} of {totalToday} Marked
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                allMarked 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              }`}>
                {Math.round(progressPct)}%
              </span>
            </div>
          </div>

          {/* Mark All Present Quick Action */}
          {!allMarked && (
            <button
              onClick={handleMarkAllPresent}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Mark All Present</span>
            </button>
          )}
        </div>

        {/* Progress Bar Track */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Swipe hint */}
      <div className="text-center mb-3">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
          1-Tap Buttons or Swipe (Right for Present &bull; Left for Absent)
        </p>
      </div>

      <div className="space-y-3.5">
        {todayClasses.map((subject) => {
          const currentStatus = getStatusForToday(subject.id);
          const slotInfo = subject.schedule.find(s => Number(s.day) === today);
          const slotTime = slotInfo?.slot || '09:00';
          const safety = getBunkSafety(subject);
          const offset = swipeOffsets[subject.id] || (snappedLeft[subject.id] ? -200 : 0);
          
          return (
            <div key={subject.id} className="relative overflow-hidden rounded-2xl select-none">
              {/* Background actions revealed on swipe */}
              <div className="absolute inset-0 flex">
                {/* Right swipe background (Present) */}
                <div 
                  className={`flex items-center justify-start pl-6 w-1/2 transition-opacity duration-200 ${offset > 20 ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
                >
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
                    <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Present
                  </div>
                </div>

                {/* Left swipe background (Absent & Cancelled options) */}
                <div 
                  className={`flex items-center justify-end pr-3 gap-2 w-full transition-opacity duration-200 ${offset < -20 ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(270deg, #ef4444, #f97316)' }}
                >
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleMark(subject.id, 'absent', slotTime);
                    }}
                    className="bg-white hover:bg-slate-100 text-red-600 font-black text-xs uppercase px-3.5 py-2 rounded-xl shadow-lg border border-white/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Absent</span>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleMark(subject.id, 'cancelled', slotTime);
                    }}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase px-3.5 py-2 rounded-xl shadow-lg border border-white/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Cancelled</span>
                  </button>
                </div>
              </div>

              {/* Main card (swipeable) */}
              <div 
                aria-label={"Mark attendance for " + subject.name}
                className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm dark:shadow-md relative cursor-grab active:cursor-grabbing rounded-2xl"
                style={{ 
                  transform: `translateX(${offset}px)`,
                  transition: offset === 0 || offset === -200 ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                  touchAction: 'pan-y'
                }}
                onPointerDown={(e) => onPointerDown(e, subject.id)}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => onPointerUp(e, subject.id, slotTime)}
                onPointerCancel={() => onPointerCancel(subject.id)}
              >
                {/* Safety Indicator Pill */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${safety.color.split(' ')[0]}`}></div>
                
                {/* Keyboard/Screen Reader Fallbacks */}
                {!currentStatus && (
                  <div className="sr-only">
                    <button
                      onClick={async () => await handleMark(subject.id, 'present', slotTime)}
                      aria-label={`Mark ${subject.name} as Present`}
                    >
                      Mark Present
                    </button>
                    <button
                      onClick={async () => await handleMark(subject.id, 'absent', slotTime)}
                      aria-label={`Mark ${subject.name} as Absent`}
                    >
                      Mark Absent
                    </button>
                    <button
                      onClick={async () => await handleMark(subject.id, 'cancelled', slotTime)}
                      aria-label={`Mark ${subject.name} as Cancelled`}
                    >
                      Mark Cancelled
                    </button>
                  </div>
                )}

                <div className="flex-1 min-w-0 mr-3 pl-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base truncate text-slate-900 dark:text-white">{subject.name}</h4>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${safety.color}`}>
                      {safety.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter">
                      {slotTime}
                    </span>
                    <span className="text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      {subject.isLab ? 'Lab' : 'Theory'}
                    </span>
                    {(slotInfo?.room || subject.room) && (
                      <span className="text-slate-600 dark:text-slate-400 text-[10px] font-bold bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {slotInfo?.room || subject.room}
                      </span>
                    )}
                    {(slotInfo?.faculty || subject.faculty) && (
                      <span className="text-slate-400 text-[10px] font-medium truncate max-w-[100px]">
                        {slotInfo?.faculty || subject.faculty}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentStatus ? (
                    /* ALREADY MARKED: Show status badge + Copy Notice + Reset button */
                    <div className="flex items-center gap-1.5">
                      {currentStatus === 'present' && (
                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-green-500/20 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Present
                        </span>
                      )}
                      {currentStatus === 'absent' && (
                        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-red-500/20 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Absent
                        </span>
                      )}
                      {currentStatus === 'cancelled' && (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-slate-500/20 shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Cancelled
                          </span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const roomText = (slotInfo?.room || subject.room) ? ` in ${slotInfo?.room || subject.room}` : '';
                              const facultyText = (slotInfo?.faculty || subject.faculty) ? ` (${slotInfo?.faculty || subject.faculty})` : '';
                              const text = `CLASS NOTICE: ${subject.name} scheduled for ${slotTime}${roomText}${facultyText} is CANCELLED today.`;
                              try {
                                if (navigator.clipboard) {
                                  await navigator.clipboard.writeText(text);
                                }
                                setModal({
                                  isOpen: true,
                                  title: "Notice Copied",
                                  message: text,
                                  type: "success",
                                  confirmText: "Done",
                                  onConfirm: () => setModal(null)
                                });
                              } catch {
                                // fallback
                              }
                            }}
                            title="Copy cancellation message for WhatsApp"
                            className="p-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all text-xs font-bold flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            <span>Copy</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Clear button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const todayRecord = records.find(r => r.subjectId === subject.id && r.date === dateStr);
                          if (todayRecord) {
                            await unmarkAttendance(todayRecord.id);
                          }
                        }}
                        aria-label="Clear attendance"
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 transition-colors shadow-sm active:scale-90"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    /* UNMARKED: 1-Tap Quick Action Buttons */
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={async () => await handleMark(subject.id, 'present', slotTime)}
                        title="Mark Present"
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Present</span>
                      </button>

                      <button
                        onClick={async () => await handleMark(subject.id, 'absent', slotTime)}
                        title="Mark Absent"
                        className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-black flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Absent</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Undo Toast */}
      {toast && (
        <UndoToast
          subjectName={toast.subjectName}
          status={toast.status}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}

      {/* Celebration & Warning Overlay */}
      <CelebrationOverlay type={celebration} onDone={() => setCelebration(null)} />

      {/* AppModal fallback for Class Not Started alert */}
      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          onConfirm={modal.onConfirm}
        />
      )}
    </>
  );
};

export default TodayList;


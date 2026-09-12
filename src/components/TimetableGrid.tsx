import React, { useMemo, useState } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats } from '../lib/calculations';
import type { Subject, ScheduleSlot } from '../lib/types';

const BLOCK_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
] as const;

interface DayColumn {
  label: string;
  dayIndex: number;
}

const BASE_DAYS: DayColumn[] = [
  { label: 'Mon', dayIndex: 1 },
  { label: 'Tue', dayIndex: 2 },
  { label: 'Wed', dayIndex: 3 },
  { label: 'Thu', dayIndex: 4 },
  { label: 'Fri', dayIndex: 5 },
  { label: 'Sat', dayIndex: 6 },
];

interface ClassBlock {
  subject: Subject;
  slot: ScheduleSlot;
  colorClass: string;
}

export const TimetableGrid: React.FC = () => {
  const subjects = useSubjects((s) => s.subjects);
  const { records } = useAttendance();
  const { settings } = useSettings();
  const today = new Date().getDay();

  const [inspectedClass, setInspectedClass] = useState<{
    subject: Subject;
    slot: ScheduleSlot;
    dayLabel: string;
  } | null>(null);

  // Build a color map keyed by subject index for consistent coloring
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subj, idx) => {
      map.set(subj.id, BLOCK_COLORS[idx % BLOCK_COLORS.length]);
    });
    return map;
  }, [subjects]);

  // Check if any subject has a Sunday class
  const hasSunday = useMemo(
    () => subjects.some((s) => s.schedule.some((sc) => sc.day === 0)),
    [subjects],
  );

  const days = useMemo<DayColumn[]>(() => {
    if (hasSunday) return [{ label: 'Sun', dayIndex: 0 }, ...BASE_DAYS];
    return BASE_DAYS;
  }, [hasSunday]);

  // Group classes by day
  const classesByDay = useMemo(() => {
    const map = new Map<number, ClassBlock[]>();

    days.forEach((d) => map.set(d.dayIndex, []));

    subjects.forEach((subj) => {
      (subj.schedule || []).forEach((sc) => {
        const list = map.get(Number(sc.day));
        if (list) {
          list.push({
            subject: subj,
            slot: sc,
            colorClass: colorMap.get(subj.id) ?? BLOCK_COLORS[0],
          });
        }
      });
    });

    // Sort each day's classes by slot string (natural time order)
    map.forEach((blocks) => {
      blocks.sort((a, b) => a.slot.slot.localeCompare(b.slot.slot));
    });

    return map;
  }, [subjects, days, colorMap]);

  return (
    <div className="neu-card rounded-3xl border border-[var(--neu-shadow-dark)]/15 p-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            Weekly Master Timetable
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Tap any class block to inspect stats</p>
        </div>
      </div>

      <div
        className="overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .timetable-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div
          className="timetable-scroll flex gap-3 min-w-max scroll-smooth overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map((day) => {
            const isToday = day.dayIndex === today;
            const blocks = classesByDay.get(day.dayIndex) ?? [];

            return (
              <div
                key={day.dayIndex}
                className={`flex flex-col min-w-[140px] flex-1 rounded-2xl transition-colors duration-200 ${
                  isToday
                    ? 'neu-inset border border-blue-500/40 bg-blue-500/5'
                    : 'neu-flat-sm'
                }`}
              >
                {/* Column header */}
                <div className="sticky top-0 z-10 px-3 pt-3 pb-2 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      isToday ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {day.label}
                  </span>
                  {isToday && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>

                {/* Class blocks */}
                <div className="px-1.5 pb-2 flex flex-col gap-2">
                  {blocks.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">
                        No classes
                      </span>
                    </div>
                  ) : (
                    blocks.map((block, blockIdx) => {
                      const room = block.slot.room || block.subject.room;
                      const faculty = block.slot.faculty || block.subject.faculty;

                      return (
                        <button
                          key={`${block.subject.id}-${block.slot.slot}-${blockIdx}`}
                          type="button"
                          onClick={() => setInspectedClass({ subject: block.subject, slot: block.slot, dayLabel: day.label })}
                          className={`${block.colorClass} text-left rounded-xl p-3 mb-0 min-w-[130px] text-white shadow-md
                            hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer`}
                        >
                          <p className="font-bold text-xs truncate leading-tight">
                            {block.subject.name}
                          </p>
                          <p className="text-[10px] text-white/80 mt-1 leading-tight font-mono font-medium">
                            {block.slot.slot}
                          </p>
                          {room && (
                            <p className="text-[9px] text-white/90 truncate mt-0.5 font-bold">
                              {room}
                            </p>
                          )}
                          <div className="flex gap-1 items-center mt-1.5 flex-wrap">
                            {block.subject.isLab && (
                              <span className="text-[8px] font-black uppercase tracking-wider bg-white/25 backdrop-blur-sm rounded px-1.5 py-0.5">
                                Lab (2 hrs)
                              </span>
                            )}
                            {faculty && (
                              <span className="text-[8px] font-medium bg-black/20 rounded px-1 py-0.5 truncate max-w-[90px]">
                                {faculty}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspect Class Modal */}
      {inspectedClass && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Inspect Class Details"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setInspectedClass(null)}
        >
          <div
            className="neu-card border border-[var(--neu-shadow-dark)]/15 rounded-3xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  {inspectedClass.dayLabel} • {inspectedClass.slot.slot}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {inspectedClass.subject.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectedClass(null)}
                aria-label="Close"
                className="neu-btn w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Room & Faculty Details */}
            {(inspectedClass.slot.room || inspectedClass.subject.room || inspectedClass.slot.faculty || inspectedClass.subject.faculty) && (
              <div className="p-3.5 neu-inset rounded-xl space-y-1.5 text-xs">
                {(inspectedClass.slot.room || inspectedClass.subject.room) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Room / Hall:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {inspectedClass.slot.room || inspectedClass.subject.room}
                    </span>
                  </div>
                )}
                {(inspectedClass.slot.faculty || inspectedClass.subject.faculty) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Faculty:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {inspectedClass.slot.faculty || inspectedClass.subject.faculty}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Live Stats */}
            {(() => {
              const stats = calculateSubjectStats(
                inspectedClass.subject,
                records,
                settings.semesterEndDate,
                settings.holidays
              );
              const target = (inspectedClass.subject.threshold || settings.globalThreshold) * 100;
              const isSafe = stats.attendancePct >= target;

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="neu-flat-sm p-3 rounded-xl">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Attendance</span>
                      <span className={`text-base font-black ${isSafe ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {stats.attendancePct.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        Target: {Math.round(target)}%
                      </span>
                    </div>

                    <div className="neu-flat-sm p-3 rounded-xl">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Bunk Buffer</span>
                      <span className={`text-base font-black ${stats.bunkBudget >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                        {stats.bunkBudget >= 0 ? `${stats.bunkBudget} Safe` : `Need ${stats.classesNeededToRecover}`}
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        {stats.attendedCount}/{stats.totalClasses} sessions
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setInspectedClass(null)}
              className="neu-btn-primary w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableGrid;

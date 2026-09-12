import React, { useMemo } from 'react';
import type { AttendanceRecord } from '../lib/types';
import { calculateWeekdayStats } from '../lib/calculations';

interface Props {
  records: AttendanceRecord[];
}

export const DayOfWeekHeatmap: React.FC<Props> = ({ records }) => {
  const weekdayStats = useMemo(() => {
    return calculateWeekdayStats(records).filter(s => s.dayIndex !== 0); // Mon - Sat
  }, [records]);

  const bestDay = useMemo(() => {
    const active = weekdayStats.filter(s => s.total > 0);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => b.percentage - a.percentage)[0];
  }, [weekdayStats]);

  const worstDay = useMemo(() => {
    const active = weekdayStats.filter(s => s.total > 0);
    if (active.length === 0) return null;
    return [...active].sort((a, b) => a.percentage - b.percentage)[0];
  }, [weekdayStats]);

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Weekday Attendance Analytics
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
            Attendance patterns by day of the week
          </p>
        </div>
      </div>

      <div className="neu-card rounded-3xl p-5 space-y-5">
        {/* Heatmap Grid */}
        <div className="grid grid-cols-6 gap-2">
          {weekdayStats.map((item) => {
            const hasData = item.total > 0;
            const pct = item.percentage;
            let barColor = 'bg-slate-300/60 dark:bg-slate-700/60';
            let textColor = 'text-slate-400';

            if (hasData) {
              if (pct >= 85) {
                barColor = 'bg-gradient-to-t from-emerald-600 to-emerald-400';
                textColor = 'text-emerald-500';
              } else if (pct >= 75) {
                barColor = 'bg-gradient-to-t from-amber-600 to-amber-400';
                textColor = 'text-amber-500';
              } else {
                barColor = 'bg-gradient-to-t from-rose-600 to-rose-400';
                textColor = 'text-rose-500';
              }
            }

            return (
              <div
                key={item.dayIndex}
                className="neu-flat-sm p-3 rounded-2xl flex flex-col justify-between items-center text-center"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {item.shortName}
                </span>

                <div className="w-full neu-inset h-16 rounded-xl my-2 flex flex-col justify-end overflow-hidden p-1">
                  <div
                    style={{ height: hasData ? `${Math.max(15, pct)}%` : '6px' }}
                    className={`w-full rounded-md transition-all duration-500 shadow-xs ${barColor}`}
                  />
                </div>

                <div className="text-center">
                  <span className={`text-xs font-black block leading-tight ${textColor}`}>
                    {hasData ? `${pct.toFixed(0)}%` : '--'}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">
                    {item.attended}/{item.total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlight Insights */}
        {(bestDay || worstDay) && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            {bestDay && (
              <div className="neu-flat-sm p-3.5 rounded-2xl border border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-wider">Strongest Day</span>
                </div>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {bestDay.dayName} ({bestDay.percentage.toFixed(0)}%)
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {bestDay.attended} attended of {bestDay.total} sessions
                </p>
              </div>
            )}

            {worstDay && worstDay.total > 0 && worstDay.percentage < 85 && (
              <div className="neu-flat-sm p-3.5 rounded-2xl border border-amber-500/20">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-wider">Attendance Leak</span>
                </div>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {worstDay.dayName} ({worstDay.percentage.toFixed(0)}%)
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {worstDay.missed} missed lectures
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default DayOfWeekHeatmap;

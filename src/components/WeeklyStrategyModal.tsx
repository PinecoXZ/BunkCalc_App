import React, { useMemo } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats } from '../lib/calculations';

interface WeeklyStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyStrategyModal: React.FC<WeeklyStrategyModalProps> = ({ isOpen, onClose }) => {
  const { subjects } = useSubjects();
  const { records } = useAttendance();
  const { settings } = useSettings();

  const { subjectStrategies, totalClassesThisWeek, criticalCount, safeCount } = useMemo(() => {
    const totalClasses = subjects.reduce((sum, s) => {
      const multiplier = s.isLab ? 2 : 1;
      return sum + (s.schedule || []).length * multiplier;
    }, 0);

    const strategies = subjects.map((subject) => {
      const stats = calculateSubjectStats(subject, records, settings.semesterEndDate, settings.holidays);
      const multiplier = subject.isLab ? 2 : 1;
      const weeklySlotsCount = (subject.schedule || []).length;
      const sessionsThisWeek = weeklySlotsCount * multiplier;

      const thresholdPct = (subject.threshold || settings.globalThreshold) * 100;
      const isCritical = stats.bunkBudget < 0 || stats.attendancePct < thresholdPct;
      const isRisky = !isCritical && stats.bunkBudget <= 2;
      const isSafe = !isCritical && !isRisky;

      let advice: string;
      if (isCritical) {
        advice = `Must attend all ${sessionsThisWeek} classes! Need ${stats.classesNeededToRecover} consecutive classes to recover above ${Math.round(thresholdPct)}%.`;
      } else if (isRisky) {
        advice = `Only ${stats.bunkBudget} bunk(s) remaining. Recommended to attend all classes this week.`;
      } else {
        const safeToBunkThisWeek = Math.min(stats.bunkBudget, sessionsThisWeek);
        advice = `You have a comfortable buffer. Can safely skip up to ${safeToBunkThisWeek} class${safeToBunkThisWeek === 1 ? '' : 'es'} if needed.`;
      }

      return {
        subject,
        stats,
        sessionsThisWeek,
        isCritical,
        isRisky,
        isSafe,
        advice,
      };
    });

    const critical = strategies.filter(s => s.isCritical).length;
    const safe = strategies.filter(s => s.isSafe).length;

    return {
      subjectStrategies: strategies,
      totalClassesThisWeek: totalClasses,
      criticalCount: critical,
      safeCount: safe,
    };
  }, [subjects, records, settings]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="neu-card rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/60 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Weekly Bunk Strategy
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Smart game-plan for next 7 days ({totalClassesThisWeek} total classes)
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="neu-btn w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Overall summary banner */}
        <div className="p-4 bg-slate-500/5 flex gap-3 border-b border-slate-200/50 dark:border-slate-800/60">
          <div className="flex-1 p-3 rounded-2xl neu-inset text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Classes</span>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalClassesThisWeek}</p>
          </div>
          <div className="flex-1 p-3 rounded-2xl neu-inset text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Safe Subjects</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{safeCount}</p>
          </div>
          <div className="flex-1 p-3 rounded-2xl neu-inset text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">At Risk</span>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{criticalCount}</p>
          </div>
        </div>

        {/* Subject-wise breakdown */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
          {subjectStrategies.map(({ subject, stats, sessionsThisWeek, isCritical, isRisky, isSafe, advice }) => (
            <div
              key={subject.id}
              className="neu-flat-sm p-4 rounded-2xl space-y-2.5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isCritical ? 'bg-rose-500' : isRisky ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    {subject.name} {subject.isLab ? '(Lab)' : ''}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {sessionsThisWeek} classes this week &bull; Current: {stats.attendancePct.toFixed(1)}%
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isCritical
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : isRisky
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isCritical ? 'Must Attend' : isRisky ? 'Caution' : isSafe ? 'Safe' : 'Safe'}
                </span>
              </div>

              <div className="neu-inset p-3 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium">
                {advice}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/60">
          <button
            onClick={onClose}
            className="neu-btn-primary w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

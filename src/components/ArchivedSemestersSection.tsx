import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, AlertTriangle, ChevronRight, Trash, X } from 'reicon-react';
import type { ArchivedSemester } from '../lib/types';
import { calculateSubjectStats, parseLocalDate } from '../lib/calculations';
import { normalizeISODate } from '../lib/dateUtils';
import { registerBackHandler } from '../lib/backHandler';

interface ArchivedSemestersSectionProps {
  archivedSemesters: ArchivedSemester[];
  onDeleteSemester?: (semester: ArchivedSemester) => void;
  defaultThreshold?: number;
  title?: string;
}

export const ArchivedSemestersSection: React.FC<ArchivedSemestersSectionProps> = ({
  archivedSemesters,
  onDeleteSemester,
  defaultThreshold = 0.75,
  title = 'Previously Archived Semesters',
}) => {
  const [selectedSemester, setSelectedSemester] = useState<ArchivedSemester | null>(null);

  const sortedSemesters = useMemo(
    () => [...archivedSemesters].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)),
    [archivedSemesters]
  );

  useEffect(() => {
    if (!selectedSemester) return;
    const unregisterBack = registerBackHandler(() => {
      setSelectedSemester(null);
      return true;
    });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSemester(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unregisterBack();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSemester]);

  const selectedBreakdown = useMemo(() => {
    if (!selectedSemester) return null;

    const cleanEnd = normalizeISODate(selectedSemester.endDate);
    let totalAttended = 0;
    let totalConducted = 0;
    let subjectsMetTarget = 0;

    const subjectRows = selectedSemester.subjects.map((sub) => {
      const threshold = sub.threshold ?? defaultThreshold;
      const stats = calculateSubjectStats(sub, selectedSemester.records, cleanEnd, [], threshold);
      totalAttended += stats.attendedCount;
      totalConducted += stats.totalClasses;
      const metTarget = stats.attendancePct >= threshold * 100;
      if (metTarget) subjectsMetTarget += 1;

      return {
        subject: sub,
        stats,
        thresholdPct: Math.round(threshold * 100),
        metTarget,
      };
    });

    return {
      cleanEnd,
      totalAttended,
      totalConducted,
      subjectsMetTarget,
      subjectRows,
    };
  }, [selectedSemester, defaultThreshold]);

  if (sortedSemesters.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {title}
        </span>
        <span className="neu-flat-sm text-[10px] font-black text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full tabular-nums">
          {sortedSemesters.length} Saved
        </span>
      </div>

      <div className="space-y-2.5">
        {sortedSemesters.map((sem) => {
          const isSafe = sem.overallPct >= defaultThreshold * 100;
          const cleanEnd = normalizeISODate(sem.endDate);
          return (
            <div
              key={sem.id}
              className="neu-card rounded-2xl p-3.5 flex items-center justify-between gap-2.5 transition-all"
            >
              <button
                type="button"
                onClick={() => setSelectedSemester(sem)}
                className="flex-1 min-w-0 text-left flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="neu-flat-sm w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                  <Calendar size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{sem.name}</p>
                    <span
                      className={`neu-flat-sm text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                        isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {sem.overallPct.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {sem.subjects.length} subjects &bull; {sem.records.length} logs
                    {cleanEnd ? ` • Ended ${parseLocalDate(cleanEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
              </button>

              {onDeleteSemester && (
                <button
                  type="button"
                  onClick={() => onDeleteSemester(sem)}
                  aria-label={`Delete ${sem.name}`}
                  className="neu-btn text-rose-500 p-2.5 rounded-xl shrink-0 cursor-pointer"
                >
                  <Trash size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Detailed Archived Semester Modal */}
      {selectedSemester && selectedBreakdown && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archived-semester-detail-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedSemester(null)}
        >
          <div
            className="neu-card rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/60 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Archived Semester Details
                </span>
                <h3
                  id="archived-semester-detail-title"
                  className="text-lg font-black text-slate-900 dark:text-white truncate mt-0.5"
                >
                  {selectedSemester.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Archived {new Date(selectedSemester.archivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {selectedBreakdown.cleanEnd
                    ? ` • Ended ${parseLocalDate(selectedBreakdown.cleanEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSemester(null)}
                aria-label="Close semester details"
                className="neu-btn w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Summary KPIs */}
            <div className="p-4 grid grid-cols-3 gap-2.5 border-b border-slate-200/50 dark:border-slate-800/60">
              <div className="neu-inset rounded-2xl p-3 text-center">
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Overall
                </span>
                <span
                  className={`text-base font-black tabular-nums ${
                    selectedSemester.overallPct >= defaultThreshold * 100
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {selectedSemester.overallPct.toFixed(1)}%
                </span>
              </div>
              <div className="neu-inset rounded-2xl p-3 text-center">
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Attended
                </span>
                <span className="text-base font-black tabular-nums text-slate-900 dark:text-white">
                  {selectedBreakdown.totalAttended}
                  <span className="text-xs text-slate-400 font-bold">/{selectedBreakdown.totalConducted}</span>
                </span>
              </div>
              <div className="neu-inset rounded-2xl p-3 text-center">
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Cleared
                </span>
                <span className="text-base font-black tabular-nums text-blue-600 dark:text-blue-400">
                  {selectedBreakdown.subjectsMetTarget}
                  <span className="text-xs text-slate-400 font-bold">/{selectedSemester.subjects.length}</span>
                </span>
              </div>
            </div>

            {/* Subject Breakdown */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
                Subject Breakdown ({selectedSemester.subjects.length})
              </p>
              {selectedBreakdown.subjectRows.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                  No subjects saved in this archive.
                </p>
              ) : (
                selectedBreakdown.subjectRows.map(({ subject, stats, thresholdPct, metTarget }) => (
                  <div
                    key={subject.id}
                    className="neu-flat-sm rounded-2xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{subject.name}</p>
                        {subject.isLab && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                            Lab
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {stats.attendedCount}/{stats.totalClasses} attended &bull; Target {thresholdPct}%
                        {subject.credits ? ` • ${subject.credits} cr` : ''}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span
                        className={`text-sm font-black tabular-nums ${
                          metTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {stats.attendancePct.toFixed(1)}%
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[9px] font-black uppercase ${
                          metTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {metTarget ? <Check size={10} /> : <AlertTriangle size={10} />}
                        {metTarget ? 'Met' : 'Short'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/60">
              <button
                type="button"
                onClick={() => setSelectedSemester(null)}
                className="w-full neu-btn py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivedSemestersSection;

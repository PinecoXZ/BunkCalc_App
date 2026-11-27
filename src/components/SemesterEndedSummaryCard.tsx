import React, { useMemo, useState } from 'react';
import { Calendar, Check, Download, Plus, AlertTriangle } from 'reicon-react';
import type { AppSettings, AttendanceRecord, Subject } from '../lib/types';
import { calculateOverallStats, calculateSubjectStats, parseLocalDate } from '../lib/calculations';
import { normalizeISODate, toISODateStr } from '../lib/dateUtils';
import { exportToPDF } from '../lib/storage';
import { suppressAppLockTemporarily } from '../lib/appLockBridge';

interface SemesterEndedSummaryCardProps {
  subjects: Subject[];
  records: AttendanceRecord[];
  settings: AppSettings;
  onStartNewSemester: () => void;
  onUpdateEndDate: (nextEndDate: string) => Promise<void> | void;
  onModalMessage?: (title: string, message: string, type?: 'success' | 'error' | 'alert') => void;
  compact?: boolean;
}

export const SemesterEndedSummaryCard: React.FC<SemesterEndedSummaryCardProps> = ({
  subjects,
  records,
  settings,
  onStartNewSemester,
  onUpdateEndDate,
  onModalMessage,
  compact = false,
}) => {
  const [showExtendPicker, setShowExtendPicker] = useState(false);
  const [nextEndDate, setNextEndDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 14);
    return toISODateStr(future);
  });
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const cleanEndStr = normalizeISODate(settings.semesterEndDate);
  const formattedEndDate = useMemo(() => {
    if (!cleanEndStr) return 'Recently';
    return parseLocalDate(cleanEndStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [cleanEndStr]);

  const summary = useMemo(() => {
    const overall = calculateOverallStats(
      subjects,
      records,
      settings.semesterEndDate,
      settings.holidays,
      settings.globalThreshold
    );

    let clearedCount = 0;
    let bestSubject: { name: string; pct: number } | null = null;
    let lowestSubject: { name: string; pct: number } | null = null;

    subjects.forEach((subject) => {
      const stats = calculateSubjectStats(
        subject,
        records,
        settings.semesterEndDate,
        settings.holidays,
        settings.globalThreshold
      );
      const targetPct = (subject.threshold ?? settings.globalThreshold) * 100;
      if (stats.attendancePct >= targetPct) {
        clearedCount += 1;
      }
      if (!bestSubject || stats.attendancePct > bestSubject.pct) {
        bestSubject = { name: subject.name, pct: stats.attendancePct };
      }
      if (!lowestSubject || stats.attendancePct < lowestSubject.pct) {
        lowestSubject = { name: subject.name, pct: stats.attendancePct };
      }
    });

    const targetPct = settings.globalThreshold * 100;
    const isOverallSafe = overall.percentage >= targetPct;

    return {
      overall,
      clearedCount,
      belowTargetCount: Math.max(0, subjects.length - clearedCount),
      bestSubject: bestSubject as { name: string; pct: number } | null,
      lowestSubject: lowestSubject as { name: string; pct: number } | null,
      isOverallSafe,
      targetPct: Math.round(targetPct),
    };
  }, [subjects, records, settings.semesterEndDate, settings.holidays, settings.globalThreshold]);

  const minFutureDate = useMemo(() => {
    const today = new Date();
    return toISODateStr(today);
  }, []);

  const handleSaveExtendedDate = async () => {
    const clean = normalizeISODate(nextEndDate);
    if (!clean || clean < minFutureDate) {
      onModalMessage?.('Invalid End Date', 'Choose today or a future date to extend the current semester.', 'error');
      return;
    }
    setIsUpdatingDate(true);
    try {
      await onUpdateEndDate(clean);
      setShowExtendPicker(false);
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      suppressAppLockTemporarily();
      await exportToPDF();
    } catch {
      onModalMessage?.('Export Failed', 'Could not generate your final PDF report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="neu-card rounded-3xl p-5 mb-5 border border-blue-500/20 anim-fade-scale space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="neu-flat-sm w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
            <Calendar size={20} weight="Filled" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Semester Complete
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                Ended {formattedEndDate}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              Final Attendance Summary
            </h3>
          </div>
        </div>

        <span
          className={`neu-flat-sm px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 inline-flex items-center gap-1 ${
            summary.isOverallSafe
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {summary.isOverallSafe ? <Check size={12} /> : <AlertTriangle size={12} />}
          {summary.isOverallSafe ? 'Target Met' : `Below ${summary.targetPct}%`}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="neu-inset rounded-2xl p-3 text-center">
          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Final Score
          </span>
          <span
            className={`text-lg font-black tabular-nums ${
              summary.isOverallSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summary.overall.percentage.toFixed(1)}%
          </span>
        </div>

        <div className="neu-inset rounded-2xl p-3 text-center">
          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Attended
          </span>
          <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
            {summary.overall.totalAttended}
            <span className="text-xs font-bold text-slate-400">/{summary.overall.totalClasses}</span>
          </span>
        </div>

        <div className="neu-inset rounded-2xl p-3 text-center">
          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Cleared
          </span>
          <span className="text-lg font-black tabular-nums text-blue-600 dark:text-blue-400">
            {summary.clearedCount}
            <span className="text-xs font-bold text-slate-400">/{subjects.length}</span>
          </span>
        </div>
      </div>

      {!compact && summary.bestSubject && (
        <div className="neu-flat-sm rounded-2xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px]">
          <span className="text-slate-600 dark:text-slate-300 font-semibold truncate">
            Highest: <strong className="text-emerald-600 dark:text-emerald-400">{summary.bestSubject.name}</strong>{' '}
            <span className="tabular-nums">({summary.bestSubject.pct.toFixed(1)}%)</span>
          </span>
          {summary.belowTargetCount > 0 && summary.lowestSubject && (
            <span className="text-slate-500 dark:text-slate-400 font-semibold truncate">
              Lowest: <strong className="text-rose-600 dark:text-rose-400">{summary.lowestSubject.name}</strong>{' '}
              <span className="tabular-nums">({summary.lowestSubject.pct.toFixed(1)}%)</span>
            </span>
          )}
        </div>
      )}

      {/* Primary CTA & Secondary Actions */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={onStartNewSemester}
          className="w-full neu-btn-primary py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Archive &amp; Start New Semester</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="neu-btn py-2.5 px-3 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting...' : 'Export PDF Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExtendPicker((prev) => !prev)}
            className="neu-btn py-2.5 px-3 rounded-xl text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calendar size={14} />
            <span>{showExtendPicker ? 'Cancel' : 'Extend End Date'}</span>
          </button>
        </div>
      </div>

      {showExtendPicker && (
        <div className="neu-inset rounded-2xl p-3.5 space-y-2.5">
          <label
            htmlFor="extend-semester-date"
            className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            New Semester End Date
          </label>
          <div className="flex gap-2">
            <input
              id="extend-semester-date"
              type="date"
              min={minFutureDate}
              value={nextEndDate}
              onChange={(e) => setNextEndDate(e.target.value)}
              className="flex-1 neu-input rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-900 dark:text-white"
            />
            <button
              type="button"
              disabled={isUpdatingDate}
              onClick={handleSaveExtendedDate}
              className="neu-btn-primary px-4 py-2 rounded-xl text-xs font-black uppercase cursor-pointer disabled:opacity-50"
            >
              {isUpdatingDate ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterEndedSummaryCard;

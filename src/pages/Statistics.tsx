import React, { useState, useMemo } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats, getStatusBgColor, parseLocalDate } from '../lib/calculations';
import ShareModal from '../components/ShareModal';
import EmptyState from '../components/EmptyState';
import { AppModal } from '../components/AppModal';
import WeeklyChart from '../components/WeeklyChart';
import WhatIfSimulator from '../components/WhatIfSimulator';
import DayOfWeekHeatmap from '../components/DayOfWeekHeatmap';
import { registerBackHandler } from '../lib/backHandler';

interface Props {
  onOpenHistory: () => void;
}

const Statistics: React.FC<Props> = ({ onOpenHistory }) => {
  const { subjects } = useSubjects();
  const { records } = useAttendance();
  const streak = useAttendance((state) => state.getStreak());
  const { settings } = useSettings();
  const [showShareModal, setShowShareModal] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'error' } | null>(null);

  // Hardware Back Button listener
  React.useEffect(() => {
    if (!showShareModal && !modal) return;

    const unregister = registerBackHandler(() => {
      if (modal) {
        setModal(null);
        return true;
      }
      if (showShareModal) {
        setShowShareModal(false);
        return true;
      }
      return false;
    });

    return unregister;
  }, [showShareModal, modal]);

  const { totalAttended, totalPossible, overallPct, overallPeakPct, totalSafeBunks, subjectStatsMap } = useMemo(() => {
    let tAttended = 0;
    let tPossible = 0;
    let totalMaxAttended = 0;
    let totalPotentialTotal = 0;

    let totalSafeBunks = 0;
    const subjectStatsMap = new Map<string, ReturnType<typeof calculateSubjectStats>>();

    subjects.forEach((s) => {
      const stats = calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays);
      subjectStatsMap.set(s.id, stats);
      tAttended += stats.attendedCount;
      tPossible += stats.totalClasses;
      totalMaxAttended += stats.maxAttended;
      totalPotentialTotal += stats.potentialTotal;
      totalSafeBunks += Math.max(0, stats.bunkBudget);
    });

    const oPct = tPossible === 0 ? 100 : (tAttended / tPossible) * 100;
    const oPeakPct = totalPotentialTotal === 0 ? 100 : (totalMaxAttended / totalPotentialTotal) * 100;

    return {
      totalAttended: tAttended,
      totalPossible: tPossible,
      overallPct: oPct,
      overallPeakPct: oPeakPct,
      totalSafeBunks,
      subjectStatsMap,
    };
  }, [subjects, records, settings.semesterEndDate, settings.holidays]);

  // Show empty state if no records
  const hasAnyData = records.length > 0 || subjects.some(s => (s.attendedSoFar || 0) > 0 || (s.missedSoFar || 0) > 0);

  if (!hasAnyData) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-slate-500 dark:text-slate-400">Semester Projections</p>
        </header>
        <EmptyState 
          icon="stats"
          title="No Data Yet"
          subtitle="Start marking your attendance on the Today tab. Your stats and projections will appear here once you have some records."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-slate-500 dark:text-slate-400">Semester Projections</p>
        </div>
        <div className="flex gap-2 items-center">
          {streak >= 2 && (
            <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
              <span className="text-orange-500 text-xs font-black">{streak}-day streak</span>
            </div>
          )}
          <button 
            onClick={onOpenHistory}
            aria-label="View History"
            className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button 
            onClick={() => setShowShareModal(true)}
            aria-label="Share attendance summary"
            className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-transform text-blue-500 dark:text-blue-400 hover:border-blue-500/40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 text-white">
          <p className="text-blue-100 text-xs font-bold uppercase mb-2">Overall Attendance</p>
          <p className="text-5xl font-black mb-2">{overallPct.toFixed(1)}%</p>
          <div className="bg-white/20 inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase">
            {totalAttended} / {totalPossible} Classes
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      </div>

      <WeeklyChart records={records} threshold={settings.globalThreshold} />

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Projections</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold">Safe Bunk Budget</p>
              <span className="text-green-500 font-bold">Semester-Forward</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Based on your {subjects.length} subjects, you can skip a total of 
              <span className="text-slate-900 dark:text-white font-bold px-1">
                {totalSafeBunks}
              </span> 
              classes right now while staying above {Math.round(settings.globalThreshold * 100)}%.
            </p>
          </div>
          
          {/* Dual Target Honor Threshold */}
          {settings.targetThreshold && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-bold">Honor Target Goal ({Math.round(settings.targetThreshold * 100)}%)</p>
                <span className="text-xs font-black uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
                  Internal Honors
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                To reach {Math.round(settings.targetThreshold * 100)}% for internal grading marks, your current aggregate attendance is{' '}
                <span className={`font-bold ${overallPct >= settings.targetThreshold * 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {overallPct.toFixed(1)}%
                </span>.
              </p>
            </div>
          )}
          
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm font-bold mb-2">'Perfect Attendance' Goal</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              If you attend every single class from today until {settings.semesterEndDate ? parseLocalDate(settings.semesterEndDate).toLocaleDateString() : 'semester end'}, 
              your attendance will peak at <span className="text-blue-500 dark:text-blue-400 font-bold italic">~{overallPeakPct.toFixed(1)}%</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Weekday Analytics Heatmap */}
      <DayOfWeekHeatmap records={records} />

      <WhatIfSimulator />

      <section>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Subject breakdown</h2>
        <div className="space-y-3">
          {subjects.map((s) => {
            const stats = subjectStatsMap.get(s.id)!;
            return (
              <div key={s.id} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block">{s.name}</span>
                  <span className="text-[10px] text-slate-400">Budget: {stats.bunkBudget} bunks</span>
                </div>
                <div className={`text-xs font-black px-3 py-1 rounded-lg text-white ${getStatusBgColor(stats.attendancePct, s.threshold)}`}>
                  {stats.attendancePct.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        subjects={subjects}
        records={records}
      />

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText="OK"
          onConfirm={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default Statistics;

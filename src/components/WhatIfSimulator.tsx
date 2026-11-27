import React, { useState, useMemo } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import {
  calculateSubjectStats,
  calculateBunkBudget,
  calculateClassesNeededToRecover,
  getStatusColor,
} from '../lib/calculations';

const WhatIfSimulator: React.FC = () => {
  const { subjects } = useSubjects();
  const { records } = useAttendance();
  const { settings } = useSettings();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [bunkCount, setBunkCount] = useState<number>(1);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
  const activeSubjectId = selectedSubject?.id || '';

  const simulation = useMemo(() => {
    if (!selectedSubject) return null;

    const currentStats = calculateSubjectStats(
      selectedSubject,
      records,
      settings.semesterEndDate,
      settings.holidays,
      settings.globalThreshold
    );

    const multiplier = selectedSubject.isLab ? 2 : 1;
    const threshold = selectedSubject.threshold ?? settings.globalThreshold ?? 0.75;
    const maxRemainingClasses = selectedSubject.isLab
      ? Math.floor(currentStats.remainingClasses / 2)
      : currentStats.remainingClasses;
    const sliderMax = maxRemainingClasses > 0 ? maxRemainingClasses : 20;
    const effectiveBunkCount = Math.min(bunkCount, sliderMax);
    const bunkSessions = effectiveBunkCount * multiplier;

    const simTotalAttended = currentStats.attendedCount;
    const simTotalMissed = currentStats.absentCount + bunkSessions;
    const simTotalClasses = simTotalAttended + simTotalMissed;
    const simRemainingClasses = Math.max(0, currentStats.remainingClasses - bunkSessions);
    const simTotalSessions = Math.max(simTotalClasses, simTotalClasses + simRemainingClasses);
    let simBunkBudget = calculateBunkBudget(simTotalSessions, simTotalMissed, threshold, multiplier);
    if (!settings.semesterEndDate && simRemainingClasses === 0 && simBunkBudget > 0) {
      simBunkBudget = 0;
    }
    const simAttendancePct = simTotalClasses === 0 ? 100 : (simTotalAttended / simTotalClasses) * 100;

    const isBelowThreshold = simAttendancePct < (threshold * 100) || simBunkBudget < 0;

    const simClassesNeededToRecover = isBelowThreshold
      ? calculateClassesNeededToRecover(simTotalAttended, simTotalMissed, threshold, multiplier)
      : 0;

    const simulatedStats = {
      ...currentStats,
      attendedCount: simTotalAttended,
      absentCount: simTotalMissed,
      totalClasses: simTotalClasses,
      remainingClasses: simRemainingClasses,
      attendancePct: simAttendancePct,
      bunkBudget: simBunkBudget,
      safeBunks: Math.max(0, simBunkBudget),
      classesNeededToRecover: simClassesNeededToRecover,
    };

    return {
      currentStats,
      simulatedStats,
      isBelowThreshold,
      threshold,
      sliderMax,
      effectiveBunkCount,
    };
  }, [selectedSubject, records, settings, bunkCount]);

  if (subjects.length === 0) return null;

  const sliderMax = simulation?.sliderMax ?? 20;
  const effectiveBunkCount = simulation?.effectiveBunkCount ?? Math.min(bunkCount, sliderMax);

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          What-If Simulator
        </h2>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="neu-btn text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-xl cursor-pointer"
        >
          {isOpen ? 'Close' : 'Open Simulator'}
        </button>
      </div>

      {isOpen && (
        <div className="neu-card rounded-3xl overflow-hidden animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Scenario Builder</p>
            <h3 className="font-black text-xl">Predict Your Attendance</h3>
          </div>
          
          <div className="p-5 space-y-5">
            <div>
              <label htmlFor="whatif-subject-select" className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-2">
                Select Subject
              </label>
              <select 
                id="whatif-subject-select"
                value={activeSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="neu-input w-full rounded-2xl p-3 text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase">
                  {selectedSubject.isLab ? 'Labs to Skip' : 'Classes to Skip'}
                </label>
                <span className="neu-flat-sm px-3 py-1 rounded-xl text-xs font-black text-purple-600 dark:text-purple-400">
                  {effectiveBunkCount} {selectedSubject.isLab ? (effectiveBunkCount === 1 ? 'lab (2 hrs)' : 'labs') : (effectiveBunkCount === 1 ? 'class' : 'classes')}
                </span>
              </div>
              <div className="neu-inset p-2 rounded-2xl">
                <input 
                  type="range" 
                  min="1" 
                  max={sliderMax} 
                  value={effectiveBunkCount}
                  onChange={(e) => setBunkCount(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 cursor-pointer"
                  aria-valuemin={1}
                  aria-valuemax={sliderMax}
                  aria-valuenow={effectiveBunkCount}
                  aria-label={selectedSubject.isLab ? "Number of labs to skip" : "Number of classes to skip"}
                />
              </div>
            </div>

            {simulation && (
              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4">
                <div className="flex justify-between items-center gap-3">
                  <div className="neu-inset rounded-2xl p-3.5 text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current</p>
                    <p className={`text-2xl font-black ${getStatusColor(simulation.currentStats.attendancePct, simulation.threshold)}`}>
                      {simulation.currentStats.attendancePct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-slate-400 font-black text-lg">→</div>
                  <div className="neu-inset rounded-2xl p-3.5 text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">After Bunks</p>
                    <p className={`text-2xl font-black ${getStatusColor(simulation.simulatedStats.attendancePct, simulation.threshold)}`}>
                      {simulation.simulatedStats.attendancePct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className={`neu-flat-sm p-4 rounded-2xl border ${
                  simulation.isBelowThreshold 
                    ? 'border-rose-500/30' 
                    : 'border-emerald-500/30'
                }`}>
                  {simulation.isBelowThreshold ? (
                    <div>
                      <p className="text-rose-600 dark:text-rose-400 text-sm font-black flex items-center gap-1.5 mb-1">
                        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Danger Zone
                      </p>
                      <p className="text-xs text-rose-700/80 dark:text-rose-300/80 font-medium">
                        This drops you below {Math.round(simulation.threshold * 100)}%. 
                        You'll need to attend <span className="font-black underline">{simulation.simulatedStats.classesNeededToRecover}</span> {selectedSubject.isLab ? (simulation.simulatedStats.classesNeededToRecover === 1 ? 'lab' : 'labs') : (simulation.simulatedStats.classesNeededToRecover === 1 ? 'class' : 'classes')} consecutively to recover.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-emerald-600 dark:text-emerald-400 text-sm font-black flex items-center gap-1.5 mb-1">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Safe to Skip
                      </p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 font-medium">
                        You will still be above the required {Math.round(simulation.threshold * 100)}%. 
                        Remaining budget: <span className="font-black">{simulation.simulatedStats.bunkBudget}</span> {selectedSubject.isLab ? (simulation.simulatedStats.bunkBudget === 1 ? 'lab' : 'labs') : (simulation.simulatedStats.bunkBudget === 1 ? 'bunk' : 'bunks')}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default WhatIfSimulator;

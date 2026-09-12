import React, { useMemo } from 'react';
import type { Subject } from '../lib/types';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats } from '../lib/calculations';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Props {
  subject: Subject;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SubjectCard: React.FC<Props> = ({ subject, onClick, onEdit, onDelete }) => {
  const { records } = useAttendance();
  const { settings } = useSettings();
  const [showMenu, setShowMenu] = React.useState(false);
  const stats = useMemo(
    () => calculateSubjectStats(subject, records, settings.semesterEndDate, settings.holidays),
    [subject, records, settings.semesterEndDate, settings.holidays]
  );

  const isRecoveryMode = stats.bunkBudget < 0;
  const isSafe = stats.attendancePct >= (subject.threshold * 100);

  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const triggerHaptics = async (style: ImpactStyle) => {
    if (settings.hapticsEnabled) {
      try {
        await Haptics.impact({ style });
      } catch {
        // Safe fallback for web
      }
    }
  };

  const handleCardClick = async () => {
    await triggerHaptics(ImpactStyle.Light);
    onClick();
  };

  const handleMenuClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await triggerHaptics(ImpactStyle.Light);
    setShowMenu(!showMenu);
  };

  const handleAction = async (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setShowMenu(false);
    await triggerHaptics(ImpactStyle.Medium);
    action();
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`neu-card rounded-3xl p-5 active:scale-[0.985] transition-all duration-200 cursor-pointer relative overflow-hidden ${
        isRecoveryMode 
          ? 'border-rose-500/30' 
          : ''
      }`}
    >
      {/* Top Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-extrabold truncate text-slate-900 dark:text-white">
              {subject.name}
            </h3>
            {subject.isLab && (
              <span className="neu-flat-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0 border border-purple-500/20">
                Lab
              </span>
            )}
            {isRecoveryMode && (
              <span className="neu-flat-sm bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0 border border-rose-500/20">
                Recovery Needed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
              {subject.credits} Credits • {stats.remainingClasses} remaining
            </p>
            {subject.room && (
              <span className="neu-flat-sm text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                Room {subject.room}
              </span>
            )}
            {subject.faculty && (
              <span className="text-slate-400 text-[10px] font-medium truncate max-w-[120px]">
                {subject.faculty}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Attendance % Pill */}
          <div 
            className={`neu-flat-sm px-3 py-1 rounded-2xl text-xs font-black tracking-tight ${
              isSafe 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {stats.attendancePct.toFixed(1)}%
          </div>
          
          {/* Action Menu */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={handleMenuClick}
              className="neu-flat-sm w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              aria-label="Options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-36 neu-card rounded-2xl p-1.5 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <button 
                  onClick={(e) => handleAction(e, onEdit)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Subject
                </button>
                <button 
                  onClick={(e) => handleAction(e, onDelete)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recessed Progress Bar */}
      <div className="neu-inset h-2 rounded-full overflow-hidden my-3 p-0.5">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            isSafe 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
              : 'bg-gradient-to-r from-rose-500 to-amber-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, stats.attendancePct))}%` }}
        />
      </div>

      {/* Recessed Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="neu-inset rounded-2xl p-3">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            Attended
          </p>
          <p className="text-lg font-black text-slate-900 dark:text-white">
            {stats.attendedCount} <span className="text-xs text-slate-500 font-semibold">/ {stats.totalClasses}</span>
          </p>
        </div>

        <div className="neu-inset rounded-2xl p-3">
          {isRecoveryMode ? (
            <>
              <p className="text-rose-500 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider mb-1">
                Recover Next
              </p>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 leading-tight">
                {stats.classesNeededToRecover} <span className="text-xs font-bold">classes</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                Bunk Buffer
              </p>
              <p className={`text-lg font-black ${
                stats.bunkBudget > 2 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : stats.bunkBudget > 0 
                  ? 'text-amber-500 dark:text-amber-400' 
                  : 'text-slate-500'
              }`}>
                {stats.bunkBudget} <span className="text-xs font-bold">{stats.bunkBudget === 1 ? 'bunk' : 'bunks'}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectCard;

import React, { useMemo, useState } from 'react';
import type { Subject } from '../lib/types';
import { calculateSubjectStats, getStatusColor, parseLocalDate } from '../lib/calculations';
import { useAttendance } from '../store/useAttendance';
import { useSubjects } from '../store/useSubjects';
import { useSettings } from '../store/useSettings';
import { AppModal } from '../components/AppModal';
import SubjectModal from '../components/SubjectModal';
import { registerBackHandler } from '../lib/backHandler';

interface Props {
  subject: Subject;
  onBack: () => void;
}

const SubjectDetail: React.FC<Props> = ({ subject: initialSubject, onBack }) => {
  const { records, unmarkAttendance, markAttendance } = useAttendance();
  const { updateSubject, subjects } = useSubjects();
  const { settings } = useSettings();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const currentSubject = subjects.find(s => s.id === initialSubject.id) || initialSubject;

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Hardware Back Button listener
  React.useEffect(() => {
    if (!showEditModal && !modal) return;

    const unregister = registerBackHandler(() => {
      if (modal) {
        setModal(null);
        return true;
      }
      if (showEditModal) {
        setShowEditModal(false);
        return true;
      }
      return false;
    });

    return unregister;
  }, [showEditModal, modal]);
  
  const subjectRecords = useMemo(() => {
    return records
      .filter((r) => r.subjectId === currentSubject.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, currentSubject.id]);
  
  const projections = useMemo(() => calculateSubjectStats(currentSubject, records, settings.semesterEndDate, settings.holidays), [currentSubject, records, settings.semesterEndDate, settings.holidays]);

  return (
    <div className="min-h-screen bg-[var(--neu-bg)] text-slate-900 dark:text-white p-6 pb-28">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <button onClick={onBack} className="neu-btn p-2.5 rounded-2xl text-slate-700 dark:text-slate-200" aria-label="Go Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black truncate tracking-tight">{currentSubject.name}</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{currentSubject.credits} Credits • {currentSubject.schedule.length} classes/wk</p>
          </div>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="neu-btn flex items-center gap-1.5 px-3.5 py-2 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="neu-card rounded-3xl p-5">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2">Attendance</p>
          <p className={`text-3xl font-black tracking-tight ${getStatusColor(projections.attendancePct, currentSubject.threshold)}`}>
            {projections.attendancePct.toFixed(1)}%
          </p>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Goal: {Math.round(currentSubject.threshold * 100)}%</p>
        </div>
        <div className="neu-card rounded-3xl p-5">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2">Bunk Budget</p>
          <p className={`text-3xl font-black tracking-tight ${projections.bunkBudget >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {projections.bunkBudget > 0 ? `+${projections.bunkBudget}` : projections.bunkBudget}
          </p>
          <p className="text-[10px] text-slate-400 font-bold mt-1">{projections.bunkBudget >= 0 ? 'Safe classes' : 'Classes to recover'}</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3.5">Attendance Math</h2>
        <div className="space-y-3.5">
          {(projections.bunkBudget < 0 || projections.attendancePct < currentSubject.threshold * 100) && (
            <div className="neu-card rounded-3xl p-4.5 flex items-center gap-4 border-l-4 border-rose-500">
              <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center shrink-0 text-rose-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Recovery Mode</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Attend the next <span className="font-black text-rose-600 dark:text-rose-400 underline">{projections.classesNeededToRecover}</span> classes consecutively to reach {Math.round(currentSubject.threshold * 100)}%.
                </p>
              </div>
            </div>
          )}

          <div className="neu-card rounded-3xl p-4.5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center shrink-0 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Maximum Possible</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                If you attend all <span className="text-slate-900 dark:text-white font-bold">{projections.remainingClasses}</span> remaining classes, you'll reach <span className="text-blue-500 dark:text-blue-400 font-bold">{projections.maxPossiblePct.toFixed(1)}%</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3.5">History</h2>
        <div className="space-y-2.5">
          {subjectRecords.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-slate-600 py-8 text-sm italic font-medium">No records found for this subject.</p>
          ) : (
            subjectRecords.map((record) => (
              <div key={record.id} className="neu-flat-sm rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{parseLocalDate(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                  {record.status !== 'cancelled' ? (
                    <button 
                      onClick={() => markAttendance({ ...record, status: record.status === 'present' ? 'absent' : 'present' })}
                      className={`neu-inset flex items-center gap-1 text-[10px] font-black uppercase mt-1 px-2.5 py-1 rounded-xl transition-transform active:scale-95 ${
                        record.status === 'present' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {record.status}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  ) : (
                    <p className="text-[10px] font-bold uppercase text-slate-500 mt-1">
                      {record.status}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setModal({
                    isOpen: true,
                    title: "Delete Record",
                    message: `Delete attendance record for ${parseLocalDate(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}? This cannot be undone.`,
                    type: "confirm",
                    confirmText: "Delete",
                    cancelText: "Cancel",
                    onConfirm: () => {
                      unmarkAttendance(record.id);
                      setModal(null);
                    }
                  })}
                  className="neu-btn text-slate-400 hover:text-rose-500 p-2 rounded-xl"
                  aria-label="Delete Record"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      {showEditModal && (
        <SubjectModal
          subject={currentSubject}
          onSave={(updated) => {
            updateSubject(updated);
            setShowEditModal(false);
          }}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default SubjectDetail;

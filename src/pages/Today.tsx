import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import TodayList from '../components/TodayList';
import ShareModal from '../components/ShareModal';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { AppModal } from '../components/AppModal';
import { registerBackHandler } from '../lib/backHandler';
import { toISODateStr } from '../lib/dateUtils';

const Today: React.FC = () => {
  const { subjects } = useSubjects();
  const { records } = useAttendance();
  const { settings, addHoliday, deleteHoliday } = useSettings();
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

  const now = new Date();
  const todayDateStr = toISODateStr(now);
  const todayHoliday = settings.holidays?.find(h => todayDateStr >= h.startDate && todayDateStr <= h.endDate);

  return (
    <div className="min-h-screen bg-transparent text-slate-800 dark:text-slate-100 p-5 pb-28">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Today</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Mark your attendance</p>
        </div>
        <button 
          onClick={() => setShowShareModal(true)}
          aria-label="Share attendance summary"
          className="neu-btn w-10 h-10 rounded-2xl flex items-center justify-center text-blue-500 hover:scale-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </header>

      {todayHoliday ? (
        <div className="mb-6 neu-card rounded-3xl p-4.5 border-amber-500/30 flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <div className="neu-flat-sm w-11 h-11 rounded-2xl flex items-center justify-center text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-600 dark:text-amber-400 font-extrabold text-sm">Today is a Holiday</p>
              <p className="text-amber-600/80 dark:text-amber-400/80 text-xs font-medium">{todayHoliday.name || 'Academic Holiday'} • No classes scheduled</p>
            </div>
          </div>
          <button 
            onClick={() => deleteHoliday(todayHoliday.id)}
            className="neu-btn text-xs font-bold text-amber-600 dark:text-amber-400 px-3.5 py-1.5 rounded-xl cursor-pointer"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => addHoliday({ id: uuidv4(), name: 'Holiday', startDate: todayDateStr, endDate: todayDateStr })}
          className="mb-6 w-full neu-card rounded-3xl p-4 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 cursor-pointer active:scale-[0.99] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-extrabold text-sm">Mark Today as Holiday</span>
        </button>
      )}

      <section>
        <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Daily Schedule</h2>
        <TodayList />
      </section>
      
      <div className="mt-8 neu-card rounded-3xl p-4.5">
        <p className="text-blue-500 dark:text-blue-400 text-xs font-black mb-1 uppercase tracking-wider">Attendance Tip</p>
        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed font-medium">
          Marking attendance here updates your "Bunk Budget" in real-time. 
          Use 'Cancel' for cancelled classes to exclude them from calculations.
        </p>
      </div>

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

export default Today;

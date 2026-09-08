import React, { useState } from 'react';
import { useSubjects } from '../store/useSubjects';
import { TimetableScannerModal } from './TimetableScannerModal';
import { TimetableExportTab } from './timetable/TimetableExportTab';
import { TimetableImportTab } from './timetable/TimetableImportTab';

interface TimetableShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'export' | 'import';
  initialImportCode?: string;
}

export const TimetableShareModal: React.FC<TimetableShareModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'export',
  initialImportCode = ''
}) => {
  const { subjects, addSubject } = useSubjects();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Timetable Sharing"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Class Timetable Share</span>
            </h2>
            <p className="text-xs text-slate-500">Share or import class section schedules in 1 click</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            onClick={() => { setActiveTab('export'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share Timetable</span>
          </button>
          <button
            onClick={() => { setActiveTab('import'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import Timetable</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {successMessage}
            </div>
          )}

          {activeTab === 'export' ? (
            <TimetableExportTab
              subjects={subjects}
              onError={setErrorMessage}
              onSuccess={setSuccessMessage}
            />
          ) : (
            <TimetableImportTab
              initialImportCode={initialImportCode}
              onApplySuccess={onClose}
              onError={setErrorMessage}
              onSuccess={setSuccessMessage}
              onOpenScanner={() => setShowScannerModal(true)}
            />
          )}
        </div>
      </div>

      {/* OCR Scanner Modal */}
      <TimetableScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onApplySubjects={(scanned) => {
          scanned.forEach(s => addSubject(s));
          setSuccessMessage(`Imported ${scanned.length} courses!`);
          setTimeout(() => {
            setSuccessMessage('');
            onClose();
          }, 1500);
        }}
      />
    </div>
  );
};

import React, { useState } from 'react';
import type { ArchivedSemester } from '../../lib/types';
import SubHeader from './SubHeader';
import { exportAppState, clearAllStorage, importAppState, exportToCSV, exportToPDF } from '../../lib/storage';

interface DataSettingsProps {
  archivedSemesters: ArchivedSemester[];
  deleteArchivedSemester: (id: string) => Promise<void>;
  onBack: () => void;
  onOpenArchiveModal: () => void;
  onShowModal: (modal: {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
}

export const DataSettings: React.FC<DataSettingsProps> = ({
  archivedSemesters,
  deleteArchivedSemester,
  onBack,
  onOpenArchiveModal,
  onShowModal,
}) => {
  const [showArchivedList, setShowArchivedList] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    if (file) {
      onShowModal({
        isOpen: true,
        title: "Overwrite Data",
        message: "Importing data will overwrite your current settings and attendance. Continue?",
        type: "confirm",
        confirmText: "Overwrite",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            await importAppState(file);
            inputElement.value = '';
            onShowModal({
              isOpen: true,
              title: "Data Restored",
              message: "Data restored successfully! Please restart the app.",
              type: "success",
              confirmText: "OK",
              onConfirm: () => {
                window.location.reload();
              }
            });
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            onShowModal({
              isOpen: true,
              title: "Import Failed",
              message: errorMsg || "Failed to import data. Please ensure the file is a valid BunkCalc backup.",
              type: "error",
              confirmText: "OK",
              onConfirm: () => {}
            });
          }
        },
        onCancel: () => {}
      });
    }
  };

  const handleReset = async () => {
    onShowModal({
      isOpen: true,
      title: "Factory Reset",
      message: "This will permanently delete ALL your subjects, attendance records, and settings. This action cannot be undone.\n\nAre you sure you want to reset?",
      type: "confirm",
      confirmText: "Reset",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await clearAllStorage();
          window.location.reload();
        } catch {
          onShowModal({
            isOpen: true,
            title: "Reset Failed",
            message: "Failed to reset app data. Please try again.",
            type: "error",
            confirmText: "OK",
            onConfirm: () => {}
          });
        }
      },
      onCancel: () => {}
    });
  };

  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="Data, Backup & Export"
        subtitle="Backup, CSV/PDF logs, share code & reset"
        onBack={onBack}
      />

      <div className="grid grid-cols-3 gap-3.5">
        <button 
          onClick={exportAppState}
          className="neu-btn p-4 rounded-2xl flex flex-col items-center gap-2"
        >
          <div className="w-10 h-10 rounded-xl neu-inset flex items-center justify-center text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h10a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Backup</span>
        </button>
        
        <label className="neu-btn p-4 rounded-2xl flex flex-col items-center gap-2 cursor-pointer text-center">
          <div className="w-10 h-10 rounded-xl neu-inset flex items-center justify-center text-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h10a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Restore</span>
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>

        <button 
          onClick={handleReset}
          className="neu-btn p-4 rounded-2xl flex flex-col items-center gap-2 text-rose-500"
        >
          <div className="w-10 h-10 rounded-xl neu-inset flex items-center justify-center text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-xs font-bold text-rose-500">Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <button 
          onClick={exportToCSV}
          className="neu-btn p-4 rounded-2xl flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-xl neu-inset flex items-center justify-center text-emerald-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Export CSV</span>
        </button>
        
        <button 
          onClick={exportToPDF}
          className="neu-btn p-4 rounded-2xl flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-xl neu-inset flex items-center justify-center text-rose-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Export PDF</span>
        </button>
      </div>

      {/* Archive Semester Button */}
      <button 
        onClick={onOpenArchiveModal}
        className="w-full neu-btn p-4 rounded-3xl flex items-center justify-center gap-3 text-purple-600 dark:text-purple-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <span className="text-sm font-bold">Archive Current Semester</span>
      </button>

      {/* Archived Semesters */}
      {archivedSemesters.length > 0 && (
        <div>
          <button 
            onClick={() => setShowArchivedList(!showArchivedList)}
            className="w-full neu-card p-4.5 rounded-3xl flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Archived Semesters ({archivedSemesters.length})</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform ${showArchivedList ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showArchivedList && (
            <div className="mt-3 space-y-2.5">
              {archivedSemesters.map(sem => (
                <div key={sem.id} className="neu-flat-sm rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{sem.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {sem.subjects.length} subjects • {sem.records.length} records • {sem.overallPct.toFixed(1)}% overall
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Archived {new Date(sem.archivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      onShowModal({
                        isOpen: true,
                        title: "Delete Semester",
                        message: `Are you sure you want to delete archived semester "${sem.name}"? This action cannot be undone.`,
                        type: "confirm",
                        confirmText: "Delete",
                        cancelText: "Cancel",
                        onConfirm: () => {
                          deleteArchivedSemester(sem.id);
                        },
                        onCancel: () => {}
                      });
                    }}
                    className="neu-btn text-rose-500 p-2.5 rounded-xl"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataSettings;


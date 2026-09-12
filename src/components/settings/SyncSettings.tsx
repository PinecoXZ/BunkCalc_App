import React from 'react';
import type { Subject, AppSettings, AttendanceRecord } from '../../lib/types';
import SubHeader from './SubHeader';

interface SyncSettingsProps {
  subjects: Subject[];
  settings: AppSettings;
  records: AttendanceRecord[];
  onBack: () => void;
  onShowModal: (modal: {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    onConfirm: () => void;
  }) => void;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({
  subjects,
  settings,
  records,
  onBack,
  onShowModal,
}) => {
  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="Calendar Sync & Widgets"
        subtitle="Export schedule to external calendars & Android widgets"
        onBack={onBack}
      />

      <div className="neu-card rounded-3xl p-5 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-inset flex items-center justify-center text-purple-500 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">External Calendar Exporter</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
              Export your full recurring timetable into Google Calendar, Apple Calendar, or Outlook with classroom locations and holiday break exclusions.
            </p>
          </div>
        </div>

        <div className="neu-inset p-4.5 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">Export to Calendar (.ics)</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              RFC 5545 iCalendar standard format
            </p>
          </div>
          <button 
            onClick={async () => {
              const { exportTimetableToICS } = await import('../../lib/icsExporter');
              const res = await exportTimetableToICS(subjects, settings);
              if (res.success) {
                onShowModal({
                  isOpen: true,
                  title: "Calendar Exported",
                  message: "Your semester class timetable and break schedule were exported as an .ics file.",
                  type: "success",
                  confirmText: "Done",
                  onConfirm: () => {},
                });
              }
            }}
            className="neu-btn px-4 py-2.5 rounded-xl text-purple-600 dark:text-purple-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Export .ics</span>
          </button>
        </div>
      </div>

      {/* Android Home Screen Widget Integration */}
      <div className="neu-card rounded-3xl p-5 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-inset flex items-center justify-center text-blue-500 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Android Lock Screen & Widget Cache</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
              BunkCalc continuously caches attendance telemetry into local key <code className="neu-inset px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">bunkcalc_widget_data</code> for fast Android AppWidgets and lock screen glanceables.
            </p>
          </div>
        </div>

        <div className="neu-inset p-4.5 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Live Widget Status</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {subjects.length} courses tracked • Synchronized
              </span>
            </div>
          </div>
          <button 
            onClick={async () => {
              const { syncWidgetData } = await import('../../lib/widgetData');
              await syncWidgetData(subjects, records, settings);
              onShowModal({
                isOpen: true,
                title: "Widget Data Synced",
                message: "Latest attendance percentages, safe bunk buffers, and class timings were refreshed in local cache.",
                type: "success",
                confirmText: "OK",
                onConfirm: () => {},
              });
            }}
            className="neu-btn px-3.5 py-2 rounded-xl text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider"
          >
            Sync Cache
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncSettings;


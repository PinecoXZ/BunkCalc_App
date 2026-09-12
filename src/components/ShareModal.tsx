import React, { useState } from 'react';
import type { Subject, AttendanceRecord, ShareCardTheme } from '../lib/types';
import ShareCard from './ShareCard';
import { shareAttendanceCard } from '../lib/shareCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  records: AttendanceRecord[];
}

const THEME_OPTIONS: Array<{ id: ShareCardTheme; label: string; description: string }> = [
  { id: 'meme', label: 'Wrapped 💀', description: 'Viral reality check & student rank tier' },
  { id: 'neon', label: 'Neon Cyber', description: 'Vibrant gradients & glowing telemetry' },
  { id: 'oled', label: 'Dark Soft', description: 'Deep soft dark & high contrast' },
  { id: 'academic', label: 'Academic', description: 'Formal university report card' },
  { id: 'terminal', label: 'Terminal', description: 'Retro monospace CLI interface' },
];

export const ShareModal: React.FC<Props> = ({ isOpen, onClose, subjects, records }) => {
  const [selectedTheme, setSelectedTheme] = useState<ShareCardTheme>('meme');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShare = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setTimeout(async () => {
      try {
        const res = await shareAttendanceCard();
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to generate share image.');
        } else {
          onClose();
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setErrorMessage(errorMsg || 'Error creating share image.');
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Attendance Card"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="neu-card rounded-3xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4.5 border-b border-slate-200/50 dark:border-slate-800/60 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl neu-inset flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Share Attendance Card</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Select template style & export PNG</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="neu-btn p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme Selector Tabs */}
        <div className="grid grid-cols-5 gap-1.5 p-2.5 neu-inset mx-4 my-3 rounded-2xl">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`py-2 px-1 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'neu-card text-blue-600 dark:text-blue-400 font-black scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider truncate">{theme.label}</p>
              </button>
            );
          })}
        </div>

        {/* Card Live Scaled Preview */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center neu-inset mx-4 mb-3 rounded-2xl overflow-y-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200/40 dark:border-slate-800/60 origin-center scale-[0.68] sm:scale-[0.75] my-[-60px] sm:my-[-40px]">
            <ShareCard subjects={subjects} records={records} theme={selectedTheme} />
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border-t border-rose-500/30 text-rose-500 text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/60 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isExporting}
            className="flex-1 py-3.5 rounded-2xl neu-btn-primary disabled:opacity-50 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            {isExporting ? 'Generating...' : 'Export & Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;


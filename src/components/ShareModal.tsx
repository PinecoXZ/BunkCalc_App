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
  { id: 'neon', label: 'Neon Cyber', description: 'Vibrant gradients & glowing telemetry' },
  { id: 'oled', label: 'OLED Dark', description: 'Deep #000000 black & high contrast' },
  { id: 'academic', label: 'Academic', description: 'Formal university report card' },
  { id: 'terminal', label: 'Terminal', description: 'Retro monospace CLI interface' },
];

export const ShareModal: React.FC<Props> = ({ isOpen, onClose, subjects, records }) => {
  const [selectedTheme, setSelectedTheme] = useState<ShareCardTheme>('neon');
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
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Share Attendance Card</h2>
              <p className="text-[11px] text-slate-400">Select template style & export PNG</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-3 bg-slate-950/40 border-b border-slate-800">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`py-2 px-1 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white font-bold'
                }`}
              >
                <p className="text-[11px] uppercase tracking-wider">{theme.label}</p>
              </button>
            );
          })}
        </div>

        {/* Card Live Scaled Preview */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-950/60 overflow-y-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 origin-center scale-[0.68] sm:scale-[0.75] my-[-60px] sm:my-[-40px]">
            <ShareCard subjects={subjects} records={records} theme={selectedTheme} />
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border-t border-red-500/30 text-red-400 text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isExporting}
            className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95"
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


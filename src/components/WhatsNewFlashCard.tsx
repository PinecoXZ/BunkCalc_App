import React, { useEffect } from 'react';
import { APP_VERSION_NAME } from '../lib/constants';
import { registerBackHandler } from '../lib/backHandler';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsNewFlashCard: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    });
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      unregister();
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300"
    >
      <div className="neu-card rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[var(--neu-shadow-dark)]/15">
        {/* Header */}
        <div className="p-5 border-b border-[var(--neu-shadow-dark)]/10 flex justify-between items-center bg-[var(--neu-surface)]">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="whats-new-title" className="text-lg font-black text-slate-900 dark:text-white">
                What's New in BunkCalc
              </h2>
              <span className="neu-inset px-2.5 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase">
                v{APP_VERSION_NAME}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Welcome to the latest update built by PinecoXZ
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="neu-btn w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Feature list */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
          <div className="neu-flat-sm p-3.5 rounded-2xl border border-blue-500/20">
            <p className="font-bold text-blue-600 dark:text-blue-400 text-sm mb-1">
              End-of-Semester Summary &amp; Archive Insights (v2.2.7)
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Once a semester ends, get a final attendance wrap-up with PDF export, end-date extension, and 1-tap transition to a new term—plus full subject breakdowns for archived semesters right inside Setup.
            </p>
          </div>

          <div className="neu-flat-sm p-3.5 rounded-2xl border border-indigo-500/20">
            <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mb-1">
              Multi-Slot Tracking &amp; Security Hardening
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Independent slot-level tracking on multi-class days, PBKDF2 PIN hashing with lockout protection, and multi-page PDF attendance report generation.
            </p>
          </div>

          <div className="neu-flat-sm p-3.5 rounded-2xl border border-emerald-500/20">
            <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-1">
              Auto-Update Engine &amp; Batch Performance
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Multi-tiered update detection with GitHub release integration, atomic batch state mutations, and 1-tap &ldquo;Mark All Present&rdquo; sync.
            </p>
          </div>

          <div className="neu-flat-sm p-3.5 rounded-2xl border border-purple-500/20">
            <p className="font-bold text-purple-600 dark:text-purple-400 text-sm mb-1">
              Frosted Glass UI &amp; Status Stripes
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Refined Light Mode with clean frosted glassmorphism, instant visual left-border status stripes on cards, compact semester progress, and staggered entrance animations.
            </p>
          </div>

          <div className="neu-flat-sm p-3.5 rounded-2xl">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Zero-Latency Navigation
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Instant, hardware-accelerated bottom navigation with spring micro-interactions and non-blocking haptic feedback.
            </p>
          </div>

          <div className="neu-flat-sm p-3.5 rounded-2xl">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Mid-Semester Past Attendance Input
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Joined mid-semester? Enter past attended and missed class numbers during setup or edit them anytime in Subject Details.
            </p>
          </div>

          <div className="neu-flat-sm p-3.5 rounded-2xl">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Interactive Holiday Manager
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Manage semester breaks and exams directly with automated reminder rescheduling and streak protection.
            </p>
          </div>

          <div className="neu-flat-sm p-3.5 rounded-2xl">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Weekly Bunk Strategy &amp; Simulator
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Simulate future attendance scenarios and view the exact recovery streaks needed to stay above your threshold.
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-[var(--neu-shadow-dark)]/10 bg-[var(--neu-surface)]">
          <button
            onClick={onClose}
            className="neu-btn-primary w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Explore BunkCalc v{APP_VERSION_NAME}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';

interface Props {
  subjectName: string;
  status: 'present' | 'absent' | 'cancelled';
  onUndo: () => void;
  onDismiss: () => void;
}

const statusConfig: Record<Props['status'], { label: string; color: string; progressColor: string }> = {
  present: { label: 'Present', color: 'text-green-500', progressColor: 'bg-green-500' },
  absent: { label: 'Absent', color: 'text-red-500', progressColor: 'bg-red-500' },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', progressColor: 'bg-slate-400' },
};

const UndoToast: React.FC<Props> = ({ subjectName, status, onUndo, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { label, color, progressColor } = statusConfig[status];

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onDismiss]);

  const handleUndo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onUndo();
    onDismiss();
  };

  return (
    <>
      <style>{`
        @keyframes undoToastSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes undoToastProgressShrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>

      <div
        className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto"
        style={{
          animation: 'undoToastSlideUp 0.3s ease-out forwards',
        }}
        role="alert"
        aria-live="assertive"
      >
        <div className="relative neu-card border border-[var(--neu-shadow-dark)]/25 rounded-2xl p-4 overflow-hidden">
          {/* Content row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-800 dark:text-slate-100 flex-1 min-w-0">
              Marked{' '}
              <span className="font-bold text-slate-900 dark:text-white truncate">{subjectName}</span>
              {' '}as{' '}
              <span className={`font-black ${color}`}>{label}</span>
            </p>

            <button
              onClick={handleUndo}
              className="neu-btn text-blue-600 dark:text-blue-400 font-black uppercase text-xs shrink-0 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              aria-label="Undo action"
            >
              Undo
            </button>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--neu-inset-dark)]/20">
            <div
              className={`h-full rounded-b-2xl ${progressColor}`}
              style={{
                animation: 'undoToastProgressShrink 4s linear forwards',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default UndoToast;

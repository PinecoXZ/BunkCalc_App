import React, { useEffect } from 'react';

import { useSettings } from '../store/useSettings';

interface Props {
  type: 'present' | 'absent' | null;
  onDone: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#10b981'];

const STATIC_PARTICLES: Particle[] = Array.from({ length: 45 }).map((_, i) => ({
  id: i,
  x: (i * 37) % 100,
  y: -10 - ((i * 13) % 20),
  size: 6 + (i % 8),
  color: COLORS[i % COLORS.length],
  rotation: (i * 73) % 360,
}));

const PRESENT_MEMES = [
  'Academic Weapon 🗿',
  'The professor noticed you exist ✨',
  'GigaChad Behavior 🗿',
  '75% Safe Haven Secured 🛡️',
  'Attendance Locked In 🔒',
];

const ABSENT_MEMES = [
  'Class sacrificed for a good cause 💀',
  'The professor noticed an empty chair 📉',
  'Living on the edge 🔥',
  'May the 75% gods protect you 🙏',
  'Attendance down, sleep up 😴',
];

const CelebrationOverlay: React.FC<Props> = ({ type, onDone }) => {
  const toneMode = useSettings((state) => state.settings.toneMode);
  const [memeText] = React.useState<string | null>(() => {
    if (toneMode !== 'meme' || !type) return null;
    const pool = type === 'present' ? PRESENT_MEMES : ABSENT_MEMES;
    return pool[Math.floor(Math.random() * pool.length)];
  });

  useEffect(() => {
    if (!type) return;

    const timer = setTimeout(() => {
      onDone();
    }, 1600);

    return () => clearTimeout(timer);
  }, [type, onDone]);

  if (!type) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden flex items-center justify-center">
      {type === 'present' && (
        <>
          {/* Confetti particles */}
          {STATIC_PARTICLES.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size * 1.4}px`,
                backgroundColor: p.color,
                borderRadius: '2px',
                transform: `rotate(${p.rotation}deg)`,
                animation: `confettiFall 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
              }}
            />
          ))}

          {/* Central Present Celebration Toast */}
          <div className="bg-emerald-600 text-white font-black px-6 py-3 rounded-full shadow-2xl border-2 border-emerald-300 animate-in zoom-in-50 fade-in duration-200 flex items-center gap-2 text-sm tracking-wider uppercase">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <span>{memeText || 'Class Attended'}</span>
          </div>
        </>
      )}

      {type === 'absent' && (
        <div className="inset-0 absolute bg-red-500/20 animate-pulse border-4 border-red-500/50 rounded-none flex items-center justify-center pointer-events-none">
          <div className="bg-red-600 text-white font-black px-6 py-3 rounded-full shadow-2xl border-2 border-red-300 animate-in zoom-in-50 fade-in duration-200 flex items-center gap-2 text-sm tracking-wider uppercase">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{memeText || 'Absent Logged'}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default CelebrationOverlay;

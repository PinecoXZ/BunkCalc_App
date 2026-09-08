import React, { useState, useRef, useCallback } from 'react';

interface Props {
  onComplete: () => void;
}

interface Slide {
  iconType: 'book' | 'target' | 'bell';
  title: string;
  subtitle: string;
  badge?: string;
  cta?: string;
}

const slides: Slide[] = [
  {
    iconType: 'book',
    title: 'Welcome to BunkCalc',
    subtitle:
      'Your offline attendance tracker. Zero internet needed. 100% private.',
    badge: 'Made for Indian Students',
  },
  {
    iconType: 'target',
    title: 'Smart Bunk Budget',
    subtitle:
      'Know exactly how many classes you can safely skip while staying above your attendance threshold.',
  },
  {
    iconType: 'bell',
    title: 'Never Get Debarred',
    subtitle:
      'Get timely reminders before class starts and instant alerts when your attendance drops dangerously low.',
    cta: 'Get Started',
  },
];

const OnboardingCarousel: React.FC<Props> = ({ onComplete }) => {
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Pointer / swipe tracking refs
  const pointerDown = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const lockedAxis = useRef<'x' | 'y' | null>(null);

  // Fade-in on mount
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ── pointer handlers ─────────────────────────────── */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointerDown.current = true;
      startX.current = e.clientX;
      startY.current = e.clientY;
      lockedAxis.current = null;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDown.current) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      // Lock axis after a small threshold to distinguish scroll vs swipe
      if (lockedAxis.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        lockedAxis.current = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }

      if (lockedAxis.current === 'x') {
        setDragOffset(dx);
      }
    },
    [],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDown.current) return;
      pointerDown.current = false;

      const dx = e.clientX - startX.current;
      const threshold = 60;

      if (lockedAxis.current === 'x') {
        if (dx < -threshold && active < slides.length - 1) {
          setActive((prev) => prev + 1);
        } else if (dx > threshold && active > 0) {
          setActive((prev) => prev - 1);
        }
      }

      setDragOffset(0);
      lockedAxis.current = null;
    },
    [active],
  );

  /* ── render ───────────────────────────────────────── */

  const translateX = -(active * 100);
  const dragPct =
    dragOffset !== 0 ? (dragOffset / window.innerWidth) * 100 : 0;

  return (
    <div
      className={`
        h-screen overflow-hidden w-full bg-slate-950 flex flex-col select-none
        transition-opacity duration-700 ease-out
        ${mounted ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ touchAction: 'pan-y' }}
    >
      {/* ── slide track ─────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden relative"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(${translateX + dragPct}%)`,
            transition: dragOffset !== 0 ? 'none' : 'transform 0.45s cubic-bezier(.4,0,.2,1)',
          }}
        >
          {slides.map((slide, idx) => (
            <div
              key={idx}
              role="tabpanel"
              aria-roledescription="slide"
              aria-live="polite"
              className="w-full flex-shrink-0 flex flex-col items-center justify-between px-8 py-10 text-center relative h-full"
            >
              {/* Top Spacer to keep content centered */}
              <div className="h-16 flex-shrink-0" />

              {/* Middle Content */}
              <div className="flex-1 flex flex-col items-center justify-center max-w-xs">
                {/* Decorative vector icon */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 -m-6 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-3xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-2xl shadow-blue-500/20">
                    {slide.iconType === 'book' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    )}
                    {slide.iconType === 'target' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    {slide.iconType === 'bell' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Badge */}
                {slide.badge && (
                  <span className="inline-block mb-4 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 rounded-full ring-1 ring-blue-500/20">
                    {slide.badge}
                  </span>
                )}

                {/* Title */}
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
                  {slide.title}
                </h2>

                {/* Subtitle */}
                <p className="text-slate-400 text-sm leading-relaxed">
                  {slide.subtitle}
                </p>
              </div>

              {/* Bottom Action / Swipe Hint */}
              <div className="h-24 w-full flex items-center justify-center flex-shrink-0">
                {slide.cta ? (
                  <button
                    onClick={onComplete}
                    className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 active:scale-[0.97] text-white font-black uppercase text-sm tracking-wider py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all duration-200"
                  >
                    {slide.cta}
                  </button>
                ) : (
                  /* Premium jumping/bouncing swipe hint */
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer animate-bounce">
                    <span className="text-[10px] font-black tracking-widest uppercase text-blue-400/80">
                      Swipe to continue
                    </span>
                    <div className="flex items-center justify-center bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-full w-10 h-10 shadow-lg shadow-black/30 transition-colors">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── dot indicators ──────────────────────────── */}
      <div 
        role="tablist"
        className="flex items-center justify-center gap-2 pb-10 pt-4 flex-shrink-0"
      >
        {slides.map((_, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={idx === active}
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => setActive(idx)}
            className={`
              h-2 rounded-full transition-all duration-300 ease-out
              ${
                idx === active
                  ? 'w-8 bg-blue-500'
                  : 'w-2 bg-slate-700 hover:bg-slate-600'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
};

export default OnboardingCarousel;

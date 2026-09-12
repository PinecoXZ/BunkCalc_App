import React, { useEffect, useState } from 'react';

interface BunkMeterProps {
  percentage: number;
  safeBunksTotal: number;
  classesNeededTotal?: number;
  totalClasses?: number;
  totalAttended?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showDetails?: boolean;
}

export const BunkMeter: React.FC<BunkMeterProps> = ({
  percentage,
  safeBunksTotal,
  classesNeededTotal = 0,
  totalClasses = 0,
  totalAttended = 0,
  size = 180,
  strokeWidth = 14,
  label = "Overall Health",
  showDetails = true
}) => {
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, percentage));
    const timer = setTimeout(() => {
      setAnimatedPct(target);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  let ringColor = 'stroke-emerald-500';
  let badgeText = 'text-emerald-600 dark:text-emerald-400';
  let statusText = 'Safe Zone';

  if (percentage < 75) {
    ringColor = 'stroke-rose-500';
    badgeText = 'text-rose-600 dark:text-rose-400';
    statusText = 'Danger Zone';
  } else if (percentage < 80) {
    ringColor = 'stroke-amber-500';
    badgeText = 'text-amber-600 dark:text-amber-400';
    statusText = 'Warning Zone';
  }

  const innerDiscSize = size - strokeWidth * 2 - 12;

  return (
    <div className="neu-card rounded-3xl p-6 flex flex-col items-center justify-center transition-all">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Glow background effect */}
        <div 
          className={`absolute inset-0 rounded-full blur-2xl opacity-15 transition-all ${
            percentage >= 80 ? 'bg-emerald-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'
          }`} 
        />

        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-300/50 dark:stroke-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`${ringColor} transition-all duration-1000 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Recessed Disc */}
        <div 
          className="absolute neu-inset rounded-full flex flex-col items-center justify-center text-center shadow-inner"
          style={{ width: innerDiscSize, height: innerDiscSize }}
        >
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {Math.round(animatedPct)}%
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {label}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-5 w-full flex flex-col items-center gap-3">
          <div className={`neu-flat-sm px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${badgeText}`}>
            {statusText}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mt-1">
            <div className="neu-inset p-3.5 rounded-2xl text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Safe Bunk Pool
              </span>
              <span className={`text-xl font-black ${safeBunksTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {safeBunksTotal >= 0 ? `+${safeBunksTotal}` : safeBunksTotal}
              </span>
            </div>

            <div className="neu-inset p-3.5 rounded-2xl text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {classesNeededTotal > 0 ? 'Must Attend' : 'Classes Logged'}
              </span>
              <span className={`text-xl font-black ${classesNeededTotal > 0 ? 'text-amber-500' : 'text-blue-500'}`}>
                {classesNeededTotal > 0 ? `${classesNeededTotal} req` : `${totalAttended}/${totalClasses}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BunkMeter;

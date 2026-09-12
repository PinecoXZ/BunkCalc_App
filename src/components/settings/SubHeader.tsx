import React from 'react';

interface SubHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export const SubHeader: React.FC<SubHeaderProps> = ({ title, subtitle, onBack }) => (
  <div className="flex items-center gap-3 mb-6">
    <button
      onClick={onBack}
      className="neu-btn p-2.5 rounded-2xl text-slate-700 dark:text-slate-200"
      aria-label="Back to Settings"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <div>
      <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h1>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>}
    </div>
  </div>
);

export default SubHeader;


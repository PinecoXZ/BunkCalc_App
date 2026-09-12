import React, { useEffect, useState, useMemo } from 'react';
import type { AttendanceRecord } from '../lib/types';
import { parseLocalDate } from '../lib/calculations';

interface Props {
  semesterEndDate: string;
  records: AttendanceRecord[];
}

const SemesterProgress: React.FC<Props> = ({ semesterEndDate, records }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const progress = useMemo(() => {
    if (!semesterEndDate) return null;

    const cleanEndStr = semesterEndDate.includes('T') ? semesterEndDate.split('T')[0] : semesterEndDate;
    const endDate = parseLocalDate(cleanEndStr);
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date();
    if (records.length > 0) {
      const dates = records.map(r => parseLocalDate(r.date).getTime());
      startDate = new Date(Math.min(...dates));
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    const today = new Date();
    
    // Total days in semester
    const totalTime = endDate.getTime() - startDate.getTime();
    const totalDays = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24)));

    // Elapsed days
    const elapsedTime = today.getTime() - startDate.getTime();
    let elapsedDays = Math.ceil(elapsedTime / (1000 * 60 * 60 * 24));
    
    if (elapsedDays < 0) elapsedDays = 0;
    if (elapsedDays > totalDays) elapsedDays = totalDays;

    const percentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    
    const remainingDays = totalDays - elapsedDays;
    const remainingWeeks = Math.ceil(remainingDays / 7);

    return {
      percentage,
      elapsedDays,
      totalDays,
      remainingWeeks,
      isFinished: today > endDate
    };
  }, [semesterEndDate, records]);

  if (!progress) return null;

  return (
    <div className="neu-card rounded-3xl p-5 mb-6">
      <div className="flex justify-between items-end mb-3">
        <div>
          <h2 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Semester Progress</h2>
          <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {progress.isFinished ? 'Semester Completed' : `Day ${progress.elapsedDays} of ${progress.totalDays}`}
          </p>
        </div>
        {!progress.isFinished && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Remaining</span>
            <span className="text-xs font-extrabold text-blue-500">{progress.remainingWeeks} weeks</span>
          </div>
        )}
      </div>

      <div className="h-2.5 w-full neu-inset rounded-full overflow-hidden p-0.5 relative">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
          style={{ width: mounted ? `${progress.percentage}%` : '0%' }}
        />
      </div>
      <div className="mt-2.5 flex justify-end">
        <span className="neu-flat-sm text-[10px] font-black px-2.5 py-0.5 rounded-full text-blue-600 dark:text-blue-400">
          {Math.round(progress.percentage)}% Completed
        </span>
      </div>
    </div>
  );
};

export default SemesterProgress;

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
    <div className="neu-flat-sm rounded-2xl px-4 py-3 mb-5 anim-fade-scale">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Semester</span>
          <span className="text-[11px] font-black text-slate-800 dark:text-white">
            {progress.isFinished ? 'Completed' : `Day ${progress.elapsedDays}/${progress.totalDays}`}
          </span>
        </div>
        {!progress.isFinished && (
          <span className="text-[10px] font-bold text-blue-500">
            {progress.remainingWeeks}w left • {Math.round(progress.percentage)}%
          </span>
        )}
      </div>
      <div className="h-1.5 w-full neu-inset rounded-full overflow-hidden p-px">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
          style={{ width: mounted ? `${progress.percentage}%` : '0%' }}
        />
      </div>
    </div>
  );
};

export default SemesterProgress;

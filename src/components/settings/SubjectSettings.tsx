import React from 'react';
import type { Subject } from '../../lib/types';
import SubHeader from './SubHeader';

interface SubjectSettingsProps {
  subjects: Subject[];
  onDeleteSubject: (id: string, name: string) => void;
  onBack: () => void;
}

export const SubjectSettings: React.FC<SubjectSettingsProps> = ({
  subjects,
  onDeleteSubject,
  onBack,
}) => {
  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="Manage Subjects"
        subtitle={`${subjects.length} course(s) currently enrolled`}
        onBack={onBack}
      />

      <div className="space-y-3">
        {subjects.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">No enrolled subjects found.</p>
        ) : (
          subjects.map((subject) => (
            <div key={subject.id} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{subject.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {subject.credits} Credits • {subject.schedule.length} classes/week
                  </span>
                  {subject.room && (
                    <span className="text-[10px] font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                      {subject.room}
                    </span>
                  )}
                  {subject.faculty && (
                    <span className="text-[10px] font-medium text-slate-400 truncate max-w-[120px]">
                      {subject.faculty}
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => onDeleteSubject(subject.id, subject.name)}
                className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-colors"
                aria-label={`Delete ${subject.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubjectSettings;


import React from 'react';
import type { AppSettings } from '../../lib/types';
import HelpTooltip from '../HelpTooltip';
import SubHeader from './SubHeader';

interface AcademicSettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onBack: () => void;
}

export const AcademicSettings: React.FC<AcademicSettingsProps> = ({
  settings,
  setSettings,
  onBack,
}) => {
  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="Academic & Thresholds"
        subtitle="Target attendance & semester timeline"
        onBack={onBack}
      />

      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-sm">
        <div className="p-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm">Attendance Threshold</p>
              <HelpTooltip
                title="Attendance Threshold"
                content="The target percentage required by your college or university (e.g. 75% or 80%). Your bunk budget is calculated based on this."
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Minimum required percentage</p>
          </div>
          <select 
            value={Math.round(settings.globalThreshold * 100)}
            onChange={(e) => setSettings({ ...settings, globalThreshold: Number(e.target.value) / 100 })}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
          >
            {[60, 65, 70, 75, 80, 85, 90].map(val => (
              <option key={val} value={val}>{val}%</option>
            ))}
          </select>
        </div>

        <div className="p-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm">Danger Zone Buffer</p>
              <HelpTooltip
                title="Danger Zone Buffer"
                content="Buffer percentage above your threshold that triggers warning banners before you fall below the required attendance."
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Alert threshold above minimum</p>
          </div>
          <select 
            value={Math.round(settings.warningBuffer * 100)}
            onChange={(e) => setSettings({ ...settings, warningBuffer: Number(e.target.value) / 100 })}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
          >
            {[2, 3, 5, 7, 10].map(val => (
              <option key={val} value={val}>{val}%</option>
            ))}
          </select>
        </div>

        {/* Honor Target Goal */}
        <div className="p-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm">Honor Target (Optional)</p>
              <HelpTooltip
                title="Honor Target"
                content="Higher target threshold (e.g. 85% or 90%) for top internal assessment marks or scholarship criteria."
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Internal grading / scholarship goal</p>
          </div>
          <select 
            value={settings.targetThreshold ? Math.round(settings.targetThreshold * 100) : 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSettings({ ...settings, targetThreshold: val === 0 ? undefined : val / 100 });
            }}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
          >
            <option value={0}>None</option>
            {[80, 85, 90, 95].map(val => (
              <option key={val} value={val}>{val}%</option>
            ))}
          </select>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="font-bold text-sm">Semester End Date</p>
            <HelpTooltip
              title="Semester End Date"
              content="Defines how many remaining classes exist in the semester pool to compute exact safe bunks."
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Shared semester timeline for all subjects</p>
          <input 
            type="date" 
            value={settings.semesterEndDate.split('T')[0]}
            onChange={(e) => e.target.value && setSettings({ ...settings, semesterEndDate: e.target.value })}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default AcademicSettings;


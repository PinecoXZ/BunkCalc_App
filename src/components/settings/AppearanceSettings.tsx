import React from 'react';
import type { AppSettings } from '../../lib/types';
import SubHeader from './SubHeader';

interface AppearanceSettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onBack: () => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  settings,
  setSettings,
  onBack,
}) => {
  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="Appearance & Theme"
        subtitle="Theme modes, accent palette & haptics"
        onBack={onBack}
      />

      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
        {/* Mode Selector */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-sm">Theme Mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">App appearance style</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 overflow-x-auto">
            {[
              { id: 'light' as const, label: 'Light' },
              { id: 'dark' as const, label: 'Dark' },
              { id: 'oled' as const, label: 'Pitch OLED' },
              { id: 'system' as const, label: 'Auto' }
            ].map((t) => (
              <button 
                key={t.id}
                onClick={() => setSettings({ ...settings, theme: t.id })}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                  settings.theme === t.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color Picker */}
        <div className="p-4 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">Accent Theme</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Primary UI highlight color</p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: 'blue' as const, color: 'bg-blue-500', name: 'Classic Blue' },
              { id: 'purple' as const, color: 'bg-purple-500', name: 'Neon Purple' },
              { id: 'emerald' as const, color: 'bg-emerald-500', name: 'Emerald Green' },
              { id: 'amber' as const, color: 'bg-amber-500', name: 'Gold Amber' },
              { id: 'rose' as const, color: 'bg-rose-500', name: 'Rose Red' }
            ].map((acc) => (
              <button 
                key={acc.id}
                title={acc.name}
                onClick={() => setSettings({ ...settings, themeAccent: acc.id })}
                className={`w-6 h-6 rounded-full ${acc.color} transition-transform ${
                  (settings.themeAccent || 'blue') === acc.id 
                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' 
                    : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Haptic Feedback */}
        <div className="p-4 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">Haptic Feedback</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Subtle vibrations on interaction</p>
          </div>
          <button 
            onClick={() => setSettings({ ...settings, hapticsEnabled: !settings.hapticsEnabled })}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.hapticsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.hapticsEnabled ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;


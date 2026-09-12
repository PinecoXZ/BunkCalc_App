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

      <div className="neu-card rounded-3xl overflow-hidden divide-y divide-slate-200/60 dark:divide-slate-800/60">
        {/* Mode Selector */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">Theme Mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Soft UI light &amp; dark themes</p>
          </div>
          <div className="flex neu-inset p-1.5 rounded-2xl gap-1.5 self-start sm:self-auto">
            {[
              { id: 'light' as const, label: 'Light', icon: '☀️' },
              { id: 'dark' as const, label: 'Dark', icon: '🌙' },
              { id: 'system' as const, label: 'Auto', icon: '⚡' }
            ].map((t) => {
              const isActive = settings.theme === t.id;
              return (
                <button 
                  key={t.id}
                  onClick={() => setSettings({ ...settings, theme: t.id })}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isActive 
                      ? 'neu-btn bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-extrabold shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color Picker */}
        <div className="p-4 sm:p-5 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">Accent Theme</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Primary UI highlight color</p>
          </div>
          <div className="flex items-center gap-2.5">
            {[
              { id: 'blue' as const, color: 'bg-blue-500', name: 'Classic Blue' },
              { id: 'purple' as const, color: 'bg-purple-500', name: 'Neon Purple' },
              { id: 'emerald' as const, color: 'bg-emerald-500', name: 'Emerald Green' },
              { id: 'amber' as const, color: 'bg-amber-500', name: 'Gold Amber' },
              { id: 'rose' as const, color: 'bg-rose-500', name: 'Rose Red' }
            ].map((acc) => {
              const isSelected = (settings.themeAccent || 'blue') === acc.id;
              return (
                <button 
                  key={acc.id}
                  title={acc.name}
                  onClick={() => setSettings({ ...settings, themeAccent: acc.id })}
                  className={`w-7 h-7 rounded-full ${acc.color} transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'ring-3 ring-offset-2 ring-blue-500 scale-110 shadow-md' 
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Haptic Feedback */}
        <div className="p-4 sm:p-5 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm text-slate-900 dark:text-white">Haptic Feedback</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tactile vibrations on interaction</p>
          </div>
          <button 
            onClick={() => setSettings({ ...settings, hapticsEnabled: !settings.hapticsEnabled })}
            className={`w-13 h-7 rounded-full transition-all relative cursor-pointer p-0.5 ${
              settings.hapticsEnabled 
                ? 'bg-blue-600 dark:bg-blue-500 shadow-inner' 
                : 'neu-inset'
            }`}
          >
            <div 
              className={`w-6 h-6 rounded-full transition-all duration-200 shadow-md ${
                settings.hapticsEnabled 
                  ? 'translate-x-6 bg-white' 
                  : 'translate-x-0 bg-white dark:bg-slate-400'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;

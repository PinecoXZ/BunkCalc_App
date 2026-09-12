import React, { useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useSettings } from '../store/useSettings';
import ThemedIcon, { type IconName } from './ThemedIcon';

export type TabType = 'dashboard' | 'today' | 'stats' | 'settings';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const BottomNav: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const { settings } = useSettings();

  const tabs: { id: TabType; label: string; icon: IconName }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'today', label: 'Today', icon: 'history' },
    { id: 'stats', label: 'Stats', icon: 'chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleTabClick = useCallback((id: TabType) => {
    if (activeTab === id) return;
    // 1. Immediately switch tab synchronously (0ms latency, no await blocking)
    setActiveTab(id);

    // 2. Fire-and-forget haptics non-blockingly
    if (settings.hapticsEnabled) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
  }, [activeTab, setActiveTab, settings.hapticsEnabled]);

  return (
    <nav aria-label="Bottom Navigation" className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe pt-2 pointer-events-none">
      <div className="max-w-md mx-auto neu-card rounded-3xl px-3 py-2 flex items-center justify-around pointer-events-auto shadow-lg">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex items-center justify-center rounded-2xl py-2 px-3 transition-all duration-200 ease-out cursor-pointer active:scale-90 select-none ${
                isActive
                  ? 'neu-inset text-blue-600 dark:text-blue-400 font-black px-4 shadow-sm'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div
                className={`flex items-center justify-center transition-transform duration-200 ease-out will-change-transform ${
                  isActive ? 'scale-110 -translate-y-0.5' : 'scale-100 translate-y-0'
                }`}
              >
                <ThemedIcon
                  name={tab.icon}
                  size={20}
                  color={isActive ? undefined : 'currentColor'}
                  className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}
                />
              </div>

              <span
                className={`text-[11px] font-extrabold uppercase tracking-tight whitespace-nowrap overflow-hidden transition-all duration-200 ease-out ${
                  isActive
                    ? 'max-w-20 opacity-100 ml-1.5 translate-x-0'
                    : 'max-w-0 opacity-0 ml-0 -translate-x-2 pointer-events-none'
                }`}
              >
                {tab.label}
              </span>

              <span
                className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 transition-all duration-200 ${
                  isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default React.memo(BottomNav);

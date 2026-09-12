import React from 'react';
import type { AppSettings } from '../../lib/types';
import SubHeader from './SubHeader';
import { ensureNotificationPermission } from '../../lib/permissions';

interface NotificationSettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onBack: () => void;
  onShowModal: (modal: {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    onConfirm: () => void;
  }) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  settings,
  setSettings,
  onBack,
  onShowModal,
}) => {
  const handleRequestPermission = async () => {
    const granted = await ensureNotificationPermission();
    if (granted) {
      onShowModal({
        isOpen: true,
        title: 'Success',
        message: 'Notifications enabled successfully!',
        type: 'success',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } else {
      onShowModal({
        isOpen: true,
        title: 'Permission Denied',
        message: 'Permission denied. Please enable notifications in your phone settings.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  };

  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="Smart Notifications"
        subtitle="Pre-class alerts, morning digests & reminders"
        onBack={onBack}
      />

      <div className="neu-card rounded-3xl overflow-hidden divide-y divide-slate-200/50 dark:divide-slate-800/60">
        <div className="p-4.5 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Push Notifications</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Master toggle for alerts & reminders</p>
          </div>
          <button 
            onClick={() => setSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
            className={`w-12 h-6 rounded-full transition-all relative neu-inset ${settings.notificationsEnabled ? 'bg-blue-500/20' : ''}`}
            aria-label="Toggle Push Notifications"
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${settings.notificationsEnabled ? 'left-6.5 bg-blue-600 shadow-md shadow-blue-500/50' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
          </button>
        </div>

        {settings.notificationsEnabled && (
          <>
            {/* Tone & Personality Mode Toggle */}
            <div className="p-4.5 flex justify-between items-start bg-purple-500/5">
              <div className="max-w-[75%]">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Meme Roast Mode 💀</p>
                  {settings.toneMode === 'meme' && (
                    <span className="text-[10px] font-black uppercase bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">Active</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {settings.toneMode === 'meme' 
                    ? 'Savage reality checks & humorous attendance reactions'
                    : 'Standard clean & professional notification style'}
                </p>
                {settings.toneMode === 'meme' && (
                  <div className="mt-2.5 text-[11px] font-medium text-purple-700 dark:text-purple-300 neu-inset rounded-xl px-3 py-2 flex items-center gap-2">
                    <span>💬</span>
                    <span className="italic">"The professor is currently drawing a red circle around your roll number 💀"</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setSettings({ ...settings, toneMode: settings.toneMode === 'meme' ? 'standard' : 'meme' })}
                className={`w-12 h-6 rounded-full transition-all relative neu-inset flex-shrink-0 ${settings.toneMode === 'meme' ? 'bg-purple-500/20' : ''}`}
                aria-label="Toggle Meme Mode"
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${settings.toneMode === 'meme' ? 'left-6.5 bg-purple-600 shadow-md shadow-purple-500/50' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
              </button>
            </div>

            {/* Pre-Class Reminders */}
            <div className="p-4.5 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Pre-Class Reminders</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Alert before class starts</p>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={settings.reminderMinutesBefore}
                  onChange={(e) => setSettings({ ...settings, reminderMinutesBefore: Number(e.target.value) as 5 | 10 | 15 | 30 })}
                  className="neu-input rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value={5} className="bg-slate-50 dark:bg-slate-900">5 mins</option>
                  <option value={10} className="bg-slate-50 dark:bg-slate-900">10 mins</option>
                  <option value={15} className="bg-slate-50 dark:bg-slate-900">15 mins</option>
                  <option value={30} className="bg-slate-50 dark:bg-slate-900">30 mins</option>
                </select>
                <button 
                  onClick={() => setSettings({ ...settings, preClassReminder: settings.preClassReminder === false ? true : false })}
                  className={`w-11 h-5.5 rounded-full transition-all relative neu-inset ${settings.preClassReminder !== false ? 'bg-blue-500/20' : ''}`}
                  aria-label="Toggle Pre-Class Reminder"
                >
                  <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-all ${settings.preClassReminder !== false ? 'left-6 bg-blue-600 shadow-sm' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
                </button>
              </div>
            </div>

            {/* Post-Class Attendance Prompts */}
            <div className="p-4.5 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Post-Class Prompts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Prompt to mark attendance after lecture</p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, postClassReminder: settings.postClassReminder === false ? true : false })}
                className={`w-12 h-6 rounded-full transition-all relative neu-inset ${settings.postClassReminder !== false ? 'bg-blue-500/20' : ''}`}
                aria-label="Toggle Post-Class Prompts"
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${settings.postClassReminder !== false ? 'left-6.5 bg-blue-600 shadow-md shadow-blue-500/50' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
              </button>
            </div>

            {/* Sunday Night Risk Summary */}
            <div className="p-4.5 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Sunday Risk Summary</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Weekly 8 PM recap for low-budget subjects</p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, sundaySummaryNotification: settings.sundaySummaryNotification === false ? true : false })}
                className={`w-12 h-6 rounded-full transition-all relative neu-inset ${settings.sundaySummaryNotification !== false ? 'bg-blue-500/20' : ''}`}
                aria-label="Toggle Sunday Risk Summary"
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${settings.sundaySummaryNotification !== false ? 'left-6.5 bg-blue-600 shadow-md shadow-blue-500/50' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
              </button>
            </div>

            {/* Daily Lock Screen Schedule Digest */}
            <div className="p-4.5 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Morning Schedule Digest</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Daily lock screen overview of classes & safe bunks</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="time" 
                  value={settings.dailyDigestTime || '07:30'}
                  onChange={(e) => setSettings({ ...settings, dailyDigestTime: e.target.value })}
                  className="neu-input rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                />
                <button 
                  onClick={() => setSettings({ ...settings, dailyScheduleDigest: settings.dailyScheduleDigest === false ? true : false })}
                  className={`w-11 h-5.5 rounded-full transition-all relative neu-inset ${settings.dailyScheduleDigest !== false ? 'bg-blue-500/20' : ''}`}
                  aria-label="Toggle Daily Schedule Digest"
                >
                  <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-all ${settings.dailyScheduleDigest !== false ? 'left-6 bg-blue-600 shadow-sm' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
                </button>
              </div>
            </div>

            {/* Holiday Mode */}
            <div className="p-4.5 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Holiday Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pause all reminders during breaks</p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, holidayMode: !settings.holidayMode })}
                className={`w-12 h-6 rounded-full transition-all relative neu-inset ${settings.holidayMode ? 'bg-amber-500/20' : ''}`}
                aria-label="Toggle Holiday Mode"
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${settings.holidayMode ? 'left-6.5 bg-amber-500 shadow-md shadow-amber-500/50' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
              </button>
            </div>

            <div className="p-4.5 bg-blue-500/5 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-blue-600 dark:text-blue-400">System Permissions</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">Required for device alarms & popups</p>
              </div>
              <button 
                onClick={handleRequestPermission}
                className="neu-btn-primary text-[10px] font-black uppercase px-3.5 py-2 rounded-xl"
              >
                Request Access
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;


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

      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-sm">
        <div className="p-4 flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">Push Notifications</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Master toggle for alerts & reminders</p>
          </div>
          <button 
            onClick={() => setSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        {settings.notificationsEnabled && (
          <>
            {/* Tone & Personality Mode Toggle */}
            <div className="p-4 flex justify-between items-start bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <div className="max-w-[75%]">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">Meme Roast Mode 💀</p>
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
                  <div className="mt-2 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                    <span>💬</span>
                    <span className="italic">"The professor is currently drawing a red circle around your roll number 💀"</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setSettings({ ...settings, toneMode: settings.toneMode === 'meme' ? 'standard' : 'meme' })}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.toneMode === 'meme' ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.toneMode === 'meme' ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Pre-Class Reminders */}
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Pre-Class Reminders</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Alert before class starts</p>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={settings.reminderMinutesBefore}
                  onChange={(e) => setSettings({ ...settings, reminderMinutesBefore: Number(e.target.value) as 5 | 10 | 15 | 30 })}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                >
                  <option value={5}>5 mins</option>
                  <option value={10}>10 mins</option>
                  <option value={15}>15 mins</option>
                  <option value={30}>30 mins</option>
                </select>
                <button 
                  onClick={() => setSettings({ ...settings, preClassReminder: settings.preClassReminder === false ? true : false })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.preClassReminder !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.preClassReminder !== false ? 'left-5.5' : 'left-0.5'}`}></div>
                </button>
              </div>
            </div>

            {/* Post-Class Attendance Prompts */}
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Post-Class Prompts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Prompt to mark attendance after lecture</p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, postClassReminder: settings.postClassReminder === false ? true : false })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.postClassReminder !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.postClassReminder !== false ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Sunday Night Risk Summary */}
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Sunday Risk Summary</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Weekly 8 PM recap for low-budget subjects</p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, sundaySummaryNotification: settings.sundaySummaryNotification === false ? true : false })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.sundaySummaryNotification !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.sundaySummaryNotification !== false ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Daily Lock Screen Schedule Digest */}
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Morning Schedule Digest</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Daily lock screen overview of classes & safe bunks</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="time" 
                  value={settings.dailyDigestTime || '07:30'}
                  onChange={(e) => setSettings({ ...settings, dailyDigestTime: e.target.value })}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
                <button 
                  onClick={() => setSettings({ ...settings, dailyScheduleDigest: settings.dailyScheduleDigest === false ? true : false })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.dailyScheduleDigest !== false ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.dailyScheduleDigest !== false ? 'left-5.5' : 'left-0.5'}`}></div>
                </button>
              </div>
            </div>

            {/* Holiday Mode */}
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Holiday Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pause all reminders during breaks</p>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, holidayMode: !settings.holidayMode })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.holidayMode ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.holidayMode ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="p-4 bg-blue-500/5 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-blue-600 dark:text-blue-400">System Permissions</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">Required for device alarms & popups</p>
              </div>
              <button 
                onClick={handleRequestPermission}
                className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
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


import React from 'react';
import SubHeader from './SubHeader';
import ThemedIcon from '../ThemedIcon';
import { APP_VERSION_NAME } from '../../lib/constants';

interface AboutSettingsProps {
  onBack: () => void;
  onRate: () => void;
  onShare: () => void;
  onFeedback: () => void;
  onOpenLegal: (legal: { title: string; type: 'privacy' | 'terms' }) => void;
}

export const AboutSettings: React.FC<AboutSettingsProps> = ({
  onBack,
  onRate,
  onShare,
  onFeedback,
  onOpenLegal,
}) => {
  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader title="About & Support" onBack={onBack} />

      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
        <button 
          onClick={onRate}
          className="w-full p-4 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Rate App</span>
          </div>
          <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
        </button>
        
        <button 
          onClick={onShare}
          className="w-full p-4 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <ThemedIcon name="share" size={20} className="text-blue-500" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Share with Friends</span>
          </div>
          <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
        </button>

        <button 
          onClick={onFeedback}
          className="w-full p-4 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">Send Feedback</span>
          </div>
          <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
        </button>

        <a 
          href="https://github.com/PinecoXZ"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-4 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Developer (PinecoXZ)</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Visit GitHub profile @PinecoXZ</p>
            </div>
          </div>
          <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
        </a>

        <button 
          onClick={() => onOpenLegal({ title: 'Privacy Policy', type: 'privacy' })}
          className="w-full p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors font-bold text-slate-600 dark:text-slate-300 flex justify-between items-center"
        >
          <span>Privacy Policy</span>
          <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
        </button>
        <button 
          onClick={() => onOpenLegal({ title: 'Terms of Service', type: 'terms' })}
          className="w-full p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors font-bold text-slate-600 dark:text-slate-300 flex justify-between items-center"
        >
          <span>Terms of Service</span>
          <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
        </button>
        <div className="p-4 flex justify-between items-center">
          <span className="font-bold text-slate-500 dark:text-slate-400">App Version</span>
          <span className="text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase text-xs">v{APP_VERSION_NAME}</span>
        </div>
      </div>
    </div>
  );
};

export default AboutSettings;


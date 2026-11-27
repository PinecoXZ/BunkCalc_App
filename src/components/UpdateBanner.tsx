import React from 'react';
import { isSafeHttpsUrl, useUpdateStore } from '../store/useUpdateStore';

export const UpdateBanner: React.FC = () => {
  const { isUpdateAvailable, latestVersion, apkUrl, changelog, dismissUpdate } = useUpdateStore();

  if (!isUpdateAvailable) return null;

  const handleDownload = async () => {
    if (!apkUrl || !isSafeHttpsUrl(apkUrl)) return;
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: apkUrl });
    } catch {
      window.open(apkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 text-slate-950 px-4 py-2.5 font-semibold shadow-lg flex items-center justify-between gap-3 text-xs md:text-sm animate-in slide-in-from-top duration-300 relative z-40">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
        </span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black uppercase tracking-wider text-[11px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-md">
              Update v{latestVersion}
            </span>
            <span className="font-bold text-slate-950 truncate">
              {changelog ? changelog.split('\n')[0].replace(/^v[\d.]+:?\s*/i, '') : 'New version is ready to install!'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleDownload}
          className="bg-slate-950 hover:bg-slate-900 text-amber-300 active:scale-95 px-3 py-1.5 rounded-xl font-black text-[11px] tracking-wider uppercase transition-all cursor-pointer shadow-md flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Update</span>
        </button>
        <button
          onClick={dismissUpdate}
          aria-label="Dismiss update banner"
          className="p-1 hover:bg-black/10 rounded-lg text-slate-900 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

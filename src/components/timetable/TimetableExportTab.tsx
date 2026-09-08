import React, { useState, useMemo, useEffect } from 'react';
import type { Subject } from '../../lib/types';
import { 
  createShortCloudCode, 
  generateTimetableQRSvg, 
  encodeCompactPayload,
  buildShareMessage,
  generateTimetableCardBlob,
  buildTimetableQRWebUrl
} from '../../lib/timetableShare';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface TimetableExportTabProps {
  subjects: Subject[];
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const TimetableExportTab: React.FC<TimetableExportTabProps> = ({
  subjects,
  onError,
  onSuccess,
}) => {
  const [sectionName, setSectionName] = useState('My Section Timetable');
  const [shortCode, setShortCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>('');

  // Generate 6-8 character short code when subjects or section name changes
  useEffect(() => {
    if (subjects.length === 0) return;
    let isCancelled = false;

    const generateCode = async () => {
      setIsGenerating(true);
      try {
        const code = await createShortCloudCode(subjects, sectionName);
        if (!isCancelled) {
          setShortCode(code);
        }
      } catch (err) {
        console.warn('Failed to generate cloud short code:', err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    };

    generateCode();
    return () => {
      isCancelled = true;
    };
  }, [subjects, sectionName]);

  // Compact offline payload fallback
  const compactPayload = useMemo(() => {
    if (subjects.length === 0) return '';
    return `BK:${encodeCompactPayload(subjects, sectionName)}`;
  }, [subjects, sectionName]);

  const displayCode = shortCode || compactPayload;

  // Web URL QR payload
  const qrWebUrl = useMemo(() => {
    if (subjects.length === 0) return '';
    return buildTimetableQRWebUrl(displayCode);
  }, [subjects, displayCode]);

  useEffect(() => {
    let isCancelled = false;
    if (qrWebUrl) {
      generateTimetableQRSvg(qrWebUrl)
        .then((svg) => {
          if (!isCancelled) setQrSvg(svg);
        })
        .catch((err) => {
          console.warn('QR Generation error:', err);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [qrWebUrl]);

  const handleCopyMessage = async () => {
    const message = buildShareMessage(sectionName, displayCode);
    try {
      await navigator.clipboard.writeText(message);
      setCopySuccess(true);
      onSuccess('Invite message copied with website link & code!');
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      alert('Failed to copy to clipboard. The message is:\n\n' + message);
      onError('Failed to copy to clipboard');
    }
  };

  const handleDownloadQRImage = async () => {
    if (!qrSvg) return;
    setIsDownloading(true);
    try {
      const blob = await generateTimetableCardBlob(qrSvg, sectionName);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BunkCalc-${(sectionName || 'Timetable').replace(/\s+/g, '_')}-QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onSuccess('QR Card downloaded successfully!');
    } catch (err) {
      console.warn('Failed to download QR image:', err);
      onError('Could not download QR image');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWithQR = async () => {
    const message = buildShareMessage(sectionName, displayCode);
    setIsSharingImage(true);

    try {
      let cardFile: File | null = null;
      if (qrSvg) {
        try {
          const blob = await generateTimetableCardBlob(qrSvg, sectionName);
          cardFile = new File([blob], `${(sectionName || 'Timetable').replace(/\s+/g, '_')}-QR.png`, {
            type: 'image/png',
          });
        } catch (err) {
          console.warn('Could not generate card blob:', err);
        }
      }

      if (navigator.share && cardFile && navigator.canShare && navigator.canShare({ files: [cardFile] })) {
        try {
          await navigator.share({
            title: `BunkCalc - ${sectionName || 'Class Timetable'}`,
            text: message,
            files: [cardFile],
          });
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') return;
        }
      }

      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({
            title: `BunkCalc - ${sectionName || 'Class Timetable'}`,
            text: message,
            dialogTitle: 'Share Class Timetable & QR Code',
          });
          return;
        } catch (err) {
          console.warn('Native share canceled or failed', err);
        }
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: `BunkCalc - ${sectionName || 'Class Timetable'}`,
            text: message,
          });
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') return;
        }
      }

      await handleCopyMessage();
    } catch (err) {
      console.warn('Share error:', err);
      handleCopyMessage();
    } finally {
      setIsSharingImage(false);
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No subjects configured yet. Add subjects first to share your timetable.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Section / Batch Name
        </label>
        <input
          type="text"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          placeholder="e.g. CSE Section A"
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
        />
      </div>

      {/* Offline Pure SVG QR Code */}
      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
        {qrSvg ? (
          <div 
            className="w-52 h-52 rounded-2xl bg-white p-2.5 shadow-md flex items-center justify-center overflow-hidden"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : (
          <div className="w-52 h-52 rounded-2xl bg-white p-4 shadow-sm flex items-center justify-center text-xs text-slate-400">
            Generating QR...
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-2.5 font-medium text-center">
          Classmates can scan this QR or copy the short code below
        </p>
      </div>

      {/* Short Code Display with Overflow Protection */}
      <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 p-3.5 rounded-2xl text-center shadow-sm w-full max-w-full overflow-hidden">
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Timetable Share Code</span>
        </span>
        <div className="w-full max-w-full overflow-hidden flex items-center justify-center">
          {isGenerating ? (
            <span className="text-xs font-normal italic text-slate-400 animate-pulse py-1">
              Generating code...
            </span>
          ) : (
            <div className={`w-full font-mono font-bold break-all select-all ${
              (shortCode || '').length <= 12
                ? 'text-lg md:text-xl font-black tracking-wider text-blue-600 dark:text-blue-300 py-0.5'
                : (shortCode || '').length <= 25
                ? 'text-xs md:text-sm font-bold tracking-normal text-blue-600 dark:text-blue-300 py-1'
                : 'text-[10px] font-medium text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg max-h-16 overflow-y-auto text-left leading-relaxed'
            }`}>
              {shortCode || 'BK-CODE'}
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Share this code with classmates on WhatsApp or SMS
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          onClick={handleShareWithQR}
          disabled={isSharingImage}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
        >
          {isSharingImage ? (
            <>
              <span className="animate-spin text-sm">↻</span>
              <span>Preparing QR & Message...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share Invite & QR Card</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadQRImage}
            disabled={isDownloading}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            {isDownloading ? (
              <span>Saving...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Save QR Card</span>
              </>
            )}
          </button>

          <button
            onClick={handleCopyMessage}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            {copySuccess ? (
              <span className="text-emerald-500">Copied!</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


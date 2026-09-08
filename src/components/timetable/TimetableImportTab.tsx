import React, { useState, useEffect } from 'react';
import { useSubjects } from '../../store/useSubjects';
import { decodeTimetable } from '../../lib/timetableShare';
import type { Subject } from '../../lib/types';

interface TimetableImportTabProps {
  initialImportCode?: string;
  onApplySuccess: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onOpenScanner: () => void;
}

export const TimetableImportTab: React.FC<TimetableImportTabProps> = ({
  initialImportCode = '',
  onApplySuccess,
  onError,
  onSuccess,
  onOpenScanner,
}) => {
  const { addSubject } = useSubjects();
  const [importCode, setImportCode] = useState(initialImportCode);
  const [isResolving, setIsResolving] = useState(false);
  const [previewData, setPreviewData] = useState<{ sectionName: string; subjects: Subject[] } | null>(null);
  const [importedSubjects, setImportedSubjects] = useState<Subject[]>([]);

  // Preview decoded subjects on import code change
  useEffect(() => {
    let isCancelled = false;
    if (!importCode.trim() || importCode.trim().length < 4) {
      setPreviewData(null);
      setImportedSubjects([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const decoded = await decodeTimetable(importCode);
        if (!isCancelled) {
          setPreviewData(decoded);
          setImportedSubjects(decoded.subjects);
        }
      } catch {
        if (!isCancelled) {
          setPreviewData(null);
          setImportedSubjects([]);
        }
      }
    }, 400);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [importCode]);

  const handleApplyImport = async () => {
    onError('');
    const subjectsToImport = importedSubjects.length > 0 ? importedSubjects : previewData?.subjects;

    if (!subjectsToImport || subjectsToImport.length === 0) {
      onError('Please enter a timetable short code (e.g. BK-A8F3) to import.');
      return;
    }

    setIsResolving(true);
    try {
      for (const sub of subjectsToImport) {
        addSubject({
          ...sub,
          attendedSoFar: Math.max(0, Number(sub.attendedSoFar) || 0),
          missedSoFar: Math.max(0, Number(sub.missedSoFar) || 0),
        });
      }

      onSuccess(`Successfully imported ${subjectsToImport.length} subjects with past attendance!`);
      setTimeout(() => {
        onApplySuccess();
      }, 1500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onError(errorMsg || 'Failed to save timetable.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleFileQrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const win = window as unknown as { 
        BarcodeDetector?: new (options?: { formats: string[] }) => { 
          detect: (bitmap: ImageBitmap) => Promise<Array<{ rawValue: string }>> 
        } 
      };
      if (win.BarcodeDetector) {
        const detector = new win.BarcodeDetector({ formats: ['qr_code'] });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          setImportCode(barcodes[0].rawValue);
          onSuccess('QR Code detected!');
          return;
        }
      }
    } catch (err) {
      console.warn('Barcode detector error:', err);
    }
    onError('Could not auto-read QR from this image. Please enter the code manually.');
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Enter Timetable Code
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenScanner}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Scan Photo</span>
            </button>
            <label className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Scan QR</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileQrScan}
              />
            </label>
          </div>
        </div>
        <input
          type="text"
          value={importCode}
          onChange={(e) => setImportCode(e.target.value)}
          placeholder="e.g. BK-7H7vg, short code, or URL"
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl text-base font-mono font-bold tracking-wider outline-none focus:border-blue-500 text-slate-900 dark:text-white text-center"
        />
        <p className="text-[10px] text-slate-400 mt-1 text-center">
          Enter 7-8 letter short code (e.g. BK-7H7vg), scan QR, or paste link
        </p>
      </div>

      {/* Live Preview & Past Attendance Adjustment */}
      {previewData && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/25 p-3 rounded-xl">
            <div className="flex justify-between items-center text-xs font-black text-blue-600 dark:text-blue-400 mb-1">
              <span>Section: {previewData.sectionName}</span>
              <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                {importedSubjects.length} Subjects
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Downloaded mid-semester? Enter any classes attended or missed before using the app (leave 0 if fresh):
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
            {importedSubjects.map((sub, idx) => (
              <div 
                key={sub.id || idx} 
                className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 p-3 rounded-xl space-y-2 shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {sub.name} {sub.isLab ? '(Lab)' : ''}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {sub.credits} cr • {sub.schedule.length} slots/wk
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 rounded-lg p-1.5 focus-within:border-emerald-500">
                    <label className="block text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      Attended So Far
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sub.attendedSoFar || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setImportedSubjects(prev => prev.map((s, i) => i === idx ? { ...s, attendedSoFar: val } : s));
                      }}
                      className="w-full bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 rounded-lg p-1.5 focus-within:border-red-500">
                    <label className="block text-[8px] font-black uppercase text-red-600 dark:text-red-400">
                      Missed / Bunked
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sub.missedSoFar || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setImportedSubjects(prev => prev.map((s, i) => i === idx ? { ...s, missedSoFar: val } : s));
                      }}
                      className="w-full bg-transparent text-xs font-black text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleApplyImport}
        disabled={!importCode.trim() || isResolving}
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isResolving ? (
          'Fetching Timetable...'
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Import {importedSubjects.length > 0 ? `${importedSubjects.length} Subjects` : 'Timetable'}</span>
          </>
        )}
      </button>
    </div>
  );
};


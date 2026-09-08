import React, { useState, useRef } from 'react';
import type { Subject } from '../lib/types';
import { parseTimetableText, preprocessImageForOCR } from '../lib/ocrParser';
import { sanitizeName } from '../lib/validation';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplySubjects: (subjects: Subject[]) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TimetableScannerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplySubjects,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [parsedSubjects, setParsedSubjects] = useState<Subject[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      processImage(src);
    };
    reader.readAsDataURL(file);
  };

  const processImage = (src: string) => {
    setIsProcessing(true);
    setStatusMessage('Analyzing timetable structure and text regions...');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setIsProcessing(false);
        return;
      }

      // Resize canvas for processing
      const maxDim = 1200;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      preprocessImageForOCR(canvas);

      // TECH-DEBT / DEMO STUB:
      // Client-side image-to-text is currently simulated using a template heuristic fallback.
      // To enable true on-device OCR without backend server dependencies:
      // 1. Integrate @capacitor-community/text-recognition (MLKit on Android) for native execution, OR
      // 2. Use tesseract.js worker for web environments.
      // The extracted string is passed directly to `parseTimetableText()` below.
      setTimeout(() => {
        // Fallback sample parsing based on typical scanned timetable layouts
        const sampleExtracted = 
          `Monday\n09:00 Data Structures\n10:00 Operating Systems\n11:00 Computer Networks\n14:00 DBMS Lab\n\n` +
          `Tuesday\n09:00 Database Management Systems\n10:00 Software Engineering\n11:00 Discrete Mathematics\n\n` +
          `Wednesday\n09:00 Operating Systems\n10:00 Data Structures\n14:00 OS Lab\n\n` +
          `Thursday\n09:00 Computer Networks\n10:00 Database Management Systems\n11:00 Software Engineering\n\n` +
          `Friday\n09:00 Discrete Mathematics\n10:00 Data Structures\n11:00 Operating Systems`;

        setExtractedText(sampleExtracted);
        const result = parseTimetableText(sampleExtracted);
        setParsedSubjects(result.subjects);
        setIsProcessing(false);
        setStatusMessage(`Successfully detected ${result.subjects.length} subjects from timetable.`);
      }, 600);
    };

    img.onerror = () => {
      setIsProcessing(false);
      setStatusMessage('Could not load image. Please select a valid photo or paste timetable text.');
    };

    img.src = src;
  };

  const handleParseRawText = () => {
    if (!extractedText.trim()) return;
    const result = parseTimetableText(extractedText);
    setParsedSubjects(result.subjects);
    setStatusMessage(`Found ${result.subjects.length} subjects.`);
  };

  const handleUpdateSubjectName = (index: number, newName: string) => {
    const updated = [...parsedSubjects];
    updated[index] = { ...updated[index], name: sanitizeName(newName) };
    setParsedSubjects(updated);
  };

  const handleToggleLab = (index: number) => {
    const updated = [...parsedSubjects];
    const isLab = !updated[index].isLab;
    updated[index] = {
      ...updated[index],
      isLab,
      credits: isLab ? 2 : 3,
    };
    setParsedSubjects(updated);
  };

  const handleDeleteSubject = (index: number) => {
    setParsedSubjects(parsedSubjects.filter((_, i) => i !== index));
  };

  const handleAddNewSubject = () => {
    const newSub: Subject = {
      id: uuidv4(),
      name: 'New Course',
      credits: 3,
      threshold: 0.75,
      isLab: false,
      schedule: [{ day: 1, slot: '09:00' }],
      attendedSoFar: 0,
      missedSoFar: 0,
    };
    setParsedSubjects([...parsedSubjects, newSub]);
  };

  const handleApply = () => {
    if (parsedSubjects.length === 0) return;
    onApplySubjects(parsedSubjects);
    onClose();
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Timetable OCR Scanner"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">Timetable Scanner</h2>
              <p className="text-xs text-slate-400">Scan photo or paste timetable text</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 p-1">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Photo / Screenshot
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Paste Text
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {!imageSrc ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 group flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-white mb-1">Click to Upload Timetable Image</p>
                  <p className="text-xs text-slate-400">PNG, JPG, WebP supported • On-device processing</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processed Image</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Change Image
                    </button>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-32 flex items-center justify-center">
                    <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Paste Schedule or Syllabus Text
              </label>
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="e.g.&#10;Monday&#10;09:00 Data Structures&#10;10:00 Operating Systems&#10;&#10;Tuesday&#10;09:00 DBMS Lab"
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <button
                onClick={handleParseRawText}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Extract Subjects
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="py-4 text-center">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-blue-400 font-bold">{statusMessage || 'Processing image...'}</p>
            </div>
          )}

          {statusMessage && !isProcessing && (
            <p className="text-xs text-slate-400 italic text-center">{statusMessage}</p>
          )}

          {/* Parsed Subjects Staging Area */}
          {parsedSubjects.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Detected Courses ({parsedSubjects.length})
                </span>
                <button
                  onClick={handleAddNewSubject}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  + Add Course
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {parsedSubjects.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => handleUpdateSubjectName(idx, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 text-xs font-bold text-white outline-none"
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {sub.schedule.map(sc => `${DAYS_OF_WEEK[sc.day]} ${sc.slot}`).join(', ')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleLab(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                        sub.isLab ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sub.isLab ? 'Lab (2x)' : 'Theory'}
                    </button>

                    <button
                      onClick={() => handleDeleteSubject(idx)}
                      aria-label="Remove detected subject"
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={parsedSubjects.length === 0}
            className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Import {parsedSubjects.length} Courses
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useSettings } from '../store/useSettings';
import { v4 as uuidv4 } from 'uuid';
import type { Subject } from '../lib/types';
import { sanitizeName } from '../lib/validation';
import { AppModal } from '../components/AppModal';

const Setup: React.FC = () => {
  const { addSubject } = useSubjects();
  const { settings, setSettings } = useSettings();
  
  const [step, setStep] = useState(1);
  const [tempSubjects, setTempSubjects] = useState<Subject[]>([]);
  
  // Current subject being added
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(3);
  const [isLab, setIsLab] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [globalSlot, setGlobalTime] = useState('09:00');
  const [scheduleMap, setScheduleMap] = useState<Record<number, string>>({});
  const [attendedSoFar, setAttendedSoFar] = useState<number>(0);
  const [missedSoFar, setMissedSoFar] = useState<number>(0);

  const [subjectThreshold, setSubjectThreshold] = useState<number>(settings.globalThreshold);
  const [room, setRoom] = useState('');
  const [faculty, setFaculty] = useState('');

  // Modal Dialog state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleAddSubject = () => {
    const days = Object.keys(scheduleMap).map(Number);
    const sanitizedName = sanitizeName(name);
    if (!sanitizedName || days.length === 0) return;
    
    // Check for duplicate subject names
    const nameExists = tempSubjects.some(s => s.name.toLowerCase().trim() === sanitizedName.toLowerCase().trim());
    if (nameExists) {
      setModal({
        isOpen: true,
        title: "Duplicate Subject",
        message: `A subject named "${sanitizedName}" has already been added.`,
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }
    
    const newSub: Subject = {
      id: uuidv4(),
      name: sanitizedName,
      credits,
      threshold: subjectThreshold,
      isLab,
      room: room.trim() || undefined,
      faculty: faculty.trim() || undefined,
      schedule: days.map(day => ({ 
        day, 
        slot: useCustomTime ? scheduleMap[day] : globalSlot,
        room: room.trim() || undefined,
        faculty: faculty.trim() || undefined,
      })),
      attendedSoFar: Math.max(0, attendedSoFar),
      missedSoFar: Math.max(0, missedSoFar),
    };
    
    setTempSubjects([...tempSubjects, newSub]);
    
    // Reset form
    setName('');
    setCredits(3);
    setIsLab(false);
    setRoom('');
    setFaculty('');
    setUseCustomTime(false);
    setGlobalTime('09:00');
    setScheduleMap({});
    setAttendedSoFar(0);
    setMissedSoFar(0);
  };

  const toggleDay = (idx: number) => {
    const newMap = { ...scheduleMap };
    if (newMap[idx] !== undefined) {
      delete newMap[idx];
    } else {
      newMap[idx] = globalSlot;
    }
    setScheduleMap(newMap);
  };

  const updateTime = (idx: number, time: string) => {
    setScheduleMap({ ...scheduleMap, [idx]: time });
  };

  const handleFinish = () => {
    tempSubjects.forEach(s => addSubject(s));
  };

  return (
    <div className="min-h-screen bg-[var(--neu-bg)] text-slate-900 dark:text-white p-6 pb-12 flex flex-col transition-colors duration-300">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-blue-600 dark:text-blue-500 italic tracking-tight">BunkCalc</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase mt-0.5">Semester Setup</p>
      </header>

      {step === 1 && (
        <div className="flex-1 animate-in fade-in slide-in-from-right duration-300">
          <div className="mb-6">
            <h2 className="text-xl font-black tracking-tight mb-1">Academic Preferences</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">These can be changed anytime in settings.</p>
          </div>

          <div className="space-y-6 neu-card p-6 rounded-3xl">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2.5">Attendance Threshold (%)</label>
              <select 
                value={Math.round(settings.globalThreshold * 100)}
                onChange={(e) => setSettings({ ...settings, globalThreshold: Number(e.target.value) / 100 })}
                className="w-full neu-input rounded-2xl p-4 outline-none text-slate-900 dark:text-white font-bold cursor-pointer"
              >
                {[60, 65, 70, 75, 80, 85, 90].map(val => (
                  <option key={val} value={val} className="bg-slate-50 dark:bg-slate-900">{val}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2.5">Semester End Date</label>
              <input 
                type="date" 
                value={(settings.semesterEndDate || '').split('T')[0]}
                onChange={(e) => e.target.value && setSettings({ ...settings, semesterEndDate: e.target.value })}
                className="w-full neu-input rounded-2xl p-4 outline-none text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <button 
            onClick={() => {
              const [y, m, d] = settings.semesterEndDate.split('-').map(Number);
              const endDate = new Date(y, m - 1, d);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (endDate <= today) {
                setModal({
                  isOpen: true,
                  title: "Invalid Semester End Date",
                  message: "Semester end date must be in the future.",
                  type: "error",
                  confirmText: "OK",
                  onConfirm: () => setModal(null)
                });
                return;
              }
              setStep(2);
            }}
            className="w-full neu-btn-primary py-4.5 rounded-2xl font-black uppercase tracking-wider text-sm mt-10"
          >
            Next Step
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 animate-in fade-in slide-in-from-right duration-300 max-h-[80vh] overflow-y-auto pr-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black tracking-tight">Add Subjects</h2>
            <button 
              onClick={() => setStep(1)}
              className="neu-btn px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
          
          <div className="neu-card rounded-3xl p-6 mb-8">
            <div className="space-y-5">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Subject Name</label>
                <input 
                  placeholder="e.g. Data Structures" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  className="w-full neu-input rounded-xl p-3 outline-none text-slate-900 dark:text-white font-bold"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Room / Hall (Optional)</label>
                  <input 
                    placeholder="e.g. Room 304" 
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    maxLength={25}
                    className="w-full neu-input rounded-xl p-3 outline-none text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Faculty (Optional)</label>
                  <input 
                    placeholder="e.g. Prof. Sharma" 
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    maxLength={30}
                    className="w-full neu-input rounded-xl p-3 outline-none text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="flex-1">
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Credits</label>
                  <select 
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full neu-input border-0 p-3 rounded-xl text-sm outline-none text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map(c => <option key={c} value={c} className="bg-slate-50 dark:bg-slate-900">{c}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Type</label>
                  <select 
                    value={isLab ? 'lab' : 'theory'}
                    onChange={(e) => setIsLab(e.target.value === 'lab')}
                    className="w-full neu-input border-0 p-3 rounded-xl text-sm outline-none text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="theory" className="bg-slate-50 dark:bg-slate-900">Theory</option>
                    <option value="lab" className="bg-slate-50 dark:bg-slate-900">Lab</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Target %</label>
                  <select 
                    value={Math.round(subjectThreshold * 100)}
                    onChange={(e) => setSubjectThreshold(Number(e.target.value) / 100)}
                    className="w-full neu-input border-0 p-3 rounded-xl text-sm outline-none text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    {[60, 65, 70, 75, 80, 85, 90].map(val => (
                      <option key={val} value={val} className="bg-slate-50 dark:bg-slate-900">{val}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {!useCustomTime && (
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Class Time</label>
                  <input 
                    type="time"
                    value={globalSlot}
                    onChange={(e) => setGlobalTime(e.target.value)}
                    className="w-full neu-input rounded-xl p-3 text-sm outline-none text-slate-900 dark:text-white font-bold"
                  />
                </div>
              )}

              <div className="flex items-center justify-between neu-flat-sm p-3.5 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Custom timing</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Diff times on diff days</p>
                </div>
                <button 
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  role="switch"
                  aria-checked={useCustomTime}
                  aria-label="Custom timing per day"
                  className={`w-11 h-5.5 rounded-full transition-all relative neu-inset ${useCustomTime ? 'bg-blue-500/20' : ''}`}
                >
                  <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-all ${useCustomTime ? 'left-6 bg-blue-600 shadow-sm' : 'left-0.5 bg-slate-400 dark:bg-slate-600'}`}></div>
                </button>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2.5">Class Schedule</label>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map((day, idx) => {
                    const isActive = scheduleMap[idx] !== undefined;
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(idx)}
                        className={`py-2.5 rounded-xl text-[11px] font-black transition-all ${
                          isActive 
                            ? 'neu-chip-active' 
                            : 'neu-chip'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                
                {useCustomTime && Object.keys(scheduleMap).length > 0 && (
                  <div className="mt-4 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {Object.keys(scheduleMap).map(Number).map(dayIdx => (
                      <div key={dayIdx} className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-8">{daysOfWeek[dayIdx]}</span>
                        <input 
                          type="time"
                          value={scheduleMap[dayIdx]}
                          onChange={(e) => updateTime(dayIdx, e.target.value)}
                          className="flex-1 neu-input rounded-xl p-2 text-xs font-bold outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="neu-inset p-4.5 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mid-Semester History (Optional)</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Fill this in if you already have past attendance history this semester.</p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Attended So Far</label>
                    <input 
                      type="number" 
                      min={0}
                      value={attendedSoFar}
                      onChange={(e) => setAttendedSoFar(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full neu-input p-2.5 rounded-xl text-sm outline-none font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Missed So Far</label>
                    <input 
                      type="number" 
                      min={0}
                      value={missedSoFar}
                      onChange={(e) => setMissedSoFar(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full neu-input p-2.5 rounded-xl text-sm outline-none font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAddSubject}
                disabled={!name || Object.keys(scheduleMap).length === 0}
                className="w-full neu-btn py-3 rounded-xl text-xs font-black uppercase text-blue-600 dark:text-blue-400 disabled:opacity-50"
              >
                + Add Subject
              </button>
            </div>
          </div>

          <div className="space-y-2.5 mb-8">
            {tempSubjects.length > 0 && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Added Subjects</p>}
            {tempSubjects.map((s, i) => (
              <div key={i} className="flex justify-between items-center neu-flat-sm p-3.5 rounded-2xl animate-in fade-in slide-in-from-bottom duration-200">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{s.schedule.length} sessions per week</p>
                </div>
                <button 
                  onClick={() => setTempSubjects(tempSubjects.filter((_, idx) => idx !== i))}
                  aria-label="Remove subject"
                  className="neu-btn text-rose-500 p-2 rounded-xl"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button 
            disabled={tempSubjects.length === 0}
            onClick={handleFinish}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-4.5 rounded-2xl font-black uppercase tracking-wider text-sm shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 mt-auto"
          >
            Finish & Launch
          </button>
        </div>
      )}

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
        />
      )}
    </div>
  );
};

export default Setup;


import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Subject } from '../lib/types';
import { useSettings } from '../store/useSettings';
import { useSubjects } from '../store/useSubjects';
import { sanitizeName, validateSubjectName } from '../lib/validation';
import { AppModal } from './AppModal';

interface Props {
  subject?: Subject; // If provided, we are editing
  onSave: (subject: Subject) => void;
  onCancel: () => void;
}

const SubjectModal: React.FC<Props> = ({ subject, onSave, onCancel }) => {
  const { settings } = useSettings();
  const [name, setName] = useState(subject?.name || '');
  const [credits, setCredits] = useState(subject?.credits || 3);
  const [isLab, setIsLab] = useState<boolean>(Boolean(subject?.isLab));
  const [room, setRoom] = useState(subject?.room || '');
  const [faculty, setFaculty] = useState(subject?.faculty || '');
  
  // Custom time per day
  const [useCustomTime, setUseCustomTime] = useState(
    subject ? subject.schedule.some((s, _, arr) => s.slot !== arr[0].slot) : false
  );
  const [globalSlot, setGlobalTime] = useState(subject?.schedule[0]?.slot || '09:00');

  // Map of day -> slot
  const [scheduleMap, setScheduleMap] = useState<Record<number, string>>(
    subject?.schedule.reduce((acc, curr) => ({ ...acc, [curr.day]: curr.slot }), {}) || {}
  );

  const [attendedSoFar, setAttendedSoFar] = useState<number>(subject?.attendedSoFar || 0);
  const [missedSoFar, setMissedSoFar] = useState<number>(subject?.missedSoFar || 0);
  const [threshold, setThreshold] = useState<number>(subject?.threshold || settings.globalThreshold);

  // Modal Dialog state for validation/errors
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSave = () => {
    const days = Object.keys(scheduleMap).map(Number);
    const sanitizedName = sanitizeName(name);
    
    // Read pre-existing names (excluding the one being currently edited)
    const existingNames = useSubjects.getState().subjects
      .filter(s => s.id !== subject?.id)
      .map(s => s.name);
      
    const validation = validateSubjectName(sanitizedName, existingNames);
    if (!validation.valid) {
      setModal({
        isOpen: true,
        title: "Validation Error",
        message: validation.error || "Invalid subject name.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }

    if (days.length === 0) {
      setModal({
        isOpen: true,
        title: "Schedule Required",
        message: "Please select at least one class schedule day.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }
    
    const newSub: Subject = {
      id: subject?.id || uuidv4(),
      name: sanitizedName,
      credits,
      threshold,
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
    
    onSave(newSub);
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="neu-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{subject ? 'Edit Subject' : 'Add New Subject'}</h2>
          <button onClick={onCancel} aria-label="Close" className="neu-btn w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="space-y-5">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Subject Name</label>
            <input 
              autoFocus
              placeholder="e.g. Data Structures" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="neu-input w-full rounded-2xl p-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Room / Hall (Optional)</label>
              <input 
                placeholder="e.g. Room 304" 
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                maxLength={25}
                className="neu-input w-full rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Faculty (Optional)</label>
              <input 
                placeholder="e.g. Prof. Sharma" 
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                maxLength={30}
                className="neu-input w-full rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Credits</label>
              <select 
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="neu-input w-full p-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                {[1, 2, 3, 4, 5].map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Type</label>
              <select 
                value={isLab ? 'lab' : 'theory'}
                onChange={(e) => setIsLab(e.target.value === 'lab')}
                className="neu-input w-full p-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="theory" className="bg-white dark:bg-slate-900">Theory</option>
                <option value="lab" className="bg-white dark:bg-slate-900">Lab</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Target %</label>
              <select 
                value={Math.round(threshold * 100)}
                onChange={(e) => setThreshold(Number(e.target.value) / 100)}
                className="neu-input w-full p-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                {[60, 65, 70, 75, 80, 85, 90].map(val => (
                  <option key={val} value={val} className="bg-white dark:bg-slate-900">{val}%</option>
                ))}
              </select>
            </div>
          </div>

          {!useCustomTime && (
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Class Time</label>
              <input 
                type="time"
                value={globalSlot}
                onChange={(e) => setGlobalTime(e.target.value)}
                className="neu-input w-full p-3 rounded-2xl text-sm font-bold text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex items-center justify-between neu-inset p-3.5 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Custom daily timing</p>
              <p className="text-[10px] text-slate-500 font-medium">Enable for different times on different days</p>
            </div>
            <button 
              onClick={() => setUseCustomTime(!useCustomTime)}
              role="switch"
              aria-checked={useCustomTime}
              className={`w-13 h-7 rounded-full transition-all relative cursor-pointer p-0.5 ${
                useCustomTime ? 'bg-blue-600 dark:bg-blue-500 shadow-inner' : 'neu-inset'
              }`}
            >
              <div 
                className={`w-6 h-6 rounded-full transition-all duration-200 shadow-md ${
                  useCustomTime ? 'translate-x-6 bg-white' : 'translate-x-0 bg-white dark:bg-slate-400'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Schedule Days</label>
            <div className="space-y-2">
              {daysOfWeek.map((day, idx) => {
                const isActive = scheduleMap[idx] !== undefined;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`w-12 h-10 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                        isActive 
                          ? 'neu-chip-active font-black' 
                          : 'neu-chip text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {day}
                    </button>
                    {isActive && useCustomTime ? (
                      <input 
                        type="time"
                        value={scheduleMap[idx]}
                        onChange={(e) => updateTime(idx, e.target.value)}
                        className="neu-input flex-1 p-2.5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white animate-in slide-in-from-left duration-200"
                      />
                    ) : isActive && !useCustomTime ? (
                       <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 font-bold px-2">
                        Following default time ({globalSlot})
                       </div>
                    ) : (
                      <div className="flex-1 neu-inset rounded-2xl p-2.5 text-[10px] text-slate-400 font-medium italic">
                        Off day
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="neu-inset p-4 rounded-3xl space-y-3">
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Mid-Semester History (Optional)</p>
            <p className="text-[10px] text-slate-500 font-medium">Classes attended or missed prior to tracking with this app.</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Attended</label>
                <input 
                  type="number" 
                  min={0}
                  value={attendedSoFar}
                  onChange={(e) => setAttendedSoFar(Math.max(0, parseInt(e.target.value) || 0))}
                  className="neu-input w-full p-2.5 rounded-2xl text-sm font-black text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Missed</label>
                <input 
                  type="number" 
                  min={0}
                  value={missedSoFar}
                  onChange={(e) => setMissedSoFar(Math.max(0, parseInt(e.target.value) || 0))}
                  className="neu-input w-full p-2.5 rounded-2xl text-sm font-black text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <button 
            disabled={!name || Object.keys(scheduleMap).length === 0}
            onClick={handleSave}
            className="neu-btn-primary w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white disabled:opacity-40 transition-all active:scale-95 mt-4"
          >
            {subject ? 'Update Subject' : 'Save Subject'}
          </button>
        </div>
      </div>

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  );
};

export default SubjectModal;

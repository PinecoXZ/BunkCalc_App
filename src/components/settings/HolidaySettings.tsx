import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AppSettings, Holiday } from '../../lib/types';
import SubHeader from './SubHeader';
import { sanitizeName } from '../../lib/validation';
import { parseICSFile, HOLIDAY_PRESETS } from '../../lib/icsParser';

interface HolidaySettingsProps {
  settings: AppSettings;
  addHoliday: (holiday: Holiday) => void;
  updateHoliday: (holiday: Holiday) => void;
  deleteHoliday: (id: string) => void;
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

export const HolidaySettings: React.FC<HolidaySettingsProps> = ({
  settings,
  addHoliday,
  updateHoliday,
  deleteHoliday,
  onBack,
  onShowModal,
}) => {
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [holidayStart, setHolidayStart] = useState('');
  const [holidayEnd, setHolidayEnd] = useState('');

  const resetForm = () => {
    setEditingHoliday(null);
    setHolidayName('');
    setHolidayStart('');
    setHolidayEnd('');
  };

  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="College Holidays & Exam Breaks"
        subtitle="Manage official breaks & semester exclusions"
        onBack={onBack}
      />

      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Add official college holidays or exam breaks. Dates inside these ranges are automatically excluded from your remaining class budget.
        </p>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl space-y-3">
          {editingHoliday && (
            <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 font-bold">
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editing "{editingHoliday.name}"</span>
              </span>
              <button 
                onClick={resetForm}
                className="text-[10px] underline hover:text-blue-700 dark:hover:text-blue-300"
              >
                Cancel
              </button>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {editingHoliday ? 'Edit Break Name' : 'Break Name'}
            </label>
            <input 
              placeholder="e.g. Puja / Diwali Vacation" 
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Start Date</label>
              <input 
                type="date" 
                value={holidayStart}
                onChange={(e) => {
                  setHolidayStart(e.target.value);
                  if (!holidayEnd) setHolidayEnd(e.target.value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">End Date</label>
              <input 
                type="date" 
                value={holidayEnd}
                onChange={(e) => setHolidayEnd(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          
          {editingHoliday ? (
            <div className="flex gap-2">
              <button 
                disabled={!holidayName.trim() || !holidayStart || !holidayEnd}
                onClick={() => {
                  const sanitized = sanitizeName(holidayName);
                  if (!sanitized) return;
                  updateHoliday({
                    id: editingHoliday.id,
                    name: sanitized,
                    startDate: holidayStart,
                    endDate: holidayEnd >= holidayStart ? holidayEnd : holidayStart,
                  });
                  resetForm();
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
              >
                Save Changes
              </button>
              <button 
                onClick={resetForm}
                className="px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              disabled={!holidayName.trim() || !holidayStart || !holidayEnd}
              onClick={() => {
                const sanitized = sanitizeName(holidayName);
                if (!sanitized) return;
                addHoliday({
                  id: uuidv4(),
                  name: sanitized,
                  startDate: holidayStart,
                  endDate: holidayEnd >= holidayStart ? holidayEnd : holidayStart,
                });
                resetForm();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all shadow-md shadow-blue-500/20"
            >
              + Add Holiday Break
            </button>
          )}

          {/* Academic Calendar Presets & ICS Import */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Quick Calendar Presets & Import
            </span>
            <div className="flex gap-2">
              <select 
                onChange={(e) => {
                  const presetIndex = Number(e.target.value);
                  if (isNaN(presetIndex) || presetIndex < 0) return;
                  const preset = HOLIDAY_PRESETS[presetIndex];
                  if (!preset) return;
                  preset.holidays.forEach(h => {
                    addHoliday({
                      id: uuidv4(),
                      name: h.name,
                      startDate: h.startDate,
                      endDate: h.endDate,
                    });
                  });
                  onShowModal({
                    isOpen: true,
                    title: "Preset Applied",
                    message: `Added ${preset.holidays.length} holiday breaks from "${preset.name}".`,
                    type: "success",
                    confirmText: "Great!",
                    onConfirm: () => {},
                  });
                  e.target.value = "";
                }}
                defaultValue=""
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold outline-none text-slate-900 dark:text-white"
              >
                <option value="" disabled>Load Indian College Presets</option>
                {HOLIDAY_PRESETS.map((p, idx) => (
                  <option key={idx} value={idx}>{p.name}</option>
                ))}
              </select>

              <label className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>.ics</span>
                <input 
                  type="file" 
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const parsed = parseICSFile(text);
                      if (parsed.length === 0) {
                        onShowModal({
                          isOpen: true,
                          title: "No Events Found",
                          message: "Could not find valid calendar events in this .ics file.",
                          type: "error",
                          confirmText: "OK",
                          onConfirm: () => {},
                        });
                        return;
                      }
                      parsed.forEach(h => addHoliday(h));
                      onShowModal({
                        isOpen: true,
                        title: "Calendar Imported",
                        message: `Successfully imported ${parsed.length} academic holidays from your .ics file!`,
                        type: "success",
                        confirmText: "Done",
                        onConfirm: () => {},
                      });
                    } catch {
                      onShowModal({
                        isOpen: true,
                        title: "Import Error",
                        message: "Failed to parse the calendar file.",
                        type: "error",
                        confirmText: "OK",
                        onConfirm: () => {},
                      });
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* List of Configured Holidays */}
        <div className="space-y-2">
          {(!settings.holidays || settings.holidays.length === 0) ? (
            <p className="text-center text-xs text-slate-400 dark:text-slate-600 italic py-2">No holidays configured.</p>
          ) : (
            settings.holidays.map((h) => (
              <div 
                key={h.id} 
                className={`flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl border text-xs transition-all ${
                  editingHoliday?.id === h.id 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {h.name}
                    {editingHoliday?.id === h.id && (
                      <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-bold">Editing</span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">{h.startDate} to {h.endDate}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setEditingHoliday(h);
                      setHolidayName(h.name);
                      setHolidayStart(h.startDate);
                      setHolidayEnd(h.endDate);
                    }}
                    title="Edit Holiday"
                    className="text-blue-500 hover:text-blue-600 p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => {
                      if (editingHoliday?.id === h.id) {
                        resetForm();
                      }
                      deleteHoliday(h.id);
                    }}
                    title="Delete Holiday"
                    className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HolidaySettings;


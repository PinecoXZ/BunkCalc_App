import React, { useState } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { v4 as uuidv4 } from 'uuid';
import { toISODateStr } from '../lib/dateUtils';

interface Props {
  onBack: () => void;
}

const CalendarView: React.FC<Props> = ({ onBack }) => {
  const { subjects } = useSubjects();
  const { records, markAttendance, unmarkAttendance } = useAttendance();
  const settings = useSettings((state) => state.settings);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showHolidayTimetable, setShowHolidayTimetable] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const todayStr = React.useMemo(() => toISODateStr(new Date()), []);

  const selectedDateStr = React.useMemo(() => selectedDate ? toISODateStr(selectedDate) : null, [selectedDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to get holiday for a date string
  const getHolidayForDate = (dateStr: string) => {
    return (settings.holidays || []).find(h => dateStr >= h.startDate && dateStr <= h.endDate);
  };

  // Helper to get scheduled subjects for a date
  const getSubjectsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    return subjects.filter(sub => sub.schedule.some(slot => Number(slot.day) === dayOfWeek));
  };

  // Helper to get attendance status for a subject on a date
  const getStatus = (subjectId: string, dateStr: string) => {
    const record = records.find(r => r.subjectId === subjectId && r.date === dateStr);
    return record ? record.status : 'unmarked';
  };

  // Generate calendar grid
  const renderCalendarDays = () => {
    const cells = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Header row
    days.forEach(day => {
      cells.push(
        <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
          {day}
        </div>
      );
    });

    // Empty cells before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = toISODateStr(date);
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;
      const isSelected = selectedDateStr === dateStr;
      const holiday = getHolidayForDate(dateStr);

      const scheduledSubjects = getSubjectsForDate(date);
      const dots = scheduledSubjects.map(sub => getStatus(sub.id, dateStr));
      const hasMarkedRecords = dots.some(s => s !== 'unmarked');

      cells.push(
        <button
          key={d}
          disabled={isFuture}
          onClick={() => {
            setSelectedDate(date);
            setShowHolidayTimetable(false);
          }}
          className={`h-11 flex flex-col items-center justify-center rounded-2xl relative transition-all ${
            isFuture ? 'opacity-30 cursor-not-allowed' : 'active:scale-95 cursor-pointer'
          } ${
            isSelected ? 'neu-inset ring-2 ring-blue-500/50' : 
            isToday ? 'ring-2 ring-blue-500/60 font-black' : 
            holiday ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-slate-500/5'
          }`}
        >
          <span className={`text-sm font-bold ${
            isSelected ? 'text-blue-600 dark:text-blue-400 font-black' : 
            holiday ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'
          }`}>
            {d}
          </span>
          {!isFuture && hasMarkedRecords && (
            <div className="flex gap-0.5 mt-1">
              {dots.filter(s => s !== 'unmarked').map((status, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full ${
                    status === 'present' ? 'bg-emerald-500' :
                    status === 'absent' ? 'bg-rose-500' :
                    'bg-slate-400'
                  }`}
                />
              ))}
            </div>
          )}
          {!isFuture && !hasMarkedRecords && holiday && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
          )}
          {!isFuture && !hasMarkedRecords && !holiday && dots.length > 0 && (
            <div className="flex gap-0.5 mt-1">
              {dots.map((_, idx) => (
                <div
                  key={idx}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400/50"
                />
              ))}
            </div>
          )}
        </button>
      );
    }

    return cells;
  };

  const selectedSubjects = selectedDate ? getSubjectsForDate(selectedDate) : [];
  const selectedHoliday = selectedDateStr ? getHolidayForDate(selectedDateStr) : null;
  const recordsForSelectedDate = selectedDateStr ? records.filter(r => r.date === selectedDateStr) : [];

  return (
    <div className="min-h-screen bg-[var(--neu-bg)] text-slate-900 dark:text-white p-5 pb-28 flex flex-col">
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="neu-btn p-2.5 rounded-2xl text-slate-700 dark:text-slate-200"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Attendance Calendar</h1>
        <div className="w-10"></div>
      </header>

      <div className="neu-card rounded-3xl p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="neu-btn p-2 rounded-xl text-slate-600 dark:text-slate-300" aria-label="Previous month">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-black tracking-tight">{monthNames[month]} {year}</h2>
          <button onClick={handleNextMonth} className="neu-btn p-2 rounded-xl text-slate-600 dark:text-slate-300" aria-label="Next month">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>

      {selectedDate && (
        <div className="flex-1">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3.5">
            Classes on {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>

          {selectedHoliday && (
            <div className="neu-card rounded-3xl p-4.5 mb-4 flex items-center justify-between border-l-4 border-amber-500">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏖️</span>
                <div>
                  <p className="text-amber-600 dark:text-amber-400 font-bold text-sm">
                    {selectedHoliday.name || 'Academic Holiday'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
                    No classes scheduled • Excluded from semester requirements
                  </p>
                </div>
              </div>
              {selectedHoliday.startDate !== selectedHoliday.endDate && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full">
                  Break Range
                </span>
              )}
            </div>
          )}
          
          {selectedHoliday && recordsForSelectedDate.length === 0 && !showHolidayTimetable ? (
            <div className="text-center p-8 neu-inset rounded-3xl">
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">No classes scheduled on this holiday.</p>
              {selectedSubjects.length > 0 && (
                <button 
                  onClick={() => setShowHolidayTimetable(true)}
                  className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                >
                  Had a special makeup class? View schedule ({selectedSubjects.length} slots)
                </button>
              )}
            </div>
          ) : selectedSubjects.length === 0 ? (
            <div className="text-center p-8 neu-inset rounded-3xl">
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">No classes scheduled for this day.</p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {selectedHoliday && showHolidayTimetable && (
                <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-2xl text-xs">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Showing regular timetable for holiday</span>
                  <button 
                    onClick={() => setShowHolidayTimetable(false)}
                    className="text-amber-600 dark:text-amber-400 font-bold underline cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
              )}
              {selectedSubjects.map(subject => {
                if (!selectedDateStr) return null;
                const record = records.find(r => r.subjectId === subject.id && r.date === selectedDateStr);
                const status = record ? record.status : 'unmarked';

                return (
                  <div key={subject.id} className="neu-card p-5 rounded-3xl flex flex-col gap-3.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white">{subject.name}</span>
                      {status !== 'unmarked' && (
                        <span className={`neu-flat-sm px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
                          status === 'present' ? 'text-emerald-600 dark:text-emerald-400' :
                          status === 'absent' ? 'text-rose-600 dark:text-rose-400' :
                          'text-slate-600 dark:text-slate-300'
                        }`}>
                          {status}
                        </span>
                      )}
                    </div>

                    {status === 'unmarked' ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        <button
                          onClick={() => {
                            if (!records.find(r => r.subjectId === subject.id && r.date === selectedDateStr)) {
                              markAttendance({ id: uuidv4(), subjectId: subject.id, date: selectedDateStr, status: 'present' });
                            }
                          }}
                          className="neu-btn-present py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                          Present
                        </button>
                        <button
                          onClick={() => {
                            if (!records.find(r => r.subjectId === subject.id && r.date === selectedDateStr)) {
                              markAttendance({ id: uuidv4(), subjectId: subject.id, date: selectedDateStr, status: 'absent' });
                            }
                          }}
                          className="neu-btn-absent py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          Absent
                        </button>
                        <button
                          onClick={() => {
                            if (!records.find(r => r.subjectId === subject.id && r.date === selectedDateStr)) {
                              markAttendance({ id: uuidv4(), subjectId: subject.id, date: selectedDateStr, status: 'cancelled' });
                            }
                          }}
                          className="neu-btn py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 text-slate-600 dark:text-slate-300"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2.5">
                        {status !== 'cancelled' && (
                          <button
                            onClick={async () => {
                              if (record) {
                                await markAttendance({
                                  ...record,
                                  status: status === 'present' ? 'absent' : 'present'
                                });
                              }
                            }}
                            className="flex-1 neu-btn py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300"
                          >
                            Mark {status === 'present' ? 'Absent' : 'Present'}
                          </button>
                        )}
                        <button
                          onClick={() => record && unmarkAttendance(record.id)}
                          className={`${status === 'cancelled' ? 'flex-1' : 'px-4'} neu-btn py-2.5 rounded-xl font-bold text-sm text-rose-500`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;

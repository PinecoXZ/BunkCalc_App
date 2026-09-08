import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import SubjectCard from '../components/SubjectCard';
import AlertBanner from '../components/AlertBanner';
import BunkMeter from '../components/BunkMeter';
import ThemedIcon from '../components/ThemedIcon';
import HelpTooltip from '../components/HelpTooltip';
import SkeletonLoader from '../components/SkeletonLoader';
import { calculateSubjectStats } from '../lib/calculations';
import type { Subject } from '../lib/types';
import SemesterProgress from '../components/SemesterProgress';
import { UpdateBanner } from '../components/UpdateBanner';
import { WeeklyStrategyModal } from '../components/WeeklyStrategyModal';
import { TimetableShareModal } from '../components/TimetableShareModal';
import { registerBackHandler } from '../lib/backHandler';

// Lazy loaded heavy components
const TimetableGrid = lazy(() => import('../components/TimetableGrid'));
const SubjectModal = lazy(() => import('../components/SubjectModal'));

interface Props {
  onSelectSubject: (subject: Subject) => void;
  onOpenCalendar: () => void;
}

const Home: React.FC<Props> = ({ onSelectSubject, onOpenCalendar }) => {
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjects();
  const records = useAttendance((state) => state.records);
  const streak = useAttendance((state) => state.getStreak());
  const settings = useSettings((state) => state.settings);

  const [modalMode, setModalMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'timetable'>('dashboard');
  const [showWeeklyStrategy, setShowWeeklyStrategy] = useState(false);
  const [showTimetableShare, setShowTimetableShare] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'danger' | 'safe' | 'labs'>('all');
  const [sortBy, setSortBy] = useState<'risk' | 'attendance_asc' | 'attendance_desc' | 'name'>('risk');
  const [now, setNow] = useState(new Date());

  // Hardware Back Button listener for Home modals and view mode
  React.useEffect(() => {
    if (modalMode === 'none' && !showWeeklyStrategy && !showTimetableShare && viewMode === 'dashboard') {
      return;
    }

    const unregister = registerBackHandler(() => {
      if (modalMode !== 'none') {
        setModalMode('none');
        setEditingSubject(null);
        return true;
      }
      if (showWeeklyStrategy) {
        setShowWeeklyStrategy(false);
        return true;
      }
      if (showTimetableShare) {
        setShowTimetableShare(false);
        return true;
      }
      if (viewMode === 'timetable') {
        setViewMode('dashboard');
        return true;
      }
      return false;
    });

    return unregister;
  }, [modalMode, showWeeklyStrategy, showTimetableShare, viewMode]);

  // Update clock every minute
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute Overall Bunk Budget & Overall Attendance
  const overallStats = React.useMemo(() => {
    if (subjects.length === 0) {
      return { totalAttended: 0, totalClasses: 0, percentage: 100, safeBunksTotal: 0, classesNeededTotal: 0 };
    }

    let totalAttended = 0;
    let totalClasses = 0;
    let safeBunksTotal = 0;
    let classesNeededTotal = 0;

    subjects.forEach((subj) => {
      const stats = calculateSubjectStats(
        subj,
        records,
        settings.semesterEndDate,
        settings.holidays
      );
      totalAttended += stats.attendedCount;
      totalClasses += stats.totalClasses;
      safeBunksTotal += stats.bunkBudget;
      if (stats.bunkBudget < 0) {
        classesNeededTotal += stats.classesNeededToRecover;
      }
    });

    const percentage = totalClasses === 0 ? 100 : (totalAttended / totalClasses) * 100;

    return {
      totalAttended,
      totalClasses,
      percentage,
      safeBunksTotal,
      classesNeededTotal,
    };
  }, [subjects, records, settings.semesterEndDate, settings.holidays]);

  const { liveClass, nextClass } = useMemo<{
    liveClass: { subject: Subject; time: string; endMins: number } | null;
    nextClass: { subject: Subject; time: string; startMins: number } | null;
  }>(() => {
    if (subjects.length === 0) return { liveClass: null, nextClass: null };

    const today = now.getDay();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    let live: { subject: Subject; time: string; endMins: number } | null = null;
    const upcoming: { subject: Subject; time: string; startMins: number }[] = [];

    subjects.forEach((s) => {
      s.schedule.forEach((slot) => {
        if (Number(slot.day) === today) {
          const [h, m] = slot.slot.split(':').map(Number);
          const startMins = h * 60 + m;
          const duration = s.isLab ? 120 : 60;
          const endMins = startMins + duration;

          if (currentMins >= startMins && currentMins < endMins) {
            live = { subject: s, time: slot.slot, endMins };
          } else if (startMins > currentMins) {
            upcoming.push({ subject: s, time: slot.slot, startMins });
          }
        }
      });
    });

    upcoming.sort((a, b) => a.startMins - b.startMins);

    return {
      liveClass: live,
      nextClass: upcoming[0] || null,
    };
  }, [subjects, now]);

  // Precompute subject stats once upfront to prevent O(N log N) recalculations during filter & sort
  const subjectStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateSubjectStats>>();
    for (const s of subjects) {
      map.set(s.id, calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays));
    }
    return map;
  }, [subjects, records, settings.semesterEndDate, settings.holidays]);

  // Counts for filter chips derived from precomputed stats
  const filterCounts = useMemo(() => {
    let danger = 0;
    let safe = 0;
    let labs = 0;
    for (const s of subjects) {
      if (s.isLab) labs++;
      const stats = subjectStatsMap.get(s.id);
      if (stats) {
        const threshold = (s.threshold ?? settings.globalThreshold) * 100;
        if (stats.attendancePct < threshold || stats.bunkBudget < 0) {
          danger++;
        } else {
          safe++;
        }
      }
    }
    return { all: subjects.length, danger, safe, labs };
  }, [subjects, subjectStatsMap, settings.globalThreshold]);

  // Filter and Sort Subjects for fast student UX
  const filteredAndSortedSubjects = useMemo(() => {
    return subjects
      .filter((s) => {
        // Search query filter (name, code, room, faculty)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchCode = s.code?.toLowerCase().includes(q);
          const matchRoom = s.room?.toLowerCase().includes(q);
          const matchFaculty = s.faculty?.toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchRoom && !matchFaculty) return false;
        }

        const stats = subjectStatsMap.get(s.id)!;
        const threshold = (s.threshold ?? settings.globalThreshold) * 100;

        if (filterType === 'danger') {
          return stats.attendancePct < threshold || stats.bunkBudget < 0;
        }
        if (filterType === 'safe') {
          return stats.attendancePct >= threshold && stats.bunkBudget >= 0;
        }
        if (filterType === 'labs') {
          return s.isLab;
        }
        return true;
      })
      .sort((a, b) => {
        const statsA = subjectStatsMap.get(a.id)!;
        const statsB = subjectStatsMap.get(b.id)!;

        if (sortBy === 'risk') {
          // Lowest bunk budget first (urgent danger first)
          return statsA.bunkBudget - statsB.bunkBudget;
        }
        if (sortBy === 'attendance_asc') {
          return statsA.attendancePct - statsB.attendancePct;
        }
        if (sortBy === 'attendance_desc') {
          return statsB.attendancePct - statsA.attendancePct;
        }
        return a.name.localeCompare(b.name);
      });
  }, [subjects, subjectStatsMap, settings.globalThreshold, searchQuery, filterType, sortBy]);

  const handleSaveSubject = (subject: Subject) => {
    if (modalMode === 'add') {
      addSubject(subject);
    } else {
      updateSubject(subject);
    }
    setModalMode('none');
    setEditingSubject(null);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteSubject(id);
    }
  };

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject);
    setModalMode('edit');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-4 pb-24">
      <div className="-mx-4 -mt-4 mb-4">
        <UpdateBanner />
      </div>
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-500 italic uppercase">BunkCalc</h1>
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-widest flex items-center gap-1">
            DASHBOARD
            <HelpTooltip
              title="Dashboard Overview"
              content="Track your overall attendance health, live class schedule, and safe bunk pool calculated for the semester."
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {streak >= 2 && (
            <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
              <span className="text-orange-500 text-xs font-black">{streak}</span>
            </div>
          )}
          <button
            onClick={() => setShowTimetableShare(true)}
            className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-transform text-blue-500"
            aria-label="Share or Import Timetable"
            title="Share or Import Timetable"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            onClick={onOpenCalendar}
            className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-transform"
            aria-label="Open Calendar"
          >
            <ThemedIcon name="calendar" size={22} className="text-blue-500" />
          </button>
          <button
            onClick={() => setModalMode('add')}
            className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-transform"
            aria-label="Add Subject"
          >
            <ThemedIcon name="plus" size={22} className="text-emerald-500" />
          </button>
        </div>
      </header>

      <AlertBanner subjects={subjects} />

      {/* Weekly Strategy Quick Action Card */}
      {subjects.length > 0 && (
        <div
          onClick={() => setShowWeeklyStrategy(true)}
          className="mb-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-violet-900/20 border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-blue-500/40 active:scale-[0.99] transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Weekly Bunk Strategy</span>
                <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">Briefing</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Smart plan for next 7 days â€¢ Safe & risky subjects
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
            <span>View</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setViewMode('dashboard')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            viewMode === 'dashboard'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setViewMode('timetable')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            viewMode === 'timetable'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Timetable
        </button>
      </div>

      {viewMode === 'dashboard' ? (
        <>
          {subjects.length > 0 && (
            <SemesterProgress semesterEndDate={settings.semesterEndDate} records={records} />
          )}

          {/* Animated Bunk Meter Component */}
          {subjects.length > 0 && (
            <div className="mb-6">
              <BunkMeter
                percentage={overallStats.percentage}
                safeBunksTotal={overallStats.safeBunksTotal}
                classesNeededTotal={overallStats.classesNeededTotal}
                totalClasses={overallStats.totalClasses}
                totalAttended={overallStats.totalAttended}
                label="Overall Attendance"
              />
            </div>
          )}

          {/* Live Class Banner */}
          {liveClass && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 mb-6 shadow-xl shadow-emerald-500/20 relative overflow-hidden text-white border border-emerald-400/30 animate-in fade-in slide-in-from-top duration-300">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">CLASS IS LIVE NOW</span>
                </div>
                <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  Started at {liveClass.time}
                </span>
              </div>

              <h3 className="text-2xl font-black mb-2 truncate pr-4">{liveClass.subject.name}</h3>

              <div className="flex items-center justify-between">
                <span className="text-emerald-100 text-xs font-bold flex items-center gap-1.5">
                  <ThemedIcon name="history" size={16} className="text-emerald-200" />
                  Ends in {
                    (() => {
                      const currentMins = now.getHours() * 60 + now.getMinutes();
                      const remaining = liveClass.endMins - currentMins;
                      return remaining > 60 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : `${remaining} mins`;
                    })()
                  }
                </span>
                <span className="text-[10px] text-emerald-200/80 italic font-medium flex items-center gap-1">
                  {liveClass.subject.isLab && <ThemedIcon name="lab" size={14} />}
                  {liveClass.subject.isLab ? 'Lab Session (2 hrs)' : 'Lecture Session (1 hr)'}
                </span>
              </div>
            </div>
          )}

          {/* Upcoming Next Banner */}
          {nextClass && (
            <div className="bg-blue-600 rounded-3xl p-6 mb-8 shadow-xl shadow-blue-500/20 relative overflow-hidden text-white">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Upcoming Next</p>
              <h3 className="text-2xl font-black mb-1 truncate pr-12">{nextClass.subject.name}</h3>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{nextClass.time}</span>
                <span className="text-blue-100 text-xs font-medium">Starts in {
                  (() => {
                    const [h, m] = nextClass.time.split(':').map(Number);
                    const diff = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
                    return diff > 60 ? `${Math.floor(diff/60)}h ${diff%60}m` : `${diff} mins`;
                  })()
                }</span>
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
                <ThemedIcon name="calendar" size={64} />
              </div>
            </div>
          )}

          <section className="space-y-4">
            {/* Header & Count */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  Your Subjects
                  <HelpTooltip
                    title="Subject Cards"
                    content="Tap any subject to view detailed logs or adjust attendance history."
                  />
                </h2>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {filteredAndSortedSubjects.length} of {subjects.length}
                </span>
              </div>

              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'risk' | 'attendance_asc' | 'attendance_desc' | 'name')}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1 outline-none border border-slate-200 dark:border-slate-700"
                >
                  <option value="risk">Lowest Budget First (Riskiest)</option>
                  <option value="attendance_asc">Lowest Attendance %</option>
                  <option value="attendance_desc">Highest Attendance %</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Quick Search & Filter Bar */}
            {subjects.length > 2 && (
              <div className="space-y-2.5">
                {/* Search Input */}
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by subject, room (e.g. 302), faculty..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Subjects', count: filterCounts.all },
                    { id: 'danger', label: 'In Danger', count: filterCounts.danger },
                    { id: 'safe', label: 'Safe', count: filterCounts.safe },
                    { id: 'labs', label: 'Labs Only', count: filterCounts.labs }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterType(tab.id as 'all' | 'danger' | 'safe' | 'labs')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-all ${
                        filterType === tab.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                        filterType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Cards Grid */}
            <div className="grid gap-4">
              {filteredAndSortedSubjects.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No matching subjects found</p>
                  <p className="text-[10px] text-slate-400">Try clearing your search query or selecting a different filter tab.</p>
                  {(searchQuery || filterType !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                      }}
                      className="mt-2 text-xs font-bold text-blue-500 hover:underline"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredAndSortedSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    onClick={() => onSelectSubject(subject)}
                    onEdit={() => handleEditClick(subject)}
                    onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                  />
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        <Suspense fallback={<SkeletonLoader height="h-64" />}>
          <TimetableGrid />
        </Suspense>
      )}

      {modalMode !== 'none' && (
        <Suspense fallback={<SkeletonLoader height="h-48" />}>
          <SubjectModal
            subject={editingSubject || undefined}
            onSave={handleSaveSubject}
            onCancel={() => {
              setModalMode('none');
              setEditingSubject(null);
            }}
          />
        </Suspense>
      )}

      {/* Weekly Strategy Modal */}
      <WeeklyStrategyModal
        isOpen={showWeeklyStrategy}
        onClose={() => setShowWeeklyStrategy(false)}
      />

      {/* Timetable Share / Import Modal */}
      <TimetableShareModal
        isOpen={showTimetableShare}
        onClose={() => setShowTimetableShare(false)}
      />
    </div>
  );
};

export default Home;


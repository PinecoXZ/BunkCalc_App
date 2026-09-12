import React, { useState, Suspense, lazy, useEffect } from 'react';
import { useSettings } from '../store/useSettings';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { saveToStorage } from '../lib/storage';
import ThemedIcon from '../components/ThemedIcon';
import SkeletonLoader from '../components/SkeletonLoader';
import { v4 as uuidv4 } from 'uuid';
import type { ArchivedSemester } from '../lib/types';
import { calculateSubjectStats } from '../lib/calculations';
import { AppModal } from '../components/AppModal';
import { sanitizeName, validateArchiveName } from '../lib/validation';
import { PinSetupModal } from '../components/PinSetupModal';
import { APP_VERSION_NAME } from '../lib/constants';
import { registerBackHandler } from '../lib/backHandler';

import SubHeader from '../components/settings/SubHeader';
import AcademicSettings from '../components/settings/AcademicSettings';
import HolidaySettings from '../components/settings/HolidaySettings';
import SyncSettings from '../components/settings/SyncSettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import SubjectSettings from '../components/settings/SubjectSettings';
import DataSettings from '../components/settings/DataSettings';
import AboutSettings from '../components/settings/AboutSettings';

const LegalModal = lazy(() => import('../components/LegalModal'));
const FaqSection = lazy(() => import('../components/FaqSection'));

import { Share } from '@capacitor/share';

type SubPage = 
  | 'academic'
  | 'holidays'
  | 'sync'
  | 'notifications'
  | 'security'
  | 'appearance'
  | 'subjects'
  | 'data'
  | 'faq'
  | 'about'
  | null;

const Settings: React.FC = () => {
  const { settings, setSettings, addHoliday, updateHoliday, deleteHoliday, archivedSemesters, archiveSemester, deleteArchivedSemester } = useSettings();
  const { subjects, deleteSubject } = useSubjects();
  const { records } = useAttendance();
  const [activeSubPage, setActiveSubPage] = useState<SubPage>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinModalMode, setPinModalMode] = useState<'set' | 'change' | null>(null);

  const [legal, setLegal] = useState<{ title: string; type: 'privacy' | 'terms' } | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [showArchivedList, setShowArchivedList] = useState(false);

  // AppModal State
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

  // Hardware Back Button listener for subpages & modals in Settings
  useEffect(() => {
    if (!activeSubPage && !legal && !showArchiveModal && !pinModalMode && !modal && !showArchivedList) {
      return;
    }

    const unregister = registerBackHandler(() => {
      if (modal) {
        setModal(null);
        return true;
      }
      if (legal) {
        setLegal(null);
        return true;
      }
      if (showArchiveModal) {
        setShowArchiveModal(false);
        return true;
      }
      if (showArchivedList) {
        setShowArchivedList(false);
        return true;
      }
      if (pinModalMode) {
        setPinModalMode(null);
        return true;
      }
      if (activeSubPage) {
        setActiveSubPage(null);
        return true;
      }
      return false;
    });

    return unregister;
  }, [activeSubPage, legal, showArchiveModal, showArchivedList, pinModalMode, modal]);

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'BunkCalc — Smart Attendance Tracker',
        text: 'Bunking classes without stressing about attendance? Try BunkCalc!\n\nCalculate your safe bunk budget in real-time, get danger-zone alerts, and stay safe without detention risk.\n\nCheck it out here:',
        url: 'https://bunk-calc-web.vercel.app/',
        dialogTitle: 'Share BunkCalc with Friends',
      });
    } catch (err) {
      console.warn('Sharing failed', err);
    }
  };

  const handleFeedback = () => {
    window.location.href = `mailto:support@bunkcalc.app?subject=BunkCalc Feedback v${APP_VERSION_NAME}`;
  };

  const handleRate = () => {
    setModal({
      isOpen: true,
      title: "Coming Soon",
      message: "Thank you for your support! App store links will be active in the production release.",
      type: "alert",
      confirmText: "OK",
      onConfirm: () => setModal(null)
    });
  };

  const handleDeleteSubject = (id: string, name: string) => {
    setModal({
      isOpen: true,
      title: "Delete Subject",
      message: `Are you sure you want to delete ${name}? All attendance records for this subject will be lost.`,
      type: "confirm",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: () => {
        deleteSubject(id);
        setModal(null);
      },
      onCancel: () => setModal(null)
    });
  };


  const handleArchiveSemester = async () => {
    const sanitized = sanitizeName(archiveName);
    const validation = validateArchiveName(sanitized);
    if (!validation.valid) {
      setModal({
        isOpen: true,
        title: "Archive Failed",
        message: validation.error || "Please enter a valid semester name.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }
    if (subjects.length === 0) {
      setModal({
        isOpen: true,
        title: "Archive Failed",
        message: "No subjects to archive.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }

    const totalAttended = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays).attendedCount, 0);
    const totalClasses = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays).totalClasses, 0);
    const overallPct = totalClasses === 0 ? 100 : (totalAttended / totalClasses) * 100;

    const archived: ArchivedSemester = {
      id: uuidv4(),
      name: sanitized,
      endDate: settings.semesterEndDate,
      archivedAt: new Date().toISOString(),
      subjects: [...subjects],
      records: [...records],
      overallPct,
    };

    await archiveSemester(archived);
    // Clear current subjects and records
    await saveToStorage('subjects', []);
    await saveToStorage('attendance_records', []);
    setShowArchiveModal(false);
    setArchiveName('');
    window.location.reload();
  };


  return (
    <div className="min-h-screen bg-transparent text-slate-800 dark:text-slate-100 p-5 pb-28">
      {/* ── ROOT SETTINGS DASHBOARD ── */}
      {activeSubPage === null && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <header className="space-y-3">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Settings</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Configuration &amp; Preferences
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings (e.g. pin, theme, holiday, backup)..."
                className="neu-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="neu-flat-sm absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-0.5 rounded-full cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </header>

          {/* Group 1: Academic & Schedule */}
          {(!searchQuery || 'academic thresholds target semester breaks holidays calendar sync subjects'.includes(searchQuery.toLowerCase())) && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-1">
                Academic & Schedule
              </span>
              <div className="neu-card rounded-3xl divide-y divide-slate-200/60 dark:divide-slate-800/60 overflow-hidden">
                {/* Academic & Goals */}
                {(!searchQuery || 'academic thresholds target goal semester attendance buffer'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('academic')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Academic &amp; Thresholds</p>
                          <span className="neu-flat-sm text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            {Math.round(settings.globalThreshold * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Target threshold &bull; End: {settings.semesterEndDate ? settings.semesterEndDate.split('T')[0] : 'Not set'}
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {/* Holidays & Breaks */}
                {(!searchQuery || 'holidays breaks exam vacation exclusions presets ics'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('holidays')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">College Holidays &amp; Breaks</p>
                          <span className="neu-flat-sm text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            {settings.holidays?.length || 0} Breaks
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Vacations &amp; exam exclusions
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {/* Sync & Calendar Export */}
                {(!searchQuery || 'sync calendar widgets ics google apple outlook lock screen'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('sync')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Calendar Sync &amp; Widgets</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Google / Apple Calendar .ics &amp; Android Widget
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {/* Manage Subjects */}
                {(!searchQuery || 'subjects courses manage credits faculty room timetable'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('subjects')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Manage Subjects</p>
                          <span className="neu-flat-sm text-cyan-600 dark:text-cyan-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            {subjects.length} Courses
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Classrooms, faculty &amp; schedule slots
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Group 2: System, Privacy & Alerts */}
          {(!searchQuery || 'system notifications push alerts digest security pin lock passcode appearance theme colors dark data backup restore csv pdf archive'.includes(searchQuery.toLowerCase())) && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-1">
                System, Privacy &amp; Alerts
              </span>
              <div className="neu-card rounded-3xl divide-y divide-slate-200/60 dark:divide-slate-800/60 overflow-hidden">
                {/* Notifications */}
                {(!searchQuery || 'notifications push alerts reminder pre-class morning digest sunday'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('notifications')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Smart Notifications</p>
                          <span className={`neu-flat-sm text-[10px] font-black px-2.5 py-0.5 rounded-full ${settings.notificationsEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                            {settings.notificationsEnabled ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {settings.notificationsEnabled ? `Morning digest ${settings.dailyDigestTime || '07:30'}` : 'Alerts paused'}
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {/* Security & PIN Lock */}
                {(!searchQuery || 'security pin lock passcode protection privacy'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('security')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Security &amp; PIN Lock</p>
                          <span className={`neu-flat-sm text-[10px] font-black px-2.5 py-0.5 rounded-full ${settings.appLockEnabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                            {settings.appLockEnabled ? 'PIN Locked' : 'Unlocked'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {settings.appLockEnabled ? '4-digit passcode active' : 'No launch lock'}
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {/* Appearance & Themes */}
                {(!searchQuery || 'appearance theme dark light accent color palette haptics vibration'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('appearance')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Appearance &amp; Themes</p>
                          <span className="neu-flat-sm text-rose-600 dark:text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                            {settings.theme}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {settings.themeAccent || 'Blue'} accent &bull; Haptics
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {/* Data & Backup */}
                {(!searchQuery || 'data backup restore csv pdf export archive reset clear json'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('data')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-slate-600 dark:text-slate-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Data, Backup &amp; Export</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          JSON Backup, Restore, CSV, PDF &amp; Archival
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Group 3: Help, Support & About */}
          {(!searchQuery || 'help faq questions support about privacy legal rate share feedback version'.includes(searchQuery.toLowerCase())) && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-1">
                Help, Support &amp; About
              </span>
              <div className="neu-card rounded-3xl divide-y divide-slate-200/60 dark:divide-slate-800/60 overflow-hidden">
                {/* FAQ */}
                {(!searchQuery || 'faq questions formulas guide attendance rules'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('faq')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-teal-600 dark:text-teal-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Frequently Asked Questions</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Attendance math, safe bunk rules &amp; how-to guide
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}

                {/* About & Support */}
                {(!searchQuery || 'about support legal version rate share feedback github privacy terms'.includes(searchQuery.toLowerCase())) && (
                  <div
                    onClick={() => setActiveSubPage('about')}
                    className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="neu-flat-sm w-11 h-11 rounded-2xl text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">About &amp; Legal</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Version v{APP_VERSION_NAME} &bull; Privacy &bull; GitHub &bull; Feedback
                        </p>
                      </div>
                    </div>
                    <ThemedIcon name="chevronRight" size={16} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unified Clean Footer */}
          <footer className="pt-6 pb-2 text-center space-y-2 opacity-90">
            <div className="neu-flat-sm inline-flex items-center gap-2 px-3.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">BunkCalc v{APP_VERSION_NAME}</span>
            </div>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Zero Internet Needed &bull; 100% Private Offline Storage
            </p>
          </footer>
        </div>
      )}

      {/* ── SUBPAGE 1: ACADEMIC & GOALS ── */}
      {activeSubPage === 'academic' && (
        <AcademicSettings
          settings={settings}
          setSettings={setSettings}
          onBack={() => setActiveSubPage(null)}
        />
      )}

      {/* ── SUBPAGE 2: HOLIDAYS & EXAM BREAKS ── */}
      {activeSubPage === 'holidays' && (
        <HolidaySettings
          settings={settings}
          addHoliday={addHoliday}
          updateHoliday={updateHoliday}
          deleteHoliday={deleteHoliday}
          onBack={() => setActiveSubPage(null)}
          onShowModal={(m) => setModal({ ...m, onCancel: () => setModal(null) })}
        />
      )}

      {/* ── SUBPAGE 3: SYNC & CALENDAR EXPORT ── */}
      {activeSubPage === 'sync' && (
        <SyncSettings
          subjects={subjects}
          settings={settings}
          records={records}
          onBack={() => setActiveSubPage(null)}
          onShowModal={(m) => setModal({ ...m, onCancel: () => setModal(null) })}
        />
      )}

      {/* ── SUBPAGE 4: NOTIFICATIONS ── */}
      {activeSubPage === 'notifications' && (
        <NotificationSettings
          settings={settings}
          setSettings={setSettings}
          onBack={() => setActiveSubPage(null)}
          onShowModal={(m) => setModal({ ...m, onCancel: () => setModal(null) })}
        />
      )}

      {/* ── SUBPAGE 5: SECURITY & PIN LOCK ── */}
      {activeSubPage === 'security' && (
        <SecuritySettings
          settings={settings}
          setSettings={setSettings}
          onBack={() => setActiveSubPage(null)}
          onOpenPinModal={(mode) => setPinModalMode(mode)}
          onShowModal={(m) => setModal({ ...m, onCancel: () => setModal(null) })}
        />
      )}

      {/* ── SUBPAGE 6: APPEARANCE & THEME ── */}
      {activeSubPage === 'appearance' && (
        <AppearanceSettings
          settings={settings}
          setSettings={setSettings}
          onBack={() => setActiveSubPage(null)}
        />
      )}

      {/* ── SUBPAGE 7: MANAGE SUBJECTS ── */}
      {activeSubPage === 'subjects' && (
        <SubjectSettings
          subjects={subjects}
          onDeleteSubject={handleDeleteSubject}
          onBack={() => setActiveSubPage(null)}
        />
      )}

      {/* ── SUBPAGE 8: DATA, BACKUP & EXPORT ── */}
      {activeSubPage === 'data' && (
        <DataSettings
          archivedSemesters={archivedSemesters}
          deleteArchivedSemester={deleteArchivedSemester}
          onBack={() => setActiveSubPage(null)}
          onOpenArchiveModal={() => setShowArchiveModal(true)}
          onShowModal={(m) => setModal({ ...m, onCancel: () => setModal(null) })}
        />
      )}

      {/* ── SUBPAGE 9: FAQ & GUIDE ── */}
      {activeSubPage === 'faq' && (
        <div className="animate-in fade-in duration-150 space-y-6">
          <SubHeader
            title="Frequently Asked Questions"
            subtitle="Attendance calculations & app guide"
            onBack={() => setActiveSubPage(null)}
          />
          <Suspense fallback={<SkeletonLoader height="h-64" />}>
            <FaqSection />
          </Suspense>
        </div>
      )}

      {/* ── SUBPAGE 10: ABOUT, LEGAL & SUPPORT ── */}
      {activeSubPage === 'about' && (
        <AboutSettings
          onBack={() => setActiveSubPage(null)}
          onRate={handleRate}
          onShare={handleShare}
          onFeedback={handleFeedback}
          onOpenLegal={(leg) => setLegal(leg)}
        />
      )}

      {/* Modals */}
      {legal && (
        <Suspense fallback={<SkeletonLoader height="h-64" />}>
          <LegalModal 
            title={legal.title}
            type={legal.type}
            onClose={() => setLegal(null)}
          />
        </Suspense>
      )}

      {/* Archive Semester Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive Current Semester</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Save your current attendance records and subjects into your archive history, then start a fresh semester.
            </p>
            <input 
              placeholder="e.g. 5th Semester (Autumn 2026)"
              value={archiveName}
              onChange={(e) => setArchiveName(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowArchiveModal(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleArchiveSemester}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20"
              >
                Archive &amp; Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AppModal Dialog */}
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

      {/* Visual PIN Setup / Change Modal */}
      {pinModalMode && (
        <PinSetupModal
          isOpen={true}
          initialMode={pinModalMode}
          currentPin={settings.appLockPin}
          onClose={() => setPinModalMode(null)}
          onSuccess={(pin) => {
            setSettings({
              ...settings,
              appLockEnabled: true,
              appLockPin: pin,
            });
            setPinModalMode(null);
            setModal({
              isOpen: true,
              title: pinModalMode === 'change' ? "PIN Changed" : "PIN Configured",
              message: "Your 4-digit passcode protection is active.",
              type: "success",
              confirmText: "Great!",
              onConfirm: () => setModal(null)
            });
          }}
        />
      )}
    </div>
  );
};

export default Settings;

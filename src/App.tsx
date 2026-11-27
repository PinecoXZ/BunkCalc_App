import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { useSettings } from './store/useSettings';
import { useSubjects } from './store/useSubjects';
import { useAttendance } from './store/useAttendance';
import { migrateStorageIfNeeded } from './lib/storage';
import Home from './pages/Home';
import Today from './pages/Today';
import Statistics from './pages/Statistics';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import SkeletonLoader from './components/SkeletonLoader';
import ErrorBoundary from './components/ErrorBoundary';
import type { TabType } from './components/BottomNav';
import type { Subject, AttendanceStatus } from './lib/types';
import { scheduleDailyClassReminders, initNotificationActionTypes, cancelAllNotifications } from './lib/notifications';
import { toISODateStr } from './lib/dateUtils';
import { useUpdateStore } from './store/useUpdateStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { v4 as uuidv4 } from 'uuid';
import { AppModal } from './components/AppModal';

// Views with background preloading
const Settings = lazy(() => import('./pages/Settings'));
const Setup = lazy(() => import('./pages/Setup'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'));
const GlobalHistory = lazy(() => import('./pages/GlobalHistory'));
const OnboardingCarousel = lazy(() => import('./components/OnboardingCarousel'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
import { WhatsNewFlashCard } from './components/WhatsNewFlashCard';
import { AppLockModal } from './components/AppLockModal';
import { UpdateBanner } from './components/UpdateBanner';
import { executeBackHandler } from './lib/backHandler';
import { APP_VERSION_NAME } from './lib/constants';
import { clearAppLockSuppression, shouldSuppressAppLock } from './lib/appLockBridge';

function App() {
  const { settings, loadSettings, loadArchivedSemesters, storageError: settingsError, clearStorageError: clearSettingsError } = useSettings();
  const { loadSubjects, subjects, storageError: subjectsError, clearStorageError: clearSubjectsError } = useSubjects();
  const { loadRecords, storageError: attendanceError, clearStorageError: clearAttendanceError } = useAttendance();

  const activeStorageError = attendanceError || subjectsError || settingsError;
  const clearAllStorageErrors = useCallback(() => {
    clearAttendanceError();
    clearSubjectsError();
    clearSettingsError();
  }, [clearAttendanceError, clearSubjectsError, clearSettingsError]);

  // Splash & load state
  const [showSplash, setShowSplash] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [homeVisible, setHomeVisible] = useState(false);     // controls fade-in opacity
  const [showWhatsNewFlashCard, setShowWhatsNewFlashCard] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'today' || tabParam === 'stats' || tabParam === 'settings') {
        return tabParam;
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const navStateRef = useRef({
    showSplash,
    selectedSubject,
    showHistory,
    showCalendar,
    activeTab,
  });

  useEffect(() => {
    navStateRef.current = {
      showSplash,
      selectedSubject,
      showHistory,
      showCalendar,
      activeTab,
    };
  }, [showSplash, selectedSubject, showHistory, showCalendar, activeTab]);

  // ── Back button handler (registered once; reads current nav state via ref) ──
  useEffect(() => {
    let cancelled = false;
    let backButtonListener: { remove: () => Promise<void> } | null = null;

    const setupBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const handle = await CapApp.addListener('backButton', () => {
          const state = navStateRef.current;
          if (state.showSplash) return; // ignore during splash

          // First check if any registered sub-view/modal handler consumed the back press
          if (executeBackHandler()) {
            return;
          }

          if (state.selectedSubject) {
            setSelectedSubject(null);
          } else if (state.showHistory) {
            setShowHistory(false);
          } else if (state.showCalendar) {
            setShowCalendar(false);
          } else if (state.activeTab !== 'dashboard') {
            setActiveTab('dashboard');
          } else {
            CapApp.exitApp();
          }
        });

        if (cancelled) {
          handle.remove().catch(() => {});
        } else {
          backButtonListener = handle;
        }
      } catch (err) {
        console.warn('Native backButton listener not supported:', err);
      }
    };

    setupBackButton();

    return () => {
      cancelled = true;
      backButtonListener?.remove().catch(() => {});
    };
  }, []);

  // ── Load data in parallel with splash animation ──
  useEffect(() => {
    let cancelled = false;
    let actionListener: { remove: () => Promise<void> } | null = null;
    let initSucceeded = false;
    let resolveInit!: () => void;
    const initDone = new Promise<void>((res) => {
      resolveInit = res;
    });

    const init = async () => {
      try {
        await migrateStorageIfNeeded();
        await Promise.all([
          loadSettings(),
          loadSubjects(),
          loadRecords(),
          loadArchivedSemesters(),
        ]);
        initSucceeded = true;

        const currentSubjects = useSubjects.getState().subjects;
        const currentSettings = useSettings.getState().settings;
        const currentRecords = useAttendance.getState().records;

        if (!cancelled && currentSettings.appLockEnabled && currentSettings.appLockPin) {
          setIsAppLocked(true);
        }

        await initNotificationActionTypes();

        if (currentSubjects.length > 0) {
          await scheduleDailyClassReminders(currentSubjects, currentSettings, currentRecords);
        } else {
          await cancelAllNotifications();
          try {
            if (!localStorage.getItem('bunkcalc_last_seen_version')) {
              localStorage.setItem('bunkcalc_last_seen_version', APP_VERSION_NAME);
            }
          } catch {
            // ignore
          }
        }

        if (!cancelled && currentSubjects.length === 0 && useSettings.getState().archivedSemesters.length === 0) {
          setShowOnboarding(true);
        }

        if (currentSettings.autoUpdateCheck !== false) {
          useUpdateStore.getState().checkForUpdates();
        }
      } catch (err) {
        console.error('Initialization failed:', err);
      } finally {
        resolveInit();
        if (!cancelled) {
          setDataReady(true);
        }
      }

      // Preload Settings chunk quietly in the background so opening it is instantaneous
      if (!cancelled && typeof window !== 'undefined') {
        setTimeout(() => {
          import('./pages/Settings').catch(() => {});
        }, 1000);
      }
    };
    init();

    const setupActionListener = async () => {
      try {
        const handle = await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
          const actionId = action.actionId;
          const subjectId = action.notification.extra?.subjectId;
          const slot = typeof action.notification.extra?.slot === 'string' ? action.notification.extra.slot : undefined;

          if (subjectId && (actionId === 'mark_present' || actionId === 'mark_absent' || actionId === 'mark_cancelled')) {
            await initDone;
            if (!initSucceeded) return;
            const status: AttendanceStatus = actionId === 'mark_present' ? 'present' : actionId === 'mark_absent' ? 'absent' : 'cancelled';
            const todayStr = toISODateStr(new Date());
            await useAttendance.getState().markAttendance({
              id: uuidv4(),
              subjectId,
              date: todayStr,
              slot,
              status,
            });
          }
        });
        if (cancelled) {
          handle.remove().catch(() => {});
        } else {
          actionListener = handle;
        }
      } catch (err) {
        console.warn('LocalNotification action listener not supported:', err);
      }
    };
    setupActionListener();

    return () => {
      cancelled = true;
      actionListener?.remove().catch(() => {});
    };
  }, [loadSettings, loadSubjects, loadRecords, loadArchivedSemesters]);

  // ── App Lock Background / Resume Lifecycle ──
  useEffect(() => {
    if (!settings?.appLockEnabled || !settings?.appLockPin) {
      return;
    }

    let cancelled = false;
    let stateListener: { remove: () => Promise<void> } | null = null;

    const setupAppStateListener = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const handle = await CapApp.addListener('appStateChange', (state) => {
          if (state.isActive) {
            clearAppLockSuppression();
            return;
          }
          if (!shouldSuppressAppLock() && settings?.appLockEnabled && settings?.appLockPin) {
            setIsAppLocked(true);
          }
        });
        if (cancelled) {
          handle.remove().catch(() => {});
        } else {
          stateListener = handle;
        }
      } catch (err) {
        console.warn('Native appStateChange listener not supported:', err);
      }
    };
    setupAppStateListener();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearAppLockSuppression();
        return;
      }
      if (
        document.visibilityState === 'hidden' &&
        !shouldSuppressAppLock() &&
        settings?.appLockEnabled &&
        settings?.appLockPin
      ) {
        setIsAppLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      stateListener?.remove().catch(() => {});
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings?.appLockEnabled, settings?.appLockPin]);

  const handleUnlock = useCallback(() => {
    setIsAppLocked(false);
  }, []);

  // ── Splash complete callback ──
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHomeVisible(true);
        // Show What's New flash card ONLY ONCE after user updates app
        try {
          const lastSeen = localStorage.getItem('bunkcalc_last_seen_version');
          const currentSubjects = useSubjects.getState().subjects;
          if (lastSeen !== APP_VERSION_NAME && currentSubjects.length > 0) {
            setShowWhatsNewFlashCard(true);
          }
        } catch {
          // ignore
        }
      });
    });
  }, []);

  // If data hasn't loaded yet AND splash finished, show a minimal loader
  if (!dataReady && !showSplash) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#eef1f7] dark:bg-[#0f1218] text-slate-900 dark:text-white gap-6 p-8">
        <div className="text-2xl font-bold animate-pulse italic text-blue-500">BunkCalc</div>
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary>
        {/* Splash overlay – sits above everything */}
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

        {/* Main app content – starts hidden, fades in over 300ms */}
        {dataReady && (
          <div
            style={{
              opacity: homeVisible ? 1 : 0,
              transition: 'opacity 300ms ease-in',
            }}
            className="min-h-screen bg-[#eef1f7] dark:bg-[#0f1218] text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-24"
          >
            <UpdateBanner />
            <Suspense fallback={<div className="p-6"><SkeletonLoader height="h-64" /></div>}>
              {showOnboarding && subjects.length === 0 ? (
                <OnboardingCarousel onComplete={() => setShowOnboarding(false)} />
              ) : subjects.length === 0 ? (
                <Setup />
              ) : (
                <>
                  {renderMainContent()}
                  {!selectedSubject && !showHistory && !showCalendar && (
                    <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
                  )}
                </>
              )}
            </Suspense>
          </div>
        )}

        {/* What's New Flash Card - Appears only once after app update */}
        {showWhatsNewFlashCard && (
          <WhatsNewFlashCard
            isOpen={true}
            onClose={() => {
              try {
                localStorage.setItem('bunkcalc_last_seen_version', APP_VERSION_NAME);
              } catch {
                // ignore
              }
              setShowWhatsNewFlashCard(false);
            }}
          />
        )}

        {/* Security PIN & Fingerprint Lock Overlay */}
        {settings?.appLockEnabled && settings?.appLockPin && isAppLocked && dataReady && !showSplash && (
          <AppLockModal
            correctPin={settings.appLockPin}
            biometricsEnabled={settings?.biometricsEnabled !== false}
            onSuccess={handleUnlock}
          />
        )}

        {/* Storage Error Alert */}
        {activeStorageError && (
          <AppModal
            isOpen={true}
            title="Storage Error"
            message={activeStorageError}
            type="error"
            confirmText="OK"
            onConfirm={clearAllStorageErrors}
          />
        )}
      </ErrorBoundary>
    </>
  );

  function renderMainContent() {
    if (selectedSubject) {
      return (
        <SubjectDetail
          subject={selectedSubject}
          onBack={() => setSelectedSubject(null)}
        />
      );
    }

    if (showHistory) {
      return <GlobalHistory onBack={() => setShowHistory(false)} />;
    }

    if (showCalendar) {
      return <CalendarView onBack={() => setShowCalendar(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Home onSelectSubject={(s) => setSelectedSubject(s)} onOpenCalendar={() => setShowCalendar(true)} />;
      case 'today':
        return <Today />;
      case 'stats':
        return <Statistics onOpenHistory={() => setShowHistory(true)} />;
      case 'settings':
        return <Settings />;
      default:
        return <Home onSelectSubject={(s) => setSelectedSubject(s)} onOpenCalendar={() => setShowCalendar(true)} />;
    }
  }
}

export default App;

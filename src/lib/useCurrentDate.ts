import { useSyncExternalStore } from 'react';
import { toISODateStr } from './dateUtils';

interface DateSnapshot {
  now: Date;
  todayStr: string;
}

let currentSnapshot: DateSnapshot = (() => {
  const now = new Date();
  return { now, todayStr: toISODateStr(now) };
})();

const listeners = new Set<() => void>();
let teardownSharedListeners: (() => void) | null = null;

function refreshSnapshot() {
  const now = new Date();
  const todayStr = toISODateStr(now);
  // Update snapshot (preserves stable reference within same minute/day if called needlessly)
  if (
    now.getMinutes() !== currentSnapshot.now.getMinutes() ||
    now.getHours() !== currentSnapshot.now.getHours() ||
    todayStr !== currentSnapshot.todayStr
  ) {
    currentSnapshot = { now, todayStr };
    listeners.forEach((l) => l());
  }
}

function startSharedListeners() {
  const timer = setInterval(refreshSnapshot, 60000);
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') refreshSnapshot();
  };

  window.addEventListener('focus', refreshSnapshot);
  document.addEventListener('visibilitychange', handleVisibility);

  let cancelled = false;
  let stateListener: { remove: () => Promise<void> } | null = null;
  import('@capacitor/app')
    .then(({ App }) =>
      App.addListener('appStateChange', (state) => {
        if (state.isActive) refreshSnapshot();
      })
    )
    .then((handle) => {
      if (cancelled) {
        handle.remove().catch(() => {});
      } else {
        stateListener = handle;
      }
    })
    .catch(() => {
      // Ignore on web environments without Capacitor App plugin
    });

  return () => {
    cancelled = true;
    clearInterval(timer);
    window.removeEventListener('focus', refreshSnapshot);
    document.removeEventListener('visibilitychange', handleVisibility);
    stateListener?.remove().catch(() => {});
  };
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') {
    teardownSharedListeners = startSharedListeners();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && teardownSharedListeners) {
      teardownSharedListeners();
      teardownSharedListeners = null;
    }
  };
}

function getSnapshot(): DateSnapshot {
  return currentSnapshot;
}

/**
 * Provides reactive current Date & YYYY-MM-DD local date string via a single shared
 * clock/lifecycle subscription so midnight rollovers and app resumes stay fresh.
 */
export function useCurrentDate(): DateSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

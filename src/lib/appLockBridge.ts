let suppressUntilTimestamp = 0;

/**
 * Temporarily suppresses automatic App PIN re-locking when launching native
 * Android share sheets or file pickers so returning to the app does not lock
 * the user out of in-progress feedback dialogs.
 */
export function suppressAppLockTemporarily(durationMs: number = 30000): void {
  suppressUntilTimestamp = Math.max(suppressUntilTimestamp, Date.now() + durationMs);
}

/**
 * Returns true if automatic background locking is temporarily suppressed.
 */
export function shouldSuppressAppLock(): boolean {
  return Date.now() < suppressUntilTimestamp;
}

/**
 * Clears any active lock suppression window once the user has resumed.
 */
export function clearAppLockSuppression(): void {
  suppressUntilTimestamp = 0;
}

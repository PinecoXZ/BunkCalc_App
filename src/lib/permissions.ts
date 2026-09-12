import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Gracefully checks and requests notification permission using the Capacitor LocalNotifications plugin.
 * Safe to call on web and across different native platforms.
 * 
 * @returns Promise<boolean> True if permission is granted, false otherwise.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (!LocalNotifications) {
      console.warn('LocalNotifications plugin is not loaded/available.');
      return false;
    }

    const check = await LocalNotifications.checkPermissions();
    if (check.display === 'granted') {
      return true;
    }

    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  } catch (error) {
    console.warn('Failed to ensure notification permission: ', error);
    // Graceful fallback for non-supported browsers or environments
    if (typeof Notification !== 'undefined') {
      try {
        if (Notification.permission === 'granted') {
          return true;
        }
        const webPermission = await Notification.requestPermission();
        return webPermission === 'granted';
      } catch (webErr) {
        console.warn('Web notification API permission request failed:', webErr);
      }
    }
    return false;
  }
}

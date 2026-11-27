import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUpdateStore, isSafeHttpsUrl, isTrustedApkUrl } from '../useUpdateStore';
import { APP_VERSION_CODE, APP_VERSION_NAME, DEFAULT_APK_DOWNLOAD_URL } from '../../lib/constants';

vi.mock('../../lib/notifications', () => ({
  notifyAppUpdateAvailable: vi.fn().mockResolvedValue(undefined),
}));

describe('useUpdateStore', () => {
  beforeEach(() => {
    useUpdateStore.setState({
      isUpdateAvailable: false,
      latestVersion: '',
      apkUrl: '',
      changelog: '',
      isChecking: false,
      lastChecked: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates HTTPS URLs strictly', () => {
    expect(isSafeHttpsUrl('https://bunk-calc-web.vercel.app/bunkcalc.apk')).toBe(true);
    expect(isSafeHttpsUrl('http://insecure.example.com/a.apk')).toBe(false);
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
  });

  it('short-circuits fallback fetches when primary endpoint confirms app is up-to-date', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        versionCode: APP_VERSION_CODE,
        versionName: APP_VERSION_NAME,
        apkUrl: 'https://bunk-calc-web.vercel.app/bunkcalc.apk',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const hasUpdate = await useUpdateStore.getState().checkForUpdates(true);
    expect(hasUpdate).toBe(false);
    expect(useUpdateStore.getState().isUpdateAvailable).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('detects newer version and sanitizes unsafe apkUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        versionCode: APP_VERSION_CODE + 1,
        versionName: '2.9.0',
        apkUrl: 'javascript:alert(1)',
        changelog: 'Security fix',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const hasUpdate = await useUpdateStore.getState().checkForUpdates(true);
    expect(hasUpdate).toBe(true);
    const state = useUpdateStore.getState();
    expect(state.isUpdateAvailable).toBe(true);
    expect(state.latestVersion).toBe('2.9.0');
    expect(state.apkUrl.startsWith('https://')).toBe(true);
  });

  it('ignores prerelease Atom tags when falling back', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false }) // raw json
      .mockResolvedValueOnce({ ok: false }) // github api
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<feed><entry><id>tag:github.com,2008:Repository/1/v9.0.0-beta.1</id></entry></feed>',
      }) // atom prerelease -> ignored
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          versionCode: APP_VERSION_CODE,
          versionName: APP_VERSION_NAME,
        }),
      }); // vercel fallback -> up to date
    vi.stubGlobal('fetch', fetchMock);

    const hasUpdate = await useUpdateStore.getState().checkForUpdates(true);
    expect(hasUpdate).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('rejects untrusted apkUrl hosts and falls back to DEFAULT_APK_DOWNLOAD_URL', async () => {
    expect(isTrustedApkUrl('https://bunk-calc-web.vercel.app/bunkcalc.apk')).toBe(true);
    expect(isTrustedApkUrl('https://github.com/PinecoXZ/BunkCalc/releases/latest')).toBe(true);
    expect(isTrustedApkUrl('https://evil.example.com/payload.apk')).toBe(false);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        versionCode: APP_VERSION_CODE + 2,
        versionName: '3.0.0',
        apkUrl: 'https://evil.example.com/payload.apk',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const hasUpdate = await useUpdateStore.getState().checkForUpdates(true);
    expect(hasUpdate).toBe(true);
    expect(useUpdateStore.getState().apkUrl).toBe(DEFAULT_APK_DOWNLOAD_URL);
  });
});

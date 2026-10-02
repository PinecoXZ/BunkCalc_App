import { create } from 'zustand';
import {
  APP_VERSION_CODE,
  APP_VERSION_NAME,
  GITHUB_RAW_VERSION_URL,
  GITHUB_RELEASES_API_URL,
  GITHUB_RELEASES_ATOM_URL,
  GITHUB_RELEASES_LATEST_URL,
  VERSION_JSON_URL,
  DEFAULT_APK_DOWNLOAD_URL,
} from '../lib/constants';
import { isNewerVersion, extractVersionString } from '../lib/versionUtils';
import { notifyAppUpdateAvailable } from '../lib/notifications';

export interface VersionInfo {
  versionCode?: number;
  versionName: string;
  apkUrl: string;
  changelog?: string;
  releaseUrl?: string;
}

interface UpdateState {
  isUpdateAvailable: boolean;
  latestVersion: string;
  apkUrl: string;
  changelog: string;
  isChecking: boolean;
  lastChecked: number | null;
  checkForUpdates: (force?: boolean) => Promise<boolean>;
  dismissUpdate: () => void;
}

/**
 * Helper to perform a fetch with a strict timeout to prevent hung requests.
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 6000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Strategy 1: Fetch raw version.json from GitHub main branch.
 */
async function checkGithubRaw(): Promise<VersionInfo | null> {
  try {
    const res = await fetchWithTimeout(`${GITHUB_RAW_VERSION_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && (data.versionName || data.versionCode)) {
      return {
        versionCode: typeof data.versionCode === 'number' ? data.versionCode : undefined,
        versionName: data.versionName || '',
        apkUrl: data.apkUrl || DEFAULT_APK_DOWNLOAD_URL,
        changelog: data.changelog || '',
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Strategy 2: Fetch latest release metadata from GitHub REST API.
 */
async function checkGithubApi(): Promise<VersionInfo | null> {
  try {
    const res = await fetchWithTimeout(GITHUB_RELEASES_API_URL, 6000);
    if (!res.ok) return null;
    const data = await res.json();
    const tag = extractVersionString(data.tag_name || data.name || '');
    if (!tag) return null;

    // Find direct APK download asset if present
    let apkUrl = data.html_url || GITHUB_RELEASES_LATEST_URL;
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: { name?: string; browser_download_url?: string }) =>
        a.name?.toLowerCase().endsWith('.apk')
      );
      if (apkAsset?.browser_download_url) {
        apkUrl = apkAsset.browser_download_url;
      }
    }

    return {
      versionName: tag,
      apkUrl,
      changelog: data.body || '',
      releaseUrl: data.html_url,
    };
  } catch {
    // ignore
  }
  return null;
}

/**
 * Strategy 3: Parse GitHub Releases Atom Feed.
 */
async function checkGithubAtom(): Promise<VersionInfo | null> {
  try {
    const res = await fetchWithTimeout(GITHUB_RELEASES_ATOM_URL, 6000);
    if (!res.ok) return null;
    const text = await res.text();
    const tagMatch = text.match(/<id>tag:github\.com,2008:Repository\/\d+\/(v?[\d.]+)<\/id>/i)
      || text.match(/<title>BunkCalc (v?[\d.]+)<\/title>/i)
      || text.match(/<link[^>]+href="https:\/\/github\.com\/[^"]+\/releases\/tag\/(v?[\d.]+)"/i);

    if (tagMatch && tagMatch[1]) {
      const tag = extractVersionString(tagMatch[1]);
      if (tag) {
        return {
          versionName: tag,
          apkUrl: GITHUB_RELEASES_LATEST_URL,
          changelog: '',
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Strategy 4: Fallback to Vercel hosted version.json.
 */
async function checkVercelJson(): Promise<VersionInfo | null> {
  try {
    const res = await fetchWithTimeout(`${VERSION_JSON_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && (data.versionName || data.versionCode)) {
      return {
        versionCode: typeof data.versionCode === 'number' ? data.versionCode : undefined,
        versionName: data.versionName || '',
        apkUrl: data.apkUrl || DEFAULT_APK_DOWNLOAD_URL,
        changelog: data.changelog || '',
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  isUpdateAvailable: false,
  latestVersion: '',
  apkUrl: '',
  changelog: '',
  isChecking: false,
  lastChecked: null,

  checkForUpdates: async () => {
    set({ isChecking: true });

    const current = {
      versionCode: APP_VERSION_CODE,
      versionName: APP_VERSION_NAME,
    };

    // Sequentially try sources from highest to lowest freshness
    const candidateSources = [checkGithubRaw, checkGithubApi, checkGithubAtom, checkVercelJson];

    for (const fetchStrategy of candidateSources) {
      const remote = await fetchStrategy();
      if (remote) {
        const isNewer = isNewerVersion(remote, current);
        if (isNewer) {
          const latestVersion = remote.versionName || `v${remote.versionCode || ''}`;
          const apkUrl = remote.apkUrl || DEFAULT_APK_DOWNLOAD_URL;
          const changelog = remote.changelog || '';

          set({
            isUpdateAvailable: true,
            latestVersion,
            apkUrl,
            changelog,
            isChecking: false,
            lastChecked: Date.now(),
          });

          // Deliver local notification for the new version
          await notifyAppUpdateAvailable(latestVersion);
          return true;
        }
      }
    }

    set({
      isUpdateAvailable: false,
      isChecking: false,
      lastChecked: Date.now(),
    });
    return false;
  },

  dismissUpdate: () => {
    set({ isUpdateAvailable: false });
  },
}));

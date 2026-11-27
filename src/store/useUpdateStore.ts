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

const TRUSTED_APK_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'bunk-calc-web.vercel.app',
]);

/** Validates that an update download URL uses HTTPS. */
export function isSafeHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validates that an APK URL uses HTTPS and points to a trusted release host. */
export function isTrustedApkUrl(url: string): boolean {
  if (!isSafeHttpsUrl(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRUSTED_APK_HOSTS.has(host) || host.endsWith('.github.com') || host.endsWith('.githubusercontent.com');
  } catch {
    return false;
  }
}

function sanitizeApkUrl(url: unknown, fallback: string): string {
  if (typeof url === 'string' && isTrustedApkUrl(url.trim())) {
    return url.trim();
  }
  return fallback;
}

function isPrereleaseTag(raw: string): boolean {
  return /(?:^|[-+.\s])(alpha|beta|rc|dev|preview|canary)/i.test(raw);
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

function parseVersionJsonPayload(data: unknown): VersionInfo | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const versionName = typeof record.versionName === 'string' ? record.versionName : '';
  const versionCode = typeof record.versionCode === 'number' ? record.versionCode : undefined;
  if (!versionName && versionCode === undefined) return null;
  if (versionName && isPrereleaseTag(versionName)) return null;

  return {
    versionCode,
    versionName,
    apkUrl: sanitizeApkUrl(record.apkUrl, DEFAULT_APK_DOWNLOAD_URL),
    changelog: typeof record.changelog === 'string' ? record.changelog : '',
  };
}

/**
 * Strategy 1: Fetch raw version.json from GitHub main branch.
 */
async function checkGithubRaw(): Promise<VersionInfo | null> {
  try {
    const res = await fetchWithTimeout(`${GITHUB_RAW_VERSION_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return parseVersionJsonPayload(data);
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
    if (data.draft || data.prerelease) return null;

    const rawTag = String(data.tag_name || data.name || '');
    if (isPrereleaseTag(rawTag)) return null;

    const tag = extractVersionString(rawTag);
    if (!tag) return null;

    let apkUrl = sanitizeApkUrl(data.html_url, GITHUB_RELEASES_LATEST_URL);
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: { name?: string; browser_download_url?: string }) =>
        a.name?.toLowerCase().endsWith('.apk')
      );
      if (apkAsset?.browser_download_url) {
        apkUrl = sanitizeApkUrl(apkAsset.browser_download_url, apkUrl);
      }
    }

    return {
      versionName: tag,
      apkUrl,
      changelog: typeof data.body === 'string' ? data.body : '',
      releaseUrl: typeof data.html_url === 'string' ? data.html_url : undefined,
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
    const tagMatch = text.match(/<id>tag:github\.com,2008:Repository\/\d+\/([^<]+)<\/id>/i)
      || text.match(/<title>BunkCalc ([^<]+)<\/title>/i)
      || text.match(/<link[^>]+href="https:\/\/github\.com\/[^"]+\/releases\/tag\/([^"]+)"/i);

    if (tagMatch && tagMatch[1]) {
      const rawTag = tagMatch[1];
      if (isPrereleaseTag(rawTag)) return null;
      const tag = extractVersionString(rawTag);
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
    return parseVersionJsonPayload(data);
  } catch {
    // ignore
  }
  return null;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  isUpdateAvailable: false,
  latestVersion: '',
  apkUrl: '',
  changelog: '',
  isChecking: false,
  lastChecked: null,

  checkForUpdates: async (force = false) => {
    if (get().isChecking && !force) return get().isUpdateAvailable;
    set({ isChecking: true });

    const current = {
      versionCode: APP_VERSION_CODE,
      versionName: APP_VERSION_NAME,
    };

    // Try sources from highest to lowest freshness; stop once any source responds cleanly.
    const candidateSources = [checkGithubRaw, checkGithubApi, checkGithubAtom, checkVercelJson];

    for (const fetchStrategy of candidateSources) {
      const remote = await fetchStrategy();
      if (remote) {
        const isNewer = isNewerVersion(remote, current);
        if (isNewer) {
          const latestVersion = remote.versionName || `v${remote.versionCode || ''}`;
          const apkUrl = sanitizeApkUrl(remote.apkUrl, DEFAULT_APK_DOWNLOAD_URL);
          const changelog = remote.changelog || '';

          set({
            isUpdateAvailable: true,
            latestVersion,
            apkUrl,
            changelog,
            isChecking: false,
            lastChecked: Date.now(),
          });

          await notifyAppUpdateAvailable(latestVersion);
          return true;
        }

        set({
          isUpdateAvailable: false,
          isChecking: false,
          lastChecked: Date.now(),
        });
        return false;
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

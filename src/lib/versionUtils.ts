/**
 * Version Utilities for BunkCalc Update Checking
 */

/**
 * Compares two semantic version strings (e.g. "2.2.5", "v2.2.6", "2.3.0-beta", "v1.1.0").
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || '').trim().replace(/^[vV]/, '').split(/[-+]/)[0];
  const clean2 = (v2 || '').trim().replace(/^[vV]/, '').split(/[-+]/)[0];

  const parts1 = clean1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length, 3);
  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Extracts a clean semantic version string from text, title, or tag.
 * e.g. "BunkCalc v2.2.5" -> "2.2.5", "v2.3.0" -> "2.3.0", "tag:github.com,2008:.../v2.2.5" -> "2.2.5"
 */
export function extractVersionString(text: string): string | null {
  if (!text) return null;
  const match = text.match(/v?(\d+\.\d+(\.\d+)?)/i);
  return match ? match[1] : null;
}

/**
 * Determines whether a remote version is strictly newer than the current installed version.
 */
export function isNewerVersion(
  remote: { versionCode?: number; versionName?: string },
  current: { versionCode: number; versionName: string }
): boolean {
  if (typeof remote.versionCode === 'number' && remote.versionCode > current.versionCode) {
    return true;
  }
  if (remote.versionName && compareSemver(remote.versionName, current.versionName) > 0) {
    return true;
  }
  return false;
}

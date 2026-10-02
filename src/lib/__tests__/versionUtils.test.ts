import { describe, it, expect } from 'vitest';
import { compareSemver, extractVersionString, isNewerVersion } from '../versionUtils';

describe('Version Utilities (compareSemver, extractVersionString, isNewerVersion)', () => {
  describe('compareSemver', () => {
    it('returns 0 for identical versions', () => {
      expect(compareSemver('2.2.5', '2.2.5')).toBe(0);
      expect(compareSemver('v2.2.5', '2.2.5')).toBe(0);
      expect(compareSemver('V2.2.5', 'v2.2.5')).toBe(0);
    });

    it('returns 1 when v1 is newer than v2', () => {
      // Patch version increase
      expect(compareSemver('2.2.6', '2.2.5')).toBe(1);
      expect(compareSemver('v2.2.6', '2.2.5')).toBe(1);

      // Minor version increase
      expect(compareSemver('2.3.0', '2.2.5')).toBe(1);
      expect(compareSemver('2.3.0', '2.2.99')).toBe(1);

      // Major version increase
      expect(compareSemver('3.0.0', '2.2.5')).toBe(1);

      // 2-digit vs 3-digit
      expect(compareSemver('2.3', '2.2.5')).toBe(1);
    });

    it('returns -1 when v1 is older than v2', () => {
      expect(compareSemver('2.2.4', '2.2.5')).toBe(-1);
      expect(compareSemver('2.1.9', '2.2.0')).toBe(-1);
      expect(compareSemver('1.9.9', '2.0.0')).toBe(-1);
    });

    it('handles suffixes and cleanups gracefully', () => {
      expect(compareSemver('2.2.6-beta', '2.2.5')).toBe(1);
      expect(compareSemver('2.2.5-rc1', '2.2.5')).toBe(0);
    });
  });

  describe('extractVersionString', () => {
    it('extracts semantic version from various tag patterns', () => {
      expect(extractVersionString('v2.2.5')).toBe('2.2.5');
      expect(extractVersionString('V2.2.6')).toBe('2.2.6');
      expect(extractVersionString('2.3.0')).toBe('2.3.0');
      expect(extractVersionString('BunkCalc v2.2.5')).toBe('2.2.5');
      expect(extractVersionString('Release 3.0.0 (Latest)')).toBe('3.0.0');
      expect(extractVersionString('tag:github.com,2008:Repository/1245380666/v2.2.5')).toBe('2.2.5');
    });

    it('returns null for invalid strings', () => {
      expect(extractVersionString('')).toBeNull();
      expect(extractVersionString('no-version-here')).toBeNull();
    });
  });

  describe('isNewerVersion', () => {
    const current = { versionCode: 12, versionName: '2.2.5' };

    it('detects update when versionCode is higher', () => {
      expect(isNewerVersion({ versionCode: 13, versionName: '2.2.5' }, current)).toBe(true);
      expect(isNewerVersion({ versionCode: 14, versionName: '2.2.6' }, current)).toBe(true);
    });

    it('detects update when versionName is higher even if versionCode is missing', () => {
      expect(isNewerVersion({ versionName: '2.2.6' }, current)).toBe(true);
      expect(isNewerVersion({ versionName: '2.3.0' }, current)).toBe(true);
      expect(isNewerVersion({ versionName: 'v3.0.0' }, current)).toBe(true);
    });

    it('returns false when remote version is equal or older', () => {
      expect(isNewerVersion({ versionCode: 12, versionName: '2.2.5' }, current)).toBe(false);
      expect(isNewerVersion({ versionCode: 10, versionName: '2.2.3' }, current)).toBe(false);
      expect(isNewerVersion({ versionName: '2.2.4' }, current)).toBe(false);
    });
  });
});

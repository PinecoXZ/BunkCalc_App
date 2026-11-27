import { describe, it, expect } from 'vitest';
import { hashPin, isHashedPin, verifyPin } from '../pinUtils';

describe('pinUtils', () => {
  it('hashes a PIN with a unique salt and verifies it accurately', async () => {
    const hash1 = await hashPin('1234');
    const hash2 = await hashPin('1234');

    expect(hash1.startsWith('pbkdf2:') || hash1.startsWith('sha256k:')).toBe(true);
    expect(isHashedPin(hash1)).toBe(true);
    expect(hash1).not.toBe('1234');
    expect(hash1).not.toBe(hash2); // distinct random salts

    expect(await verifyPin('1234', hash1)).toBe(true);
    expect(await verifyPin('9999', hash1)).toBe(false);
  });

  it('verifies unsalted 64-char SHA-256 hex PINs for backup compatibility', async () => {
    const sha256Of1234 = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
    expect(isHashedPin(sha256Of1234)).toBe(true);
    expect(await verifyPin('1234', sha256Of1234)).toBe(true);
    expect(await verifyPin('0000', sha256Of1234)).toBe(false);
  });

  it('verifies legacy plaintext 4-digit PINs and flags them as unhashed', async () => {
    expect(isHashedPin('4321')).toBe(false);
    expect(await verifyPin('4321', '4321')).toBe(true);
    expect(await verifyPin('1234', '4321')).toBe(false);
  });
});

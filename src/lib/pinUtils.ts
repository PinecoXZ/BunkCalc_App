const HASH_PREFIX = 'sha256:';
const PBKDF2_PREFIX = 'pbkdf2:';
const PBKDF2_ITERATIONS = 100000;
const FALLBACK_ITERATIONS = 5000;
const HEX64_RE = /^[a-f0-9]{64}$/i;
const SALTED_HASH_RE = /^sha256:([a-f0-9]+):([a-f0-9]{64})$/i;
const PBKDF2_HASH_RE = /^pbkdf2:(\d+):([a-f0-9]+):([a-f0-9]{64})$/i;
const STRETCHED_HASH_RE = /^sha256k:(\d+):([a-f0-9]+):([a-f0-9]{64})$/i;

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256FallbackHex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(bytes);
  buf[bytes.length] = 0x80;

  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return sha256FallbackHex(input);
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function pbkdf2Hex(pin: string, saltHex: string, iterations: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('SubtleCrypto unavailable');
  }
  const encoder = new TextEncoder();
  const baseKey = await subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const saltBytes = hexToBytes(saltHex);
  const saltBuffer = saltBytes.buffer.slice(
    saltBytes.byteOffset,
    saltBytes.byteOffset + saltBytes.byteLength
  ) as ArrayBuffer;
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function stretchedFallbackHex(pin: string, saltHex: string, iterations: number): string {
  let acc = `${saltHex}:${pin}`;
  for (let i = 0; i < iterations; i++) {
    acc = sha256FallbackHex(`${saltHex}:${acc}`);
  }
  return acc;
}

/** Returns true if a stored PIN value is already hashed (PBKDF2, stretched/salted SHA-256, or raw hex). */
export function isHashedPin(storedPin?: string): boolean {
  if (!storedPin) return false;
  return (
    PBKDF2_HASH_RE.test(storedPin) ||
    STRETCHED_HASH_RE.test(storedPin) ||
    SALTED_HASH_RE.test(storedPin) ||
    HEX64_RE.test(storedPin)
  );
}

/** Hashes a 4-digit PIN with a random salt using PBKDF2-SHA256 (or key-stretched SHA-256 fallback). */
export async function hashPin(pin: string, existingSalt?: string): Promise<string> {
  const salt = existingSalt || generateSalt();
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const digest = await pbkdf2Hex(pin, salt, PBKDF2_ITERATIONS);
    return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}:${salt}:${digest}`;
  }
  const digest = stretchedFallbackHex(pin, salt, FALLBACK_ITERATIONS);
  return `sha256k:${FALLBACK_ITERATIONS}:${salt}:${digest}`;
}

/** Verifies a user-entered PIN against PBKDF2, stretched/salted SHA-256, raw SHA-256, or legacy plaintext. */
export async function verifyPin(enteredPin: string, storedPin?: string): Promise<boolean> {
  if (!storedPin || !enteredPin) return false;

  const pbkdf2Match = storedPin.match(PBKDF2_HASH_RE);
  if (pbkdf2Match) {
    const [, iterStr, salt, expectedHex] = pbkdf2Match;
    const iterations = parseInt(iterStr, 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
      const actualHex = await pbkdf2Hex(enteredPin, salt, iterations);
      return constantTimeEqual(actualHex.toLowerCase(), expectedHex.toLowerCase());
    }
    return false;
  }

  const stretchedMatch = storedPin.match(STRETCHED_HASH_RE);
  if (stretchedMatch) {
    const [, iterStr, salt, expectedHex] = stretchedMatch;
    const iterations = parseInt(iterStr, 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    const actualHex = stretchedFallbackHex(enteredPin, salt, iterations);
    return constantTimeEqual(actualHex.toLowerCase(), expectedHex.toLowerCase());
  }

  const saltedMatch = storedPin.match(SALTED_HASH_RE);
  if (saltedMatch) {
    const [, salt, expectedHex] = saltedMatch;
    const actualHex = await sha256Hex(`${salt}:${enteredPin}`);
    return constantTimeEqual(actualHex.toLowerCase(), expectedHex.toLowerCase());
  }

  if (HEX64_RE.test(storedPin)) {
    const actualHex = await sha256Hex(enteredPin);
    return constantTimeEqual(actualHex.toLowerCase(), storedPin.toLowerCase());
  }

  return constantTimeEqual(enteredPin, storedPin);
}

export { HASH_PREFIX };

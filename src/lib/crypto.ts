import type { CryptoPacket, VaultData } from '../types';

const ITERATIONS = 300_000;
const PIN_ITERATIONS = 10_000;

function bytesToStr(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function strToBytes(str: string): Uint8Array {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

function encodeText(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function decodeText(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

export function randomBytes(len: number): Uint8Array {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return a;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const km = await crypto.subtle.importKey('raw', encodeText(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<CryptoPacket> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodeText(plaintext)
  );
  return { iv: bytesToStr(iv), data: bytesToStr(new Uint8Array(ct)) };
}

export async function decrypt(packet: CryptoPacket, key: CryptoKey): Promise<string> {
  const iv = strToBytes(packet.iv);
  const data = strToBytes(packet.data);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decodeText(new Uint8Array(pt));
}

export async function sha256(input: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', encodeText(input));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createVault(masterPassword: string): Promise<VaultData> {
  const salt = randomBytes(16);
  const key = await deriveKey(masterPassword, salt, ITERATIONS);
  const test = await encrypt('PG_OK', key);
  const empty = await encrypt('[]', key);
  return {
    salt: bytesToStr(salt),
    test,
    entries: empty,
    folders: empty,
    created: Date.now(),
  };
}

export async function unlockVault(
  masterPassword: string,
  vault: VaultData
): Promise<{ key: CryptoKey; success: boolean }> {
  try {
    const salt = strToBytes(vault.salt);
    const key = await deriveKey(masterPassword, salt, ITERATIONS);
    const test = await decrypt(vault.test, key);
    if (test !== 'PG_OK') return { key: null as any, success: false };
    return { key, success: true };
  } catch {
    return { key: null as any, success: false };
  }
}

export async function encryptWithPin(
  masterPassword: string,
  pin: string,
  saltBytes: Uint8Array
): Promise<{ pinHash: string; encryptedMp: CryptoPacket; salt: string }> {
  const pinKey = await deriveKey(pin, saltBytes, PIN_ITERATIONS);
  const encryptedMp = await encrypt(masterPassword, pinKey);
  const pinHash = await sha256(pin);
  return { pinHash, encryptedMp, salt: bytesToStr(saltBytes) };
}

export async function decryptWithPin(pin: string, salt: string, encryptedMp: CryptoPacket): Promise<string> {
  const saltBytes = strToBytes(salt);
  const pinKey = await deriveKey(pin, saltBytes, PIN_ITERATIONS);
  return decrypt(encryptedMp, pinKey);
}

export function deriveEncryptionKey(masterPassword: string, vault: VaultData): Promise<CryptoKey> {
  const salt = strToBytes(vault.salt);
  return deriveKey(masterPassword, salt, ITERATIONS);
}

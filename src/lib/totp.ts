const TOTP_INTERVAL = 30;
const TOTP_DIGITS = 6;

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  const padded = cleaned.padEnd(Math.ceil(cleaned.length / 8) * 8, '=');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits: number[] = [];

  for (const ch of padded) {
    if (ch === '=') {
      bits.push(0, 0, 0, 0, 0);
      continue;
    }
    const idx = chars.indexOf(ch.toUpperCase());
    if (idx === -1) throw new Error(`Invalid base32 char: ${ch}`);
    bits.push((idx >> 4) & 1, (idx >> 3) & 1, (idx >> 2) & 1, (idx >> 1) & 1, idx & 1);
  }

  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    bytes.push(byte);
  }

  return new Uint8Array(bytes);
}

export async function generateTOTP(secret: string): Promise<string> {
  const keyBytes = base32Decode(secret);
  let counter = Math.floor(Date.now() / 1000 / TOTP_INTERVAL);

  const counterBuf = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = counter & 0xff;
    counter >>>= 8;
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', cryptoKey, counterBuf);
  const h = new Uint8Array(sig);
  const offset = h[19] & 0xf;
  const code = ((h[offset] & 0x7f) << 24 | (h[offset + 1] & 0xff) << 16 |
                (h[offset + 2] & 0xff) << 8 | h[offset + 3] & 0xff) % Math.pow(10, TOTP_DIGITS);

  return String(code).padStart(TOTP_DIGITS, '0');
}

export function getTOTPRemainingSeconds(): number {
  return TOTP_INTERVAL - (Math.floor(Date.now() / 1000) % TOTP_INTERVAL);
}

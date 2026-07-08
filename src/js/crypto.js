/* ===============================================
   PassGuard v6.0 - Cryptographic Module
   Web Crypto API: AES-256-GCM + PBKDF2 + SHA-256
   =============================================== */

const CR = {
  rnd(len) {
    const a = new Uint8Array(len);
    crypto.getRandomValues(a);
    return a;
  },

  async derive(password, salt) {
    const km = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 300000, hash: 'SHA-256' },
      km,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  async deriveFast(password, salt) {
    const km = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' },
      km,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  async enc(plaintext, key) {
    const iv = this.rnd(12);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );
    return {
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(ct)))
    };
  },

  async dec(packet, key) {
    const iv = Uint8Array.from(atob(packet.iv), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(packet.data), c => c.charCodeAt(0));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(pt);
  },

  async sha256(data) {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(h))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /* TOTP (RFC 6238) - HMAC-SHA1, 30s window, 6 digits */
  async totp(secret) {
    const clean = secret.replace(/-/g, '+').replace(/_/g, '/');
    const padded = clean.padEnd(Math.ceil(clean.length / 8) * 8, '=');
    const key = Uint8Array.from(atob(padded), c => c.charCodeAt(0));

    let epoch = Math.floor(Date.now() / 30000);
    const msg = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      msg[i] = epoch & 0xff;
      epoch >>>= 8;
    }

    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, msg);

    const h = new Uint8Array(sig);
    const o = h[19] & 0xf;
    const c = ((h[o] & 0x7f) << 24 | (h[o + 1] & 0xff) << 16 |
               (h[o + 2] & 0xff) << 8 | h[o + 3] & 0xff) % 1000000;
    return String(c).padStart(6, '0');
  },

  /* Encode binary salt to base64 */
  saltToStr(salt) {
    return btoa(String.fromCharCode(...salt));
  },

  /* Decode base64 salt to Uint8Array */
  strToSalt(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }
};

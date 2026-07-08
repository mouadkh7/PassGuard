import type { Settings, HealthHistoryPoint, CryptoPacket } from '../types';

const APP_KEY = 'pg_v7';
const SETTINGS_KEY = 'pg_v7_settings';
const HEALTH_KEY = 'pg_v7_health';

interface RawVault {
  salt: string;
  test: CryptoPacket;
  entries: CryptoPacket;
  folders: CryptoPacket;
  created: number;
  updated?: number;
}

export const ST = {
  loadVault(): RawVault | null {
    try {
      const r = localStorage.getItem(APP_KEY);
      return r ? JSON.parse(r) : null;
    } catch { return null; }
  },

  saveVault(v: RawVault): void {
    localStorage.setItem(APP_KEY, JSON.stringify(v));
  },

  hasVault(): boolean {
    return localStorage.getItem(APP_KEY) !== null;
  },

  loadSettings(): Settings {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch { return {} as Settings; }
  },

  saveSettings(s: Settings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  },

  loadHealthHistory(): HealthHistoryPoint[] {
    try {
      return JSON.parse(localStorage.getItem(HEALTH_KEY) || '[]');
    } catch { return []; }
  },

  saveHealthHistory(h: HealthHistoryPoint[]): void {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(h));
  },

  clearAll(): void {
    localStorage.removeItem(APP_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(HEALTH_KEY);
  }
};

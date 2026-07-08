export interface VaultEntry {
  id: string;
  title: string;
  type: 'password' | 'note' | 'identity' | 'payment';
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  totp?: string;
  tags?: string;
  favorite: boolean;
  expiry?: string;
  folder?: string;

  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  idNumber?: string;

  cardName?: string;
  cardNum?: string;
  cardExp?: string;
  cardCvv?: string;
  cardPin?: string;

  createdAt: number;
  updatedAt: number;
  passwordHistory?: { pw: string; at: number }[];
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
}

export interface VaultData {
  salt: string;
  test: CryptoPacket;
  entries: CryptoPacket;
  folders: CryptoPacket;
  created: number;
  updated?: number;
}

export interface CryptoPacket {
  iv: string;
  data: string;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  autoLock: number;
  pinEnabled: boolean;
  pinHash?: string;
  pinEncryptedMp?: CryptoPacket;
  pinSalt?: string;
  language: 'ar' | 'en';
}

export interface HealthEntry {
  pw: string;
  sc: number;
  iss: string[];
}

export interface GenResult {
  pw: string;
  ent: number;
}

export interface StrengthResult {
  sc: number;
  lb: string;
  hx: string;
}

export interface PwdGenOptions {
  u: boolean;
  l: boolean;
  n: boolean;
  s: boolean;
  av: boolean;
}

export interface HealthHistoryPoint {
  date: number;
  score: number;
  count: number;
}

export type EntryType = 'password' | 'note' | 'identity' | 'payment';
export type TabId = 'generator' | 'vault' | 'dashboard' | 'settings';
export type ThemeMode = 'dark' | 'light' | 'system';
export type Language = 'ar' | 'en';

export const ENTRY_TYPES: { id: EntryType; icon: string; labelAr: string; labelEn: string }[] = [
  { id: 'password', icon: '🔑', labelAr: 'كلمة مرور', labelEn: 'Password' },
  { id: 'note', icon: '📝', labelAr: 'ملاحظة', labelEn: 'Note' },
  { id: 'identity', icon: '🪪', labelAr: 'هوية', labelEn: 'Identity' },
  { id: 'payment', icon: '💳', labelAr: 'بطاقة', labelEn: 'Card' },
];

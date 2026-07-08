import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { VaultEntry, Folder, VaultData, Settings, HealthHistoryPoint, CryptoPacket } from '../types';
import { createVault, unlockVault, encrypt, decrypt, deriveEncryptionKey, encryptWithPin, decryptWithPin, randomBytes, sha256 } from '../lib/crypto';
import { ST } from '../lib/storage';
import { healthAnalysis } from '../lib/generator';

interface VaultState {
  isLocked: boolean;
  isFirstTime: boolean;
  entries: VaultEntry[];
  folders: Folder[];
  pinEnabled: boolean;
  pinHash: string | null;
  pinEncryptedMp: CryptoPacket | null;
  pinSalt: string | null;
}

interface VaultContextType extends VaultState {
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  addEntry: (entry: VaultEntry) => Promise<void>;
  updateEntry: (id: string, data: Partial<VaultEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  saveAll: () => Promise<void>;
  setPin: (pin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearVault: () => void;
}

const defaultState: VaultState = {
  isLocked: true,
  isFirstTime: false,
  entries: [],
  folders: [],
  pinEnabled: false,
  pinHash: null,
  pinEncryptedMp: null,
  pinSalt: null,
};

const VaultContext = createContext<VaultContextType>(null!);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VaultState>(() => {
    const first = !ST.hasVault();
    if (first) return { ...defaultState, isFirstTime: true };
    const s = ST.loadSettings();
    return { ...defaultState, pinEnabled: !!s.pinEnabled, pinHash: s.pinHash || null, pinEncryptedMp: s.pinEncryptedMp || null, pinSalt: s.pinSalt || null };
  });

  const keyRef = useRef<CryptoKey | null>(null);
  const mpRef = useRef<string | null>(null);
  const vaultRef = useRef<VaultData | null>(null);

  const getKey = useCallback(() => keyRef.current, []);
  const getMp = useCallback(() => mpRef.current, []);

  const persistEntries = useCallback(async () => {
    if (!keyRef.current || !vaultRef.current) return;
    const entriesStr = JSON.stringify(state.entries);
    vaultRef.current.entries = await encrypt(entriesStr, keyRef.current);
    vaultRef.current.updated = Date.now();
    ST.saveVault(vaultRef.current);

    const sc = computeHealthScore(state.entries);
    const hist = ST.loadHealthHistory();
    hist.push({ date: Date.now(), score: sc, count: state.entries.length });
    if (hist.length > 30) hist.splice(0, hist.length - 30);
    ST.saveHealthHistory(hist);
  }, [state.entries]);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    let vault = ST.loadVault();
    if (!vault) {
      vault = await createVault(password);
      ST.saveVault(vault);
      keyRef.current = await deriveEncryptionKey(password, vault);
      mpRef.current = password;
      vaultRef.current = vault;
      setState(prev => ({ ...prev, isLocked: false, isFirstTime: true, entries: [], folders: [] }));
      return true;
    }
    const result = await unlockVault(password, vault);
    if (!result.success) return false;
    keyRef.current = result.key;
    mpRef.current = password;
    vaultRef.current = vault;
    const entries: VaultEntry[] = vault.entries?.data ? JSON.parse(await decrypt(vault.entries, result.key)) : [];
    const folders: Folder[] = vault.folders?.data ? JSON.parse(await decrypt(vault.folders, result.key)) : [];
    setState(prev => ({ ...prev, isLocked: false, isFirstTime: false, entries, folders }));
    return true;
  }, []);

  const lock = useCallback(() => {
    keyRef.current = null;
    mpRef.current = null;
    vaultRef.current = null;
    setState(prev => ({ ...prev, isLocked: true, entries: [], folders: [] }));
  }, []);

  const saveAll = useCallback(async () => {
    await persistEntries();
  }, [persistEntries]);

  const addEntry = useCallback(async (entry: VaultEntry) => {
    setState(prev => {
      const entries = [...prev.entries, entry];
      setTimeout(() => persistEntries(), 0);
      return { ...prev, entries };
    });
  }, [persistEntries]);

  const updateEntry = useCallback(async (id: string, data: Partial<VaultEntry>) => {
    setState(prev => {
      const entries = prev.entries.map(e => e.id === id ? { ...e, ...data, updatedAt: Date.now() } as VaultEntry : e);
      setTimeout(() => {
        setState(p => ({ ...p, entries }));
        persistEntries();
      }, 0);
      return prev;
    });
  }, [persistEntries]);

  const deleteEntry = useCallback(async (id: string) => {
    setState(prev => {
      const entries = prev.entries.filter(e => e.id !== id);
      setTimeout(() => {
        setState(p => ({ ...p, entries }));
        persistEntries();
      }, 0);
      return prev;
    });
  }, [persistEntries]);

  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!mpRef.current) return false;
    try {
      const salt = randomBytes(16);
      const result = await encryptWithPin(mpRef.current, pin, salt);
      const s = ST.loadSettings();
      s.pinEnabled = true;
      s.pinHash = result.pinHash;
      s.pinEncryptedMp = result.encryptedMp;
      s.pinSalt = result.salt;
      ST.saveSettings(s);
      setState(prev => ({ ...prev, pinEnabled: true, pinHash: result.pinHash, pinEncryptedMp: result.encryptedMp, pinSalt: result.salt }));
      return true;
    } catch { return false; }
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const s = ST.loadSettings();
    if (!s.pinEnabled || !s.pinHash || !s.pinEncryptedMp || !s.pinSalt) return false;
    const h = await sha256(pin);
    if (h !== s.pinHash) return false;
    try {
      const mp = await decryptWithPin(pin, s.pinSalt, s.pinEncryptedMp);
      return await unlock(mp);
    } catch { return false; }
  }, [unlock]);

  const clearVault = useCallback(() => {
    ST.clearAll();
    keyRef.current = null;
    mpRef.current = null;
    vaultRef.current = null;
    setState({ ...defaultState, isFirstTime: true });
  }, []);

  useEffect(() => {
    const first = !ST.hasVault();
    if (first) setState(prev => ({ ...prev, isFirstTime: true }));
  }, []);

  return (
    <VaultContext.Provider value={{
      ...state,
      unlock,
      lock,
      addEntry,
      updateEntry,
      deleteEntry,
      saveAll,
      setPin,
      verifyPin,
      clearVault,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  return useContext(VaultContext);
}

function computeHealthScore(entries: VaultEntry[]): number {
  if (!entries.length) return 100;
  const total = entries.reduce((s, e) => s + healthAnalysis(e.password || '').sc, 0);
  return Math.round(total / entries.length);
}

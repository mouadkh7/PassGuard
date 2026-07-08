import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { TabId, ThemeMode } from '../types';
import { ST } from '../lib/storage';

interface UIContextType {
  theme: ThemeMode;
  activeTab: TabId;
  setTheme: (t: ThemeMode) => void;
  setActiveTab: (t: TabId) => void;
  effectiveTheme: 'dark' | 'light';
}

const UIContext = createContext<UIContextType>(null!);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const s = ST.loadSettings();
  const [theme, setThemeState] = useState<ThemeMode>(s.theme || 'dark');
  const [activeTab, setActiveTab] = useState<TabId>('generator');

  const effectiveTheme: 'dark' | 'light' = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')
    : theme;

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    const settings = ST.loadSettings();
    settings.theme = t;
    ST.saveSettings(settings);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    document.documentElement.classList.toggle('light', effectiveTheme === 'light');
  }, [effectiveTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme:dark)');
    const handler = () => {
      if (theme === 'system') {
        document.documentElement.classList.toggle('dark', mq.matches);
        document.documentElement.classList.toggle('light', !mq.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <UIContext.Provider value={{ theme, activeTab, setTheme, setActiveTab, effectiveTheme }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  return useContext(UIContext);
}

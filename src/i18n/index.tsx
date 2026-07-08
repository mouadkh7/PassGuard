import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { Language } from '../types';
import { ST } from '../lib/storage';
import en from './en.json';
import ar from './ar.json';

type TranslationMap = { [key: string]: any };
type I18nContextType = {
  lang: Language;
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLanguage: (l: Language) => void;
  dir: 'rtl' | 'ltr';
};

const translations: Record<Language, TranslationMap> = { en, ar };

function resolvePath(obj: TranslationMap, path: string): string {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = current[key];
  }
  return typeof current === 'string' ? current : path;
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  t: (p: string) => p,
  setLanguage: () => {},
  dir: 'ltr',
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const settings = ST.loadSettings();
  const [lang, setLang] = useState<Language>(settings.language || 'en');

  const setLanguage = useCallback((l: Language) => {
    setLang(l);
    const s = ST.loadSettings();
    s.language = l;
    ST.saveSettings(s);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((path: string, vars?: Record<string, string | number>) => {
    const text = resolvePath(translations[lang], path);
    return interpolate(text, vars);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLanguage, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nContextType {
  return useContext(I18nContext);
}

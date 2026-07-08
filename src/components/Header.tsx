import React from 'react';
import { useTranslation } from '../i18n';
import { useUI } from '../hooks/useUI';
import type { TabId, ThemeMode } from '../types';

interface HeaderProps {
  onLanguageToggle: () => void;
}

export function Header({ onLanguageToggle }: HeaderProps) {
  const { t, lang } = useTranslation();
  const { activeTab, setTheme, effectiveTheme } = useUI();

  const tabs: { id: TabId; key: string }[] = [
    { id: 'generator', key: 'generator' },
    { id: 'vault', key: 'vault' },
    { id: 'dashboard', key: 'dashboard' },
    { id: 'settings', key: 'settings' },
  ];

  const cycleTheme = () => {
    const order: ThemeMode[] = ['dark', 'light', 'system'];
    const idx = order.indexOf(effectiveTheme === 'dark' ? 'dark' : 'light');
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  };

  const themeIcon = effectiveTheme === 'dark' ? '🌙' : '☀️';

  return (
    <header className="sticky top-0 z-40 glass border-b border-dark-700/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold">{t('app.name')}</h1>
            <p className="text-[10px] text-dark-500">{t('app.tagline')}</p>
          </div>
        </div>

        <nav className="hidden md:flex gap-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {tabs.map(tab => (
            <TabButton key={tab.id} id={tab.id} label={t(`nav.${tab.key}`)} isActive={activeTab === tab.id} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onLanguageToggle}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-dark-800 text-dark-400 hover:bg-dark-700 transition-colors border border-dark-700"
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <button
            onClick={cycleTheme}
            className="w-8 h-8 rounded-lg hover:bg-dark-700 transition-colors flex items-center justify-center text-base"
            aria-label="Toggle theme"
          >
            {themeIcon}
          </button>
        </div>
      </div>
    </header>
  );
}

function TabButton({ id, label, isActive }: { id: TabId; label: string; isActive: boolean }) {
  const { setActiveTab } = useUI();
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        isActive ? 'tab-active shadow-lg shadow-primary-500/20' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-700'
      }`}
    >
      {label}
    </button>
  );
}

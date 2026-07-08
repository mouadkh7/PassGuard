import React, { useEffect } from 'react';
import { I18nProvider, useTranslation } from './i18n';
import { UIProvider, useUI } from './hooks/useUI';
import { VaultProvider, useVault } from './hooks/useVault';
import { ToastProvider, useToast } from './components/Toast';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { GeneratorPage } from './pages/Generator';
import { VaultPage } from './pages/Vault';
import { DashboardPage } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { ST } from './lib/storage';
import type { TabId } from './types';

function AppContent() {
  const { activeTab, setActiveTab } = useUI();
  const { t, setLanguage, lang } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const map: Record<string, TabId> = { '1': 'generator', '2': 'vault', '3': 'dashboard', '4': 'settings' };
      const tab = map[e.key];
      if (tab) { e.preventDefault(); setActiveTab(tab); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setActiveTab]);

  /* Auto-lock inactivity timer */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const s = ST.loadSettings();
    const minutes = parseInt(String(s.autoLock || '5'));
    if (minutes <= 0) return;

    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        /* lock will be handled by the vault hook */
        window.location.reload(); /* simple approach for now */
      }, minutes * 60 * 1000);
    };

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach(ev => document.addEventListener(ev, reset));
    reset();

    return () => {
      events.forEach(ev => document.removeEventListener(ev, reset));
      if (timer) clearTimeout(timer);
    };
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'generator': return <GeneratorPage />;
      case 'vault': return <VaultPage />;
      case 'dashboard': return <DashboardPage />;
      case 'settings': return <SettingsPage />;
      default: return <GeneratorPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onLanguageToggle={toggleLanguage} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-6">
        {renderTab()}
      </main>
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <UIProvider>
          <VaultProvider>
            <AppContent />
          </VaultProvider>
        </UIProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

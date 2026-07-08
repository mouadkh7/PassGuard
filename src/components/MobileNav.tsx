import React from 'react';
import { useTranslation } from '../i18n';
import { useUI } from '../hooks/useUI';
import type { TabId } from '../types';

export function MobileNav() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useUI();

  const tabs: { id: TabId; icon: string; key: string }[] = [
    { id: 'generator', icon: '🎲', key: 'generator' },
    { id: 'vault', icon: '🔐', key: 'vault' },
    { id: 'dashboard', icon: '📊', key: 'dashboard' },
    { id: 'settings', icon: '⚙️', key: 'settings' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-dark-700/50 pb-safe">
      <div className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary-400 bg-primary-500/10'
                : 'text-dark-500 hover:text-dark-300'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{t(`nav.${tab.key}`)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

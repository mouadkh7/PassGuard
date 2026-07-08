import React, { useState, useEffect } from 'react';
import { useVault } from '../hooks/useVault';
import { useUI } from '../hooks/useUI';
import { useTranslation } from '../i18n';
import { useToast } from '../components/Toast';
import { ST } from '../lib/storage';
import { encrypt, decrypt, deriveEncryptionKey } from '../lib/crypto';

export function SettingsPage() {
  const vault = useVault();
  const ui = useUI();
  const { t, lang, setLanguage } = useTranslation();
  const { toast } = useToast();

  const settings = ST.loadSettings();
  const [autoLock, setAutoLock] = useState(settings.autoLock || 5);
  const [pinEnabled, setPinEnabled] = useState(!!settings.pinEnabled);
  const [pinInput, setPinInput] = useState('');

  /* Export functions */
  const handleExportJson = async () => {
    if (vault.isLocked) { toast(t('errors.vault_locked'), 'error'); return; }
    try {
      const entryStr = JSON.stringify(vault.entries);
      const blob = new Blob([JSON.stringify({
        version: 7,
        exportedAt: new Date().toISOString(),
        entries: vault.entries,
        count: vault.entries.length
      }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `passguard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('✅ Exported');
    } catch { toast(t('errors.export_fail'), 'error'); }
  };

  const handleExportCsv = async () => {
    if (vault.isLocked) { toast(t('errors.vault_locked'), 'error'); return; }
    if (!vault.entries.length) { toast('No entries', 'warning'); return; }
    const header = 'title,url,username,password,type,notes,totp,tags,favorite,expiry';
    const rows = vault.entries.map((e: any) =>
      [e.title||'', e.url||'', e.username||'', e.password||'', e.type||'password',
       (e.notes||'').replace(/"/g,'""'), e.totp||'', e.tags||'', e.favorite?'true':'', e.expiry||'']
        .map(c => `"${c}"`).join(',')
    );
    const csv = '\ufeff' + header + '\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `passguard-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('✅ Exported');
  };

  /* Import */
  const handleImport = () => {
    if (vault.isLocked) { toast(t('errors.vault_locked'), 'error'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const entries = data.entries || [];
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            await vault.addEntry({ ...entry, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
          }
          toast(`✅ Imported ${entries.length} entries`);
        }
      } catch { toast(t('errors.import_fail'), 'error'); }
    };
    input.click();
  };

  /* Clear vault */
  const handleClear = () => {
    if (!window.confirm(t('settings.clear_confirm'))) return;
    vault.clearVault();
    toast(t('settings.clear_done'));
  };

  /* PIN */
  const handlePinInput = async (value: string) => {
    const clean = value.replace(/\D/g, '');
    setPinInput(clean);
    if (clean.length >= 4 && clean.length <= 8) {
      const ok = await vault.setPin(clean);
      if (ok) { setPinEnabled(true); toast(t('settings.pin_set')); }
    }
  };

  const handlePinToggle = async (checked: boolean) => {
    setPinEnabled(checked);
    if (!checked) {
      const s = ST.loadSettings();
      s.pinEnabled = false;
      delete s.pinHash;
      delete s.pinEncryptedMp;
      delete s.pinSalt;
      ST.saveSettings(s);
    }
  };

  /* Auto lock */
  const handleAutoLockChange = (value: number) => {
    setAutoLock(value);
    const s = ST.loadSettings();
    s.autoLock = value;
    ST.saveSettings(s);
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-1">{t('settings.title')}</h2>
      <p className="text-sm text-dark-400 mb-5">{t('settings.subtitle')}</p>

      <div className="space-y-4 max-w-lg">

        {/* Language */}
        <SettingsCard title="🌐 {t('settings.language')}">
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('ar')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${lang === 'ar' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400'}`}
            >
              🇸🇦 {t('settings.language_ar')}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${lang === 'en' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400'}`}
            >
              🇬🇧 {t('settings.language_en')}
            </button>
          </div>
        </SettingsCard>

        {/* Security */}
        <SettingsCard title={`🔒 ${t('settings.security')}`}>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">{t('settings.auto_lock')}</span>
            <select
              value={autoLock}
              onChange={e => handleAutoLockChange(Number(e.target.value))}
              className="input-field !w-auto text-xs"
            >
              <option value="0">{t('settings.never')}</option>
              <option value="1">1 {t('settings.minute')}</option>
              <option value="5">5 {t('settings.minutes')}</option>
              <option value="15">15 {t('settings.minutes')}</option>
              <option value="30">30 {t('settings.minutes')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-dark-700/50">
            <span className="text-sm">{t('settings.pin_enable')}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pinEnabled}
                onChange={e => handlePinToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 rounded-full bg-dark-600 peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-[-16px]" />
            </label>
          </div>

          {pinEnabled && (
            <div className="pt-2">
              <input
                type="password"
                placeholder={t('settings.pin_placeholder')}
                value={pinInput}
                onChange={e => handlePinInput(e.target.value)}
                maxLength={8}
                className="input-field text-sm font-mono tracking-widest text-center dir-ltr"
              />
              <p className="text-xs text-dark-500 mt-1">{t('settings.pin_info')}</p>
            </div>
          )}
        </SettingsCard>

        {/* Appearance */}
        <SettingsCard title={`🎨 ${t('settings.appearance')}`}>
          <select
            value={ui.theme}
            onChange={e => ui.setTheme(e.target.value as any)}
            className="input-field text-sm"
          >
            <option value="dark">🌙 {t('settings.theme_dark')}</option>
            <option value="light">☀️ {t('settings.theme_light')}</option>
            <option value="system">💻 {t('settings.theme_system')}</option>
          </select>
        </SettingsCard>

        {/* Data */}
        <SettingsCard title={`📦 ${t('settings.data')}`}>
          <div className="flex flex-wrap gap-2 mb-2">
            <button onClick={handleExportJson} className="btn-secondary text-xs">📤 {t('settings.export_json')}</button>
            <button onClick={handleExportCsv} className="btn-secondary text-xs">📤 {t('settings.export_csv')}</button>
            <button onClick={handleImport} className="btn-secondary text-xs">📥 {t('settings.import_btn')}</button>
            <button onClick={handleClear} className="btn-danger text-xs">🗑️ {t('settings.clear_vault')}</button>
          </div>
        </SettingsCard>

        {/* About */}
        <SettingsCard title={`ℹ️ ${t('settings.about')}`}>
          <p className="text-xs text-dark-400">{t('settings.about_desc')}</p>
          <p className="text-xs text-dark-500 mt-1">{t('settings.about_extra')}</p>
          <p className="text-xs text-dark-500 mt-1">{t('app.version')} 7.0.0</p>
        </SettingsCard>

      </div>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useVault } from '../hooks/useVault';
import { useTranslation } from '../i18n';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import type { VaultEntry, EntryType } from '../types';
import { ENTRY_TYPES } from '../types';
import { strengthLabel, healthAnalysis, genPassword, genPhrase, genPin } from '../lib/generator';
import { generateTOTP, getTOTPRemainingSeconds } from '../lib/totp';
import { genId, copyToClipboard } from '../lib/helpers';

export function VaultPage() {
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const vault = useVault();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState('date-desc');
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [showTotp, setShowTotp] = useState<VaultEntry | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpRemaining, setTotpRemaining] = useState(30);
  const [showPwdId, setShowPwdId] = useState<string | null>(null);

  /* Entry form state */
  const [form, setForm] = useState<Partial<VaultEntry>>({ type: 'password' });

  const entries = useMemo(() => {
    let result = [...vault.entries];

    if (filter !== 'all') result = result.filter(e => e.type === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.username || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case 'date-desc': result.sort((a, b) => b.createdAt - a.createdAt); break;
      case 'date-asc': result.sort((a, b) => a.createdAt - b.createdAt); break;
      case 'title-asc': result.sort((a, b) => a.title.localeCompare(b.title, lang)); break;
      case 'title-desc': result.sort((a, b) => b.title.localeCompare(a.title, lang)); break;
    }

    return result;
  }, [vault.entries, filter, search, sort, lang]);

  const openAddModal = useCallback(() => {
    setEditingEntry(null);
    setForm({ type: 'password', favorite: false });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((entry: VaultEntry) => {
    setEditingEntry(entry);
    setForm({ ...entry });
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title?.trim()) {
      toast(t('errors.title_required'), 'error');
      return;
    }
    const now = Date.now();
    if (editingEntry) {
      await vault.updateEntry(editingEntry.id, { ...form, updatedAt: now });
      toast(t('vault.entry_updated'));
    } else {
      const entry: VaultEntry = {
        id: genId(),
        title: form.title || '',
        type: (form.type as EntryType) || 'password',
        favorite: form.favorite || false,
        createdAt: now,
        updatedAt: now,
        passwordHistory: [],
        ...form,
      };
      await vault.addEntry(entry);
      toast(t('vault.entry_added'));
    }
    setShowModal(false);
  }, [form, editingEntry, vault, toast, t]);

  const handleDelete = useCallback(async (entry: VaultEntry) => {
    if (!window.confirm(`${t('vault.delete_confirm')} "${entry.title}"؟`)) return;
    await vault.deleteEntry(entry.id);
    toast(t('vault.entry_deleted'));
  }, [vault, toast, t]);

  /* TOTP timer */
  useEffect(() => {
    if (!showTotp) return;
    const update = async () => {
      try {
        const code = await generateTOTP(showTotp.totp!);
        setTotpCode(code);
      } catch { setTotpCode('------'); }
      setTotpRemaining(getTOTPRemainingSeconds());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [showTotp]);

  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const fmt = file.name.endsWith('.csv') ? 'csv' : 'json';
        let added = 0;
        if (fmt === 'csv') {
          const lines = text.split('\n').filter((l: string) => l.trim());
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (cols.length < 4) continue;
            const entry: VaultEntry = {
              id: genId(), title: cols[0] || '', url: cols[1] || '', username: cols[2] || '',
              password: cols[3] || '', type: 'password', favorite: false,
              notes: cols[5] || '', totp: cols[6] || '', tags: cols[7] || '',
              expiry: cols[9] || '', createdAt: Date.now(), updatedAt: Date.now(), passwordHistory: [],
            };
            await vault.addEntry(entry);
            added++;
          }
        } else {
          const data = JSON.parse(text);
          const items = data.items || data.entries || (data.data ? JSON.parse(atob(data.data)) : []);
          const arr = Array.isArray(items) ? items : items.data || [];
          for (const item of arr) {
            const entry: VaultEntry = {
              id: genId(), title: item.name || item.title || '',
              url: item.login?.uris?.[0]?.uri || item.url || '',
              username: item.login?.username || item.username || '',
              password: item.login?.password || item.password || '',
              type: item.type || 'password', favorite: !!item.favorite,
              notes: item.notes || '', totp: item.login?.totp || item.totp || '',
              tags: Array.isArray(item.tags) ? item.tags.join(',') : item.tags || '',
              expiry: item.expiry || '', createdAt: Date.now(), updatedAt: Date.now(), passwordHistory: [],
            };
            await vault.addEntry(entry);
            added++;
          }
        }
        toast(`${t('vault.import_success', { count: added })}`);
      } catch { toast(t('vault.import_fail'), 'error'); }
    };
    input.click();
  }, [vault, toast, t]);

  if (vault.isLocked) {
    return <UnlockForm />;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">{t('vault.title')}</h2>
          <p className="text-sm text-dark-400">
            {t('vault.subtitle')} • <span className="text-primary-400 font-medium">{vault.entries.length}</span> {t('vault.entries')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleImport} className="btn-secondary text-xs px-3 py-1.5">📥 {t('vault.import_btn')}</button>
          <button onClick={() => vault.lock()} className="btn-danger text-xs px-3 py-1.5">🔒 {t('vault.lock_btn')}</button>
          <button onClick={openAddModal} className="btn-primary text-sm">➕ {t('vault.add_btn')}</button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder={t('vault.search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 min-w-[150px] text-sm"
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field !w-auto text-sm">
          <option value="all">{t('vault.filter_all')}</option>
          <option value="password">{t('vault.filter_passwords')}</option>
          <option value="note">{t('vault.filter_notes')}</option>
          <option value="identity">{t('vault.filter_identities')}</option>
          <option value="payment">{t('vault.filter_cards')}</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input-field !w-auto text-sm">
          <option value="date-desc">{t('vault.sort_newest')}</option>
          <option value="date-asc">{t('vault.sort_oldest')}</option>
          <option value="title-asc">{t('vault.sort_az')}</option>
          <option value="title-desc">{t('vault.sort_za')}</option>
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-xs text-dark-400 mb-4 p-2.5 bg-dark-800/50 rounded-lg border border-dark-700/50">
        <span>📊 <strong className="text-dark-200">{vault.entries.length}</strong> {t('vault.entries')}</span>
        <span className="text-emerald-400">🟢 {vault.entries.filter(e => strengthLabel(e.password || '').sc >= 80).length} {t('dashboard.strong_label')}</span>
        <span className="text-red-400">🔴 {vault.entries.filter(e => strengthLabel(e.password || '').sc < 50).length} {t('dashboard.weak_label')}</span>
      </div>

      {/* Entry list */}
      {!vault.entries.length ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3 opacity-60">🔐</div>
          <p className="text-dark-400">{t('vault.empty_title')}</p>
        </div>
      ) : !entries.length ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-50">🔍</div>
          <p className="text-dark-400">{t('vault.no_results')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={i}
              showPwd={showPwdId === entry.id}
              onTogglePwd={() => setShowPwdId(showPwdId === entry.id ? null : entry.id)}
              onEdit={() => openEditModal(entry)}
              onDelete={() => handleDelete(entry)}
              onShowTotp={() => setShowTotp(entry)}
            />
          ))}
        </div>
      )}

      {/* Entry Modal */}
      <EntryFormModal
        open={showModal}
        entry={editingEntry}
        form={form}
        onChange={setForm}
        onSave={handleSave}
        onClose={() => setShowModal(false)}
      />

      {/* TOTP Modal */}
      <Modal open={!!showTotp} onClose={() => setShowTotp(null)} narrow>
        <div className="p-6 text-center">
          <div className="font-mono text-4xl font-bold text-primary-400 tracking-[4px] mb-2" style={{ direction: 'ltr' }}>
            {totpCode}
          </div>
          <p className="text-dark-400 text-sm mb-4">{showTotp?.title || 'TOTP'}</p>
          <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-1000"
              style={{ width: `${(totpRemaining / 30) * 100}%` }}
            />
          </div>
          <p className="text-xs text-dark-500 font-mono">{t('totp.regenerate')} {totpRemaining}s</p>
          <button onClick={() => copyToClipboard(totpCode, toast)} className="btn-primary mt-4 text-sm">
            📋 {t('common.copy')}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ===== UNLOCK FORM ===== */
function UnlockForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const vault = useVault();
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (pwd.length < 4) { toast(t('errors.mp_short'), 'error'); return; }
    setLoading(true);
    const ok = await vault.unlock(pwd);
    setLoading(false);
    if (ok) toast(t('vault.entry_added'));
    else toast(t('errors.mp_wrong'), 'error');
  };

  return (
    <div className="card">
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-1">{t('vault.unlock_title')}</h3>
          <p className="text-sm text-dark-400 mb-6">{t('vault.unlock_desc')}</p>
          <input
            type="password"
            placeholder={t('vault.mp_label')}
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            className="input-field mb-3 text-center"
            autoFocus
          />
          <button onClick={handleUnlock} disabled={loading} className="btn-primary w-full">
            {loading ? '⏳...' : `🔓 ${t('vault.unlock_btn')}`}
          </button>
          {vault.isFirstTime && (
            <p className="text-xs text-primary-400 mt-3">🆕 {t('vault.first_time')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== ENTRY CARD ===== */
function EntryCard({ entry, index, showPwd, onTogglePwd, onEdit, onDelete, onShowTotp }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const s = strengthLabel(entry.password || '');
  const icon = ENTRY_TYPES.find(t => t.id === entry.type)?.icon || '🔑';

  const exp = entry.expiry ? Math.ceil((new Date(entry.expiry).getTime() - Date.now()) / 86400000) : null;
  const expired = exp !== null && exp <= 0;
  const expiring = exp !== null && exp > 0 && exp <= 14;

  let subtitle = entry.username || '';
  if (entry.type === 'note') subtitle = entry.notes ? entry.notes.slice(0, 80) + (entry.notes.length > 80 ? '...' : '') : '';
  if (entry.type === 'identity') subtitle = entry.fullName || entry.email || '';
  if (entry.type === 'payment') subtitle = '•••• ' + (entry.cardNum || '').slice(-4);

  const daysAgo = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 86400000);
    if (d === 0) return t('common.today') || 'today';
    if (d === 1) return 'yesterday';
    return `${d}d ago`;
  };

  return (
    <div
      className="card p-3 hover:border-primary-500/30 transition-all cursor-pointer group"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-sm">{icon}</span>
            <h4 className="font-semibold text-sm truncate max-w-[180px]">{entry.title}</h4>
            {entry.favorite && <span className="text-yellow-400 text-xs">⭐</span>}
            {entry.totp && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">TOTP</span>}
            {expired && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">{t('dashboard.expired_label')||'Expired'}</span>}
            {expiring && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">{exp}d</span>}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${s.hx}20`, color: s.hx }}
            >
              {s.lb}
            </span>
          </div>
          <p className="text-xs text-dark-400 truncate">{subtitle}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {entry.type === 'password' && (
              <>
                <code className="text-xs px-2 py-0.5 rounded bg-dark-800 border border-dark-700 font-mono min-w-[40px] inline-block text-left dir-ltr">
                  {showPwd ? entry.password : '•'.repeat(Math.min((entry.password || '').length, 12))}
                </code>
                <button onClick={e => { e.stopPropagation(); onTogglePwd(); }} className="text-xs text-dark-400 hover:text-dark-200">
                  {showPwd ? '🙈' : '👁️'}
                </button>
                <button onClick={e => { e.stopPropagation(); copyToClipboard(entry.password || '', toast); }} className="text-xs text-dark-400 hover:text-dark-200">
                  📋
                </button>
              </>
            )}
            {entry.totp && (
              <button onClick={e => { e.stopPropagation(); onShowTotp(); }} className="text-xs text-emerald-400 hover:text-emerald-300">
                🔑 TOTP
              </button>
            )}
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-xs text-primary-400 hover:text-primary-300">
                🔗
              </a>
            )}
            <span className="text-xs text-dark-500">{daysAgo(entry.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 rounded-lg text-xs text-dark-400 hover:bg-dark-700 hover:text-dark-200">✏️</button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/20">🗑️</button>
        </div>
      </div>
    </div>
  );
}

/* ===== ENTRY FORM MODAL ===== */
function EntryFormModal({ open, entry, form, onChange, onSave, onClose }: any) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isNew = !entry;

  const updateField = (field: string, value: any) => onChange({ ...form, [field]: value });

  const handleGenPwd = (type: string) => {
    let result = { pw: '', ent: 0 };
    if (type.startsWith('pwd-')) {
      result = genPassword(parseInt(type.split('-')[1]), { u: true, l: true, n: true, s: true, av: false });
    } else if (type.startsWith('phrase-')) {
      result = genPhrase(parseInt(type.split('-')[1]), '-', true, true);
    } else if (type.startsWith('pin-')) {
      result = genPin(parseInt(type.split('-')[1]));
    }
    if (result.pw) {
      updateField('password', result.pw);
      toast('✅ Generated');
    }
  };

  const handleTestTotp = async () => {
    if (!form.totp) { toast(t('errors.totp_invalid'), 'error'); return; }
    try {
      const code = await generateTOTP(form.totp);
      toast(`🔑 ${code}`, 'info');
    } catch { toast(t('errors.totp_invalid'), 'error'); }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-5">
        <h3 className="text-lg font-bold mb-4">
          {isNew ? `✨ ${t('vault.add_title')}` : `✏️ ${t('vault.edit_title')}`}
        </h3>

        {/* Type selector */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {ENTRY_TYPES.map(et => (
            <button
              key={et.id}
              onClick={() => updateField('type', et.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                (form.type || 'password') === et.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
              }`}
            >
              {et.icon} {lang === 'ar' ? et.labelAr : et.labelEn}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Common fields */}
          <input
            type="text"
            placeholder={t('vault.title_field')}
            value={form.title || ''}
            onChange={e => updateField('title', e.target.value)}
            className="input-field text-sm"
            autoFocus
          />

          {/* Password fields */}
          {(!form.type || form.type === 'password') && (
            <>
              <input type="url" placeholder={t('vault.url_field')} value={form.url || ''} onChange={e => updateField('url', e.target.value)} className="input-field text-sm dir-ltr" />
              <input type="text" placeholder={t('vault.username_field')} value={form.username || ''} onChange={e => updateField('username', e.target.value)} className="input-field text-sm" />
              <div className="flex gap-2 items-stretch">
                <div className="relative flex-1">
                  <input type="text" placeholder={t('vault.password_field')} value={form.password || ''} onChange={e => updateField('password', e.target.value)} className="input-field text-sm font-mono dir-ltr" />
                </div>
                <select onChange={e => { handleGenPwd(e.target.value); e.target.value = ''; }} className="input-field !w-auto text-xs" defaultValue="">
                  <option value="" disabled>🎲</option>
                  <option value="pwd-16">🔑 16</option>
                  <option value="pwd-24">🔑 24</option>
                  <option value="pwd-32">🔑 32</option>
                  <option value="phrase-4">🔤 4</option>
                  <option value="phrase-6">🔤 6</option>
                  <option value="pin-6">🔢 6</option>
                  <option value="pin-8">🔢 8</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder={t('vault.totp_field')} value={form.totp || ''} onChange={e => updateField('totp', e.target.value)} className="input-field text-sm font-mono dir-ltr flex-1" />
                <button onClick={handleTestTotp} className="btn-secondary text-xs px-2" title="Test TOTP">🔑</button>
              </div>
            </>
          )}

          {/* Identity fields */}
          {form.type === 'identity' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder={t('vault.fullname_field')} value={form.fullName || ''} onChange={e => updateField('fullName', e.target.value)} className="input-field text-sm col-span-2" />
              <input type="email" placeholder={t('vault.email_field')} value={form.email || ''} onChange={e => updateField('email', e.target.value)} className="input-field text-sm" />
              <input type="tel" placeholder={t('vault.phone_field')} value={form.phone || ''} onChange={e => updateField('phone', e.target.value)} className="input-field text-sm" />
              <input type="text" placeholder={t('vault.address_field')} value={form.address || ''} onChange={e => updateField('address', e.target.value)} className="input-field text-sm col-span-2" />
              <input type="text" placeholder={t('vault.idnumber_field')} value={form.idNumber || ''} onChange={e => updateField('idNumber', e.target.value)} className="input-field text-sm col-span-2" />
            </div>
          )}

          {/* Payment fields */}
          {form.type === 'payment' && (
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder={t('vault.cardname_field')} value={form.cardName || ''} onChange={e => updateField('cardName', e.target.value)} className="input-field text-sm col-span-2" />
              <input type="text" placeholder={t('vault.cardnum_field')} value={form.cardNum || ''} onChange={e => updateField('cardNum', e.target.value)} className="input-field text-sm col-span-2 font-mono dir-ltr" />
              <input type="text" placeholder={t('vault.cardexp_field')} value={form.cardExp || ''} onChange={e => updateField('cardExp', e.target.value)} className="input-field text-sm font-mono dir-ltr" />
              <input type="text" placeholder={t('vault.cardcvv_field')} value={form.cardCvv || ''} onChange={e => updateField('cardCvv', e.target.value)} className="input-field text-sm font-mono dir-ltr" />
              <input type="text" placeholder={t('vault.cardpin_field')} value={form.cardPin || ''} onChange={e => updateField('cardPin', e.target.value)} className="input-field text-sm font-mono dir-ltr col-span-2" />
            </div>
          )}

          {/* Note */}
          {form.type === 'note' && (
            <textarea
              placeholder={t('vault.notes_field')}
              value={form.notes || ''}
              onChange={e => updateField('notes', e.target.value)}
              className="input-field text-sm resize-none min-h-[80px]"
              rows={3}
            />
          )}

          {/* Common bottom fields */}
          {(form.type === 'password' || form.type === 'note') && (
            <textarea
              placeholder={t('vault.notes_field')}
              value={form.notes || ''}
              onChange={e => updateField('notes', e.target.value)}
              className="input-field text-sm resize-none"
              rows={2}
            />
          )}

          <input
            type="text"
            placeholder={t('vault.tags_field')}
            value={form.tags || ''}
            onChange={e => updateField('tags', e.target.value)}
            className="input-field text-sm"
          />

          <div className="flex gap-3 items-center">
            <input
              type="date"
              value={form.expiry || ''}
              onChange={e => updateField('expiry', e.target.value)}
              className="input-field !w-auto text-sm"
            />
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={form.favorite || false}
                onChange={e => updateField('favorite', e.target.checked)}
                className="w-4 h-4 accent-primary-500"
              />
              ⭐ {t('vault.favorite_label')}
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">{t('common.cancel')}</button>
          <button onClick={onSave} className="btn-primary flex-1">💾 {t('common.save')}</button>
        </div>
      </div>
    </Modal>
  );
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let curr = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { cols.push(curr); curr = ''; }
    else curr += c;
  }
  cols.push(curr);
  return cols;
}



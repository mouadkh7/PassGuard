/* ===============================================
   PassGuard v6.0 - Application Core
   =============================================== */

/* ========== STORAGE ========== */
const ST = {
  load() {
    try {
      const r = localStorage.getItem(APP.key);
      return r ? JSON.parse(r) : null;
    } catch { return null; }
  },
  save(v) {
    localStorage.setItem(APP.key, JSON.stringify(v));
  },
  loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(APP.key + '_settings') || '{}');
    } catch { return {}; }
  },
  saveSettings(s) {
    localStorage.setItem(APP.key + '_settings', JSON.stringify(s));
  },
  loadHealthHistory() {
    try {
      return JSON.parse(localStorage.getItem('pg_health_hist') || '[]');
    } catch { return []; }
  },
  saveHealthHistory(hist) {
    localStorage.setItem('pg_health_hist', JSON.stringify(hist));
  }
};

/* ========== THEME ========== */
function applyTheme(t) {
  const d = document.documentElement;
  if (t === 'system') {
    t = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  }
  d.classList.toggle('light', t === 'light');
  const meta = $('#metaTheme');
  if (meta) meta.content = t === 'dark' ? '#0f172a' : '#f0f4f8';
  const toggle = $('#themeToggle');
  if (toggle) toggle.textContent = t === 'dark' ? '🌙' : '☀️';
}

/* ========== TOAST ========== */
function toast(msg, type = 'success', dur = 3000) {
  const c = $('#toast');
  if (!c) return;
  const t = document.createElement('div');
  const colors = {
    success: 'success',
    error: 'error',
    info: 'info',
    warning: 'warning'
  };
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  t.className = `toast ${colors[type] || 'info'}`;
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, dur);
}

/* ========== TAB SWITCHING ========== */
function switchTab(t) {
  STATE.tab = t;

  $$('.tab-btn').forEach(b => {
    b.classList.toggle('tab-active', b.dataset.tab === t);
  });
  $$('.mobile-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === t);
  });
  $$('.tab-content').forEach(c => c.classList.remove('active'));

  const el = document.getElementById('tab-' + t);
  if (el) {
    el.classList.add('active');
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
  }

  if (t === 'vault') updateVault();
  if (t === 'dashboard') updateDash();
}

$$('.tab-btn, .mobile-nav-btn').forEach(b => {
  b.addEventListener('click', () => switchTab(b.dataset.tab));
});

$('#dashGoVault')?.addEventListener('click', () => switchTab('vault'));

/* ========== VAULT CORE ========== */
async function unlock(pwd) {
  let v = ST.load();
  if (!v) {
    const s = CR.rnd(16);
    const k = await CR.derive(pwd, s);
    v = {
      salt: CR.saltToStr(s),
      test: await CR.enc('PG_OK', k),
      entries: { iv: '', data: '' },
      folders: { iv: '', data: '' },
      created: now()
    };
    ST.save(v);
    STATE.key = k;
    STATE.mp = pwd;
    STATE.data = [];
    STATE.folders = [];
    return true;
  }
  try {
    const s = CR.strToSalt(v.salt);
    const k = await CR.derive(pwd, s);
    const test = await CR.dec(v.test, k);
    if (test !== 'PG_OK') throw new Error('Bad password');
    STATE.key = k;
    STATE.mp = pwd;
    STATE.data = v.entries?.data ? JSON.parse(await CR.dec(v.entries, k)) : [];
    STATE.folders = v.folders?.data ? JSON.parse(await CR.dec(v.folders, k)) : [];
    return true;
  } catch {
    return false;
  }
}

async function saveAll() {
  if (!STATE.key) return;
  const v = ST.load();
  if (!v) return;
  v.entries = await CR.enc(JSON.stringify(STATE.data), STATE.key);
  v.folders = await CR.enc(JSON.stringify(STATE.folders), STATE.key);
  v.updated = now();
  ST.save(v);

  const sc = healthScore();
  const hist = ST.loadHealthHistory();
  hist.push({ date: now(), score: sc, count: STATE.data.length });
  if (hist.length > 30) hist.splice(0, hist.length - 30);
  ST.saveHealthHistory(hist);
}

function lock() {
  STATE.key = null;
  STATE.mp = null;
  STATE.data = [];
  STATE.folders = [];
  STATE.pinEnabled = false;
  const mpInput = $('#mp');
  if (mpInput) mpInput.value = '';
  hide('vaultContent');
  show('unlockForm');
  hide('vaultActions');
  updateDash();
}

/* ========== UNLOCK UI ========== */
$('#btnUnlock')?.addEventListener('click', async () => {
  const p = $('#mp')?.value;
  if (!p || p.length < 4) {
    toast('كلمة المرور قصيرة (4+ أحرف)', 'error');
    return;
  }
  const btn = $('#btnUnlock');
  btn.disabled = true;
  btn.innerHTML = '⏳...';
  const ok = await unlock(p);
  btn.disabled = false;
  btn.innerHTML = '🔓 فتح';
  if (ok) {
    if ($('#mp')) $('#mp').value = '';
    toast('تم فتح الخزنة');
    /* Update PIN encryption if PIN was set before unlock */
    syncPinEncryption();
    updateVault();
    updateDash();
    updateSettingsUI();
  } else {
    toast('كلمة المرور خاطئة', 'error');
  }
});

$('#mp')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#btnUnlock')?.click();
});

$('#toggleMp')?.addEventListener('click', () => {
  const i = $('#mp');
  if (i) i.type = i.type === 'password' ? 'text' : 'password';
});

$('#btnLock')?.addEventListener('click', () => {
  lock();
  toast('تم القفل', 'info');
});

/* ========== VAULT UI ========== */
function updateVault() {
  const u = STATE.key !== null;
  const unlockForm = $('#unlockForm');
  const vaultContent = $('#vaultContent');
  const vaultActions = $('#vaultActions');
  const firstTimeMsg = $('#firstTimeMsg');

  if (unlockForm) unlockForm.classList.toggle('hidden', u);
  if (vaultContent) vaultContent.classList.toggle('hidden', !u);
  if (vaultActions) vaultActions.classList.toggle('hidden', !u);

  const first = !ST.load();
  if (firstTimeMsg) firstTimeMsg.classList.toggle('hidden', !first || u);

  if (u) renderEntries();
}

$('#vSearch')?.addEventListener('input', renderEntries);
$('#vFilter')?.addEventListener('change', function () { _filter = this.value; renderEntries(); });
$('#vSort')?.addEventListener('change', function () { _sort = this.value; renderEntries(); });
$('#vFolder')?.addEventListener('change', function () { _folder = this.value; renderEntries(); });

/* ========== ENTRIES ========== */
function getSorted(arr) {
  const a = [...arr];
  switch (_sort) {
    case 'date-desc':
      return a.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'date-asc':
      return a.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    case 'title-asc':
      return a.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ar'));
    case 'title-desc':
      return a.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'ar'));
    default:
      return a;
  }
}

function getTypeIcon(type) {
  const icons = { password: '🔑', note: '📝', identity: '🪪', payment: '💳' };
  return icons[type] || '🔑';
}

function getTypeLabel(type) {
  const labels = { password: 'كلمة مرور', note: 'ملاحظة', identity: 'هوية', payment: 'بطاقة' };
  return labels[type] || 'كلمة مرور';
}

function renderEntries() {
  const list = $('#entriesList');
  const empty = $('#emptyVault');
  const noRes = $('#noResults');
  const searchInput = $('#vSearch');
  const entryCount = $('#entryCount');

  const st = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let f = [...STATE.data];

  if (_filter !== 'all') f = f.filter(e => e.type === _filter);
  if (_folder === '__favorites') f = f.filter(e => e.favorite);
  else if (_folder !== '__all') f = f.filter(e => e.folder === _folder);

  if (st) {
    f = f.filter(e =>
      (e.title || '').toLowerCase().includes(st) ||
      (e.username || '').toLowerCase().includes(st) ||
      (e.notes || '').toLowerCase().includes(st)
    );
  }

  f = getSorted(f);

  if (entryCount) entryCount.textContent = STATE.data.length;

  if (!STATE.data.length) {
    if (empty) empty.classList.remove('hidden');
    if (noRes) noRes.classList.add('hidden');
    if (list) list.innerHTML = '';
    updateStats();
    return;
  }

  if (empty) empty.classList.add('hidden');

  if (!f.length) {
    if (noRes) noRes.classList.remove('hidden');
    if (list) list.innerHTML = '';
    updateStats();
    return;
  }

  if (noRes) noRes.classList.add('hidden');

  list.innerHTML = f.map((e, i) => {
    const ri = STATE.data.indexOf(e);
    const s = GEN.str(e.password || '');
    const icon = getTypeIcon(e.type);

    const exp = e.expiry ? Math.ceil((new Date(e.expiry).getTime() - now()) / 864e5) : null;
    const expired = exp !== null && exp <= 0;
    const expiring = exp !== null && exp > 0 && exp <= 14;

    const hasTotp = !!e.totp;

    let sub = e.username || '';
    if (e.type === 'note') sub = e.notes ? (e.notes.slice(0, 80) + (e.notes.length > 80 ? '...' : '')) : '';
    if (e.type === 'identity') sub = e.fullName || e.email || '';
    if (e.type === 'payment') sub = '•••• ' + ((e.cardNum || '').slice(-4));

    return `<div class="entry-card" data-idx="${ri}" style="animation-delay:${Math.min(i * 25, 300)}ms">
      <div class="entry-top">
        <div class="entry-info">
          <div class="entry-title-row">
            <span class="text-muted">${icon}</span>
            <span class="entry-title">${escapeHtml(e.title || 'بدون عنوان')}</span>
            ${e.favorite ? '<span style="color:#eab308;font-size:12px">⭐</span>' : ''}
            ${hasTotp ? '<span class="chip chip-green chip-tiny">TOTP</span>' : ''}
            ${expired ? '<span class="chip chip-red chip-tiny">منتهي</span>' : ''}
            ${expiring ? `<span class="chip chip-yellow chip-tiny">${exp} يوم</span>` : ''}
            <span class="chip" style="background:${s.hx}20;color:${s.hx};border-color:${s.hx}30;font-size:9px;padding:0 6px">${s.lb}</span>
          </div>
          <div class="entry-sub">${escapeHtml(sub)}</div>
          <div class="entry-actions">
            ${e.type === 'password' ? `
              <code class="pwd-display" data-pwd="${ri}">${'•'.repeat(Math.min((e.password || '').length, 12))}</code>
              <button class="action-mini tpwd" data-idx="${ri}">👁️</button>
              <button class="action-mini cpwd" data-idx="${ri}">📋</button>
            ` : ''}
            ${hasTotp ? `<button class="action-mini ttotp" data-idx="${ri}" style="color:#4ade80">🔑 TOTP</button>` : ''}
            ${e.url ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener" class="action-mini" style="color:#818cf8">🔗</a>` : ''}
            <span class="text-muted">${daysAgo(e.createdAt)}</span>
          </div>
        </div>
        <div class="entry-actions-row">
          <button class="epwd action-mini" data-idx="${ri}" title="تعديل">✏️</button>
          <button class="dpwd action-mini" data-idx="${ri}" title="حذف" style="color:#f87171">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');

  /* Populate h4 and p text content */
  f.forEach((e, i) => {
    const card = list.children[i];
    if (!card) return;
    const ri = STATE.data.indexOf(e);
    if (ri === -1) return;

    const pwdEl = card.querySelector(`[data-pwd="${ri}"]`);
    if (pwdEl) pwdEl.textContent = '•'.repeat(Math.min((e.password || '').length, 12));
  });

  /* Event listeners */
  list.querySelectorAll('.tpwd').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.idx);
      const e = STATE.data.find(x => STATE.data.indexOf(x) === idx);
      if (!e) return;
      const pe = list.querySelector(`[data-pwd="${idx}"]`);
      if (!pe) return;
      if (pe.textContent.startsWith('•')) {
        pe.textContent = e.password;
        b.textContent = '🙈';
      } else {
        pe.textContent = '•'.repeat(Math.min((e.password || '').length, 12));
        b.textContent = '👁️';
      }
    });
  });

  list.querySelectorAll('.cpwd').forEach(b => {
    b.addEventListener('click', () => {
      const e = STATE.data.find(x => STATE.data.indexOf(x) === parseInt(b.dataset.idx));
      if (e) copyClip(e.password || '');
    });
  });

  list.querySelectorAll('.epwd').forEach(b => {
    b.addEventListener('click', () => {
      const e = STATE.data.find(x => STATE.data.indexOf(x) === parseInt(b.dataset.idx));
      if (e) openEntryModal(e);
    });
  });

  list.querySelectorAll('.dpwd').forEach(b => {
    b.addEventListener('click', () => {
      const e = STATE.data.find(x => STATE.data.indexOf(x) === parseInt(b.dataset.idx));
      if (!e || !confirm(`حذف "${e.title}"؟`)) return;
      STATE.data = STATE.data.filter(x => x !== e);
      saveAll().then(() => { renderEntries(); toast('تم الحذف'); });
    });
  });

  list.querySelectorAll('.ttotp').forEach(b => {
    b.addEventListener('click', () => {
      const e = STATE.data.find(x => STATE.data.indexOf(x) === parseInt(b.dataset.idx));
      if (e && e.totp) showTotp(e);
    });
  });

  updateStats();
}

function updateStats() {
  const bar = $('#statsRow');
  if (!bar) return;
  if (!STATE.data.length) {
    bar.innerHTML = '';
    return;
  }
  const s = STATE.data.filter(e => GEN.str(e.password || '').sc >= 80).length;
  const w = STATE.data.filter(e => GEN.str(e.password || '').sc < 50).length;
  const r = STATE.data.filter(e => STATE.data.filter(x => x.password && x.password === e.password).length > 1).length;

  let html = `<span>📊 <strong>${STATE.data.length}</strong> إدخال</span>`;
  html += `<span style="color:#4ade80">🟢 <strong>${s}</strong> قوية</span>`;
  if (w) html += `<span style="color:#f87171">🔴 <strong>${w}</strong> ضعيفة</span>`;
  if (r) html += `<span style="color:#facc15">🟡 <strong>${r}</strong> مكررة</span>`;
  bar.innerHTML = html;
}

/* ========== TOTP DISPLAY ========== */
function showTotp(entry) {
  const m = $('#totpModal');
  if (!m) return;
  m.classList.add('active');
  m.style.display = 'flex';

  const codeEl = $('#totpCode');
  const labelEl = $('#totpLabel');
  const prog = $('#totpProgress');
  const timerEl = $('#totpTimer');

  if (labelEl) labelEl.textContent = entry.title || 'TOTP';
  let running = true;

  async function tick() {
    if (!running) return;
    try {
      const code = await CR.totp(entry.totp);
      if (codeEl) codeEl.textContent = code;
    } catch {
      if (codeEl) codeEl.textContent = '-----';
    }
    const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
    if (prog) prog.style.width = (sec / 30 * 100) + '%';
    if (timerEl) timerEl.textContent = sec;
    setTimeout(tick, 1000);
  }
  tick();

  const close = () => {
    running = false;
    m.classList.remove('active');
    m.style.display = 'none';
  };

  m.addEventListener('click', function (e) {
    if (e.target === this) close();
  });
}

/* ========== ENTRY MODAL ========== */
function openEntryModal(entry) {
  const m = $('#entryModal');
  if (!m) return;

  const isNew = !entry;
  const title = $('#modalTitle');
  if (title) title.textContent = isNew ? 'إضافة إدخال' : 'تعديل الإدخال';

  const editId = $('#editId');
  if (editId) editId.value = entry ? entry.id : '';

  const type = entry ? entry.type || 'password' : 'password';
  const mType = $('#mType');
  if (mType) mType.value = type;

  /* Set type tabs */
  $$('.type-btn').forEach(b => {
    const active = b.dataset.etype === type;
    b.classList.toggle('active', active);
  });

  /* Show/hide fields */
  const pwdFields = $('#mPwdFields');
  const idFields = $('#mIdFields');
  const payFields = $('#mPayFields');
  if (pwdFields) pwdFields.classList.toggle('hidden', type !== 'password');
  if (idFields) idFields.classList.toggle('hidden', type !== 'identity');
  if (payFields) payFields.classList.toggle('hidden', type !== 'payment');

  /* Set values */
  $set('mTitle', entry ? entry.title || '' : '');
  $set('mUrl', entry ? entry.url || '' : '');
  $set('mUsername', entry ? entry.username || '' : '');
  $set('mPassword', entry ? entry.password || '' : '');
  $set('mTotp', entry ? entry.totp || '' : '');
  $set('mNotes', entry ? entry.notes || '' : '');
  $set('mTags', entry ? entry.tags || '' : '');
  $set('mExpiry', entry ? entry.expiry || '' : '');
  if ($('#mFavorite')) $('#mFavorite').checked = entry ? !!entry.favorite : false;
  $set('mFullName', entry ? entry.fullName || '' : '');
  $set('mEmail', entry ? entry.email || '' : '');
  $set('mPhone', entry ? entry.phone || '' : '');
  $set('mAddress', entry ? entry.address || '' : '');
  $set('mIdNumber', entry ? entry.idNumber || '' : '');
  $set('mCardName', entry ? entry.cardName || '' : '');
  $set('mCardNum', entry ? entry.cardNum || '' : '');
  $set('mCardExp', entry ? entry.cardExp || '' : '');
  $set('mCardCvv', entry ? entry.cardCvv || '' : '');
  $set('mCardPin', entry ? entry.cardPin || '' : '');

  m.classList.add('active');
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#mTitle')?.focus(), 100);
}

function closeModal() {
  const m = $('#entryModal');
  if (m) {
    m.classList.remove('active');
    m.style.display = 'none';
  }
  document.body.style.overflow = '';
}

$('#modalClose')?.addEventListener('click', closeModal);
$('#modalCancel')?.addEventListener('click', closeModal);

$('#entryModal')?.addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

/* Type switching in modal */
$$('.type-btn').forEach(b => {
  b.addEventListener('click', function () {
    $$('.type-btn').forEach(b2 => b2.classList.toggle('active', b2 === this));
    const mType = $('#mType');
    if (mType) mType.value = this.dataset.etype;
    const t = this.dataset.etype;
    const pwdFields = $('#mPwdFields');
    const idFields = $('#mIdFields');
    const payFields = $('#mPayFields');
    if (pwdFields) pwdFields.classList.toggle('hidden', t !== 'password');
    if (idFields) idFields.classList.toggle('hidden', t !== 'identity');
    if (payFields) payFields.classList.toggle('hidden', t !== 'payment');
  });
});

$('#toggleMpwd')?.addEventListener('click', () => {
  const i = $('#mPassword');
  if (i) i.type = i.type === 'password' ? 'text' : 'password';
});

$('#mPwdGen')?.addEventListener('change', function () {
  const v = this.value;
  if (!v) return;
  let pw = '';
  if (v.startsWith('pwd-')) {
    const res = GEN.genPwd(parseInt(v.split('-')[1]), { u: 1, l: 1, n: 1, s: 1, av: 0 });
    pw = res.pw;
  } else if (v.startsWith('phrase-')) {
    const res = GEN.genPhrase(parseInt(v.split('-')[1]), '-', 1, 1);
    pw = res.pw;
  } else if (v.startsWith('pin-')) {
    const res = GEN.genPin(parseInt(v.split('-')[1]));
    pw = res.pw;
  }
  const mp = $('#mPassword');
  if (mp) mp.value = pw;
  this.value = '';
  toast('تم توليد كلمة المرور');
});

$('#btnTotpTest')?.addEventListener('click', async () => {
  const secret = $('#mTotp')?.value?.trim();
  if (!secret) { toast('أدخل TOTP Secret أولاً', 'warning'); return; }
  try {
    const code = await CR.totp(secret);
    toast(`الرمز: ${code}`, 'success', 5000);
  } catch {
    toast('Secret غير صالح — تأكد من ترميز base32', 'error');
  }
});

$('#modalSave')?.addEventListener('click', async () => {
  const title = $('#mTitle')?.value?.trim();
  const type = $('#mType')?.value || 'password';
  const editId = $('#editId')?.value;

  if (!title) { toast('العنوان مطلوب', 'error'); return; }

  const base = {
    title,
    type: type || 'password',
    favorite: $('#mFavorite')?.checked || false,
    tags: $('#mTags')?.value?.trim() || '',
    expiry: $('#mExpiry')?.value || '',
    notes: $('#mNotes')?.value?.trim() || '',
    updatedAt: now()
  };

  if (type === 'password') {
    base.url = $('#mUrl')?.value?.trim() || '';
    base.username = $('#mUsername')?.value?.trim() || '';
    base.password = $('#mPassword')?.value || '';
    base.totp = $('#mTotp')?.value?.trim() || '';
  }
  if (type === 'identity') {
    base.fullName = $('#mFullName')?.value?.trim() || '';
    base.email = $('#mEmail')?.value?.trim() || '';
    base.phone = $('#mPhone')?.value?.trim() || '';
    base.address = $('#mAddress')?.value?.trim() || '';
    base.idNumber = $('#mIdNumber')?.value?.trim() || '';
  }
  if (type === 'payment') {
    base.cardName = $('#mCardName')?.value?.trim() || '';
    base.cardNum = $('#mCardNum')?.value?.trim() || '';
    base.cardExp = $('#mCardExp')?.value?.trim() || '';
    base.cardCvv = $('#mCardCvv')?.value?.trim() || '';
    base.cardPin = $('#mCardPin')?.value?.trim() || '';
  }

  if (editId) {
    const e = STATE.data.find(x => x.id === editId);
    if (e) {
      const hist = e.passwordHistory || [];
      if (e.password && e.password !== base.password && base.password) {
        hist.push({ pw: e.password, at: now() });
        if (hist.length > 20) hist.splice(0, hist.length - 20);
      }
      Object.assign(e, base, { passwordHistory: hist });
    }
    toast('تم التحديث');
  } else {
    base.id = genId();
    base.createdAt = now();
    base.passwordHistory = [];
    STATE.data.push(base);
    toast('تمت الإضافة');
  }

  await saveAll();
  closeModal();
  renderEntries();
  updateDash();
});

$('#btnAdd')?.addEventListener('click', () => openEntryModal(null));

/* ========== IMPORT / EXPORT ========== */
async function exportJson() {
  if (!STATE.key) { toast('افتح الخزنة أولاً', 'warning'); return; }
  try {
    const e = await CR.enc(JSON.stringify({ data: STATE.data, folders: STATE.folders, exportedAt: now(), version: APP.version }), STATE.key);
    const pkg = JSON.stringify({ v: 5, data: e, exportedAt: now() });
    const blob = new Blob([pkg], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `passguard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('تم التصدير');
  } catch {
    toast('فشل التصدير', 'error');
  }
}

async function exportCsv() {
  if (!STATE.key || !STATE.data.length) { toast('الخزنة فارغة أو مغلقة', 'warning'); return; }
  const h = 'title,url,username,password,type,notes,totp,tags,favorite,expiry,createdAt';
  const rows = STATE.data.map(e => [
    e.title || '', e.url || '', e.username || '', e.password || '',
    e.type || 'password', (e.notes || '').replace(/"/g, '""'),
    e.totp || '', e.tags || '', e.favorite ? 'true' : '', e.expiry || '', e.createdAt || ''
  ]);
  const csv = h + '\n' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `passguard-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('تم التصدير');
}

async function importBitwardenJson(text) {
  try {
    const items = JSON.parse(text);
    const arr = items.items || items;
    if (!Array.isArray(arr)) throw new Error('Not an array');
    let added = 0;
    const ids = new Set(STATE.data.map(e => e.id));
    for (const item of arr) {
      const newId = genId();
      if (ids.has(newId)) continue;
      ids.add(newId);
      const entry = {
        id: newId,
        title: item.name || '',
        url: item.login?.uris?.[0]?.uri || item.login?.url || '',
        username: item.login?.username || '',
        password: item.login?.password || '',
        type: 'password',
        notes: item.notes || '',
        totp: item.login?.totp || '',
        tags: (item.collectionIds || []).join(','),
        favorite: !!item.favorite,
        expiry: '',
        createdAt: item.creationDate ? new Date(item.creationDate).getTime() : now(),
        passwordHistory: []
      };
      STATE.data.push(entry);
      added++;
    }
    return added;
  } catch { return -1; }
}

async function importCsv(text) {
  try {
    const lines = text.split('\n').filter(l => l.trim());
    const dataLines = lines.slice(1);
    let added = 0;
    const ids = new Set(STATE.data.map(e => e.id));
    for (const line of dataLines) {
      const cols = [];
      let curr = '', inQ = false;
      for (const c of line) {
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { cols.push(curr); curr = ''; }
        else curr += c;
      }
      cols.push(curr);
      const [title, url, username, password, type, notes, totp, tags, favorite, expiry] = cols;
      const newId = genId();
      if (ids.has(newId)) continue;
      ids.add(newId);
      STATE.data.push({
        id: newId, title: title || '', url: url || '', username: username || '',
        password: password || '', type: type || 'password',
        notes: (notes || '').replace(/""/g, '"'), totp: totp || '',
        tags: tags || '', favorite: favorite === 'true', expiry: expiry || '',
        createdAt: now(), passwordHistory: []
      });
      added++;
    }
    return added;
  } catch { return -1; }
}

async function importPwJson(text) {
  try {
    const pkg = JSON.parse(text);
    if (!pkg.data) return -1;
    const dec = await CR.dec(pkg.data, STATE.key);
    const d = JSON.parse(dec);
    if (!d.data) return -1;
    let added = 0;
    for (const e of d.data) {
      if (!STATE.data.find(x => x.id === e.id)) {
        STATE.data.push(e);
        added++;
      }
    }
    return added;
  } catch { return -1; }
}

$('#setExportJson')?.addEventListener('click', exportJson);
$('#setExportCsv')?.addEventListener('click', exportCsv);

/* Import from settings */
$('#setImport')?.addEventListener('click', () => {
  if (!STATE.key) { toast('افتح الخزنة أولاً', 'warning'); return; }
  const m = $('#importModal');
  if (m) { m.classList.add('active'); m.style.display = 'flex'; }
});

$('#importCancel')?.addEventListener('click', () => {
  const m = $('#importModal');
  if (m) { m.classList.remove('active'); m.style.display = 'none'; }
  const fi = $('#importFile');
  if (fi) fi.value = '';
});

$('#importModal')?.addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('active');
    this.style.display = 'none';
    const fi = $('#importFile');
    if (fi) fi.value = '';
  }
});

/* Import confirm - fixed: reads from #importFile on confirm click */
$('#importConfirm')?.addEventListener('click', async () => {
  const fileInput = $('#importFile');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    toast('اختر ملفاً أولاً', 'warning');
    return;
  }
  const fmt = $('#importFormat')?.value || 'bitwarden-json';
  try {
    const text = await fileInput.files[0].text();
    let added = 0;
    if (fmt === 'bitwarden-json') {
      added = await importBitwardenJson(text);
    } else if (fmt === 'pg-json') {
      added = await importPwJson(text);
    } else if (fmt === 'csv') {
      added = await importCsv(text);
    }
    if (added >= 0) {
      await saveAll();
      renderEntries();
      updateDash();
      toast(`تم استيراد ${added} إدخال`);
    } else {
      toast('فشل الاستيراد', 'error');
    }
  } catch {
    toast('فشل الاستيراد — تأكد من صحة الملف', 'error');
  }
  const m = $('#importModal');
  if (m) { m.classList.remove('active'); m.style.display = 'none'; }
  if (fileInput) fileInput.value = '';
});

/* Export/Import from vault header */
$('#btnExportVault')?.addEventListener('click', () => {
  if (!STATE.key) return;
  const s = ST.loadSettings();
  const choice = confirm('JSON للتصدير بتنسيق\nOK = JSON, Cancel = CSV');
  if (choice) exportJson(); else exportCsv();
});

$('#btnImportVault')?.addEventListener('click', () => {
  if (!STATE.key) { toast('افتح الخزنة أولاً', 'warning'); return; }
  const m = $('#importModal');
  if (m) { m.classList.add('active'); m.style.display = 'flex'; }
});

$('#setClear')?.addEventListener('click', () => {
  if (confirm('هل أنت متأكد؟ هذا سيحذف جميع البيانات!')) {
    STATE.data = [];
    STATE.folders = [];
    saveAll().then(() => { renderEntries(); updateDash(); toast('تم المسح'); });
  }
});

/* ========== DASHBOARD ========== */
function healthScore() {
  return STATE.data.length
    ? Math.round(STATE.data.reduce((s, e) => s + GEN.health(e.password || '').sc, 0) / STATE.data.length)
    : 100;
}

function updateDash() {
  const u = STATE.key !== null;
  const locked = $('#dashLocked');
  const content = $('#dashContent');
  if (locked) locked.classList.toggle('hidden', u);
  if (content) content.classList.toggle('hidden', !u);
  if (u) renderDash();
}

function renderDash() {
  const r = $('#dashContent');
  if (!r) return;

  if (!STATE.data.length) {
    r.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p style="color:var(--text-2)">الخزنة فارغة</p></div>`;
    return;
  }

  let ts = 0, wk = 0, md = 0, sg = 0;
  const pwMap = {};

  STATE.data.forEach(e => {
    const h = GEN.health(e.password || '');
    ts += h.sc;
    if (h.sc < 50) wk++;
    else if (h.sc < 80) md++;
    else sg++;
    const p = e.password || '';
    if (!pwMap[p]) pwMap[p] = [];
    pwMap[p].push(e.title || '?');
  });

  const avg = Math.round(ts / STATE.data.length);
  const reused = Object.values(pwMap).filter(a => a.length > 1);

  let grade, gcolor, gradeLabel;
  if (avg >= 90) { grade = 'A+'; gcolor = '#4ade80'; gradeLabel = 'ممتاز'; }
  else if (avg >= 80) { grade = 'A'; gcolor = '#4ade80'; gradeLabel = 'ممتاز'; }
  else if (avg >= 70) { grade = 'B'; gcolor = '#60a5fa'; gradeLabel = 'جيد'; }
  else if (avg >= 55) { grade = 'C'; gcolor = '#eab308'; gradeLabel = 'متوسط'; }
  else { grade = 'D'; gcolor = '#f87171'; gradeLabel = 'ضعيف'; }

  const hasTotp = STATE.data.filter(e => e.totp).length;
  const pctTotp = STATE.data.length ? Math.round(hasTotp / STATE.data.length * 100) : 0;
  const weakEntries = STATE.data.filter(e => GEN.health(e.password || '').sc < 50);
  const expired = STATE.data.filter(e => e.expiry && new Date(e.expiry) < now());
  const hist = ST.loadHealthHistory();
  const breached = STATE.data.filter(e => GEN.health(e.password || '').iss.some(i => i.includes('نمط شائع')));
  const reusedCount = Object.entries(pwMap).filter(([p, a]) => a.length > 1).length;

  let html = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:${gcolor}">${grade}</div><div class="stat-label">${gradeLabel}</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#818cf8">${STATE.data.length}</div><div class="stat-label">إجمالي</div></div>
      <div class="stat-card"><div class="stat-value" style="color:#4ade80">${sg}</div><div class="stat-label">قوية</div></div>
      <div class="stat-card"><div class="stat-value" style="color:${wk > 0 ? '#f87171' : '#4ade80'}">${wk}</div><div class="stat-label">ضعيفة</div></div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:${reusedCount > 0 ? '#facc15' : '#4ade80'}">${reusedCount}</div><div class="stat-label">مكررة</div></div>
      <div class="stat-card"><div class="stat-value" style="color:${hasTotp > 0 ? '#4ade80' : '#f87171'}">${hasTotp}</div><div class="stat-label">مع TOTP</div></div>
      <div class="stat-card"><div class="stat-value" style="color:${breached.length > 0 ? '#f87171' : '#4ade80'}">${breached.length}</div><div class="stat-label">مخترقة محتمل</div></div>
      <div class="stat-card"><div class="stat-value" style="color:${expired.length > 0 ? '#f87171' : '#4ade80'}">${expired.length}</div><div class="stat-label">منتهية</div></div>
    </div>`;

  /* 2FA adoption */
  html += `<div class="section-card">
    <div class="progress-row"><span>اعتماد المصادقة الثنائية (TOTP)</span><span style="color:#818cf8">${pctTotp}%</span></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${pctTotp}%"></div></div>
  </div>`;

  /* Health history chart */
  if (hist.length > 1) {
    html += `<div class="section-card">
      <div class="section-title">📈 تطور النتيجة</div>
      <div class="history-chart">`;
    html += hist.slice(-20).map(h => {
      const p = Math.max(h.score, 3);
      const c = h.score >= 80 ? '#4ade80' : h.score >= 50 ? '#eab308' : '#f87171';
      return `<div class="history-bar" style="height:${p}%;background:${c}" title="${h.score}%"></div>`;
    }).join('');
    html += `</div></div>`;
  }

  /* Weak entries */
  if (weakEntries.length > 0) {
    html += `<div class="section-card" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25)">
      <div class="section-title" style="color:#f87171">⚠️ كلمات مرور ضعيفة (${weakEntries.length})</div>
      <div class="section-list">`;
    weakEntries.forEach(e => {
      const h = GEN.health(e.password || '');
      html += `<div><span style="color:#f87171">•</span> <strong>${escapeHtml(e.title)}</strong>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">`;
      h.iss.forEach(i => { html += `<span class="chip chip-red chip-tiny">${i}</span>`; });
      html += `</div></div>`;
    });
    html += `</div></div>`;
  }

  /* Reused */
  if (reused.length > 0) {
    html += `<div class="section-card" style="background:rgba(234,179,8,0.08);border-color:rgba(234,179,8,0.25)">
      <div class="section-title" style="color:#facc15">🔄 كلمات مرور مكررة (${reused.length})</div>
      <div class="section-list">`;
    reused.forEach(a => { html += `<div>• ${a.join(', ')}</div>`; });
    html += `</div></div>`;
  }

  /* Recommendations */
  const recs = [];
  if (wk > 0) recs.push(`🔴 ${wk} كلمة مرور ضعيفة — غيّرها بكلمات أقوى (12+ حرفاً)`);
  if (reused.length > 0) recs.push(`🟡 ${reused.length} كلمة مكررة — استخدم كلمة فريدة لكل حساب`);
  if (breached.length > 0) recs.push(`🔴 ${breached.length} كلمة تحتوي على أنماط شائعة — تجنب الكلمات الشائعة`);
  if (pctTotp < 50 && STATE.data.length > 3) recs.push(`🔵 ${pctTotp}% فقط تفعيل TOTP — فعّل المصادقة الثنائية للحسابات المهمة`);
  const noPwd = STATE.data.filter(e => !e.password).length;
  if (noPwd > 0) recs.push(`⚪ ${noPwd} إدخال بدون كلمة مرور (ملاحظات)`);
  if (!recs.length) recs.push('✅ لا توجد توصيات — خزنتك آمنة!');

  html += `<div class="section-card">
    <div class="section-title">💡 التوصيات</div>
    <ul class="section-list">${recs.map(r => `<li>${r}</li>`).join('')}</ul>
  </div>`;

  html += `<div class="text-center" style="margin-top:8px"><button id="dashRefresh" class="btn-ghost" style="font-size:12px">🔄 تحديث</button></div>`;

  r.innerHTML = html;

  const refresh = document.getElementById('dashRefresh');
  if (refresh) refresh.addEventListener('click', renderDash);
}

/* ========== SETTINGS ========== */
function updateSettingsUI() {
  const s = ST.loadSettings();
  const autoLock = $('#setAutoLock');
  if (autoLock) autoLock.value = s.autoLock || '5';

  const pinEnable = $('#setPinEnable');
  if (pinEnable) pinEnable.checked = !!(s.pinEnabled && s.pinHash);

  const pinSection = $('#pinSection');
  if (pinSection) pinSection.classList.toggle('hidden', !pinEnable?.checked);

  const theme = $('#setTheme');
  if (theme) theme.value = s.theme || 'dark';
}

$('#setAutoLock')?.addEventListener('change', function () {
  const s = ST.loadSettings();
  s.autoLock = this.value;
  ST.saveSettings(s);
  restartInactivity();
});

$('#setPinEnable')?.addEventListener('change', function () {
  const s = ST.loadSettings();
  const pinSection = $('#pinSection');
  if (this.checked) {
    if (pinSection) pinSection.classList.remove('hidden');
    const pinInput = $('#setPinInput');
    if (pinInput) pinInput.focus();
  } else {
    if (pinSection) pinSection.classList.add('hidden');
    s.pinEnabled = false;
    delete s.pinHash;
    delete s.pinEncryptedMp;
    delete s.pinSalt;
    STATE.pinEnabled = false;
    STATE.pinHash = null;
    STATE.pinEncryptedMp = null;
    STATE.pinSalt = null;
    ST.saveSettings(s);
  }
});

$('#setPinInput')?.addEventListener('input', async function () {
  let v = this.value.replace(/\D/g, '');
  this.value = v;
  if (v.length < 4 || v.length > 8) return;

  const s = ST.loadSettings();
  const salt = CR.rnd(16);

  /* Store PIN hash for verification */
  s.pinHash = await CR.sha256(v);
  s.pinEnabled = true;
  s.pinSalt = CR.saltToStr(salt);

  /* Encrypt master password with PIN-derived key */
  if (STATE.mp) {
    try {
      const pinKey = await CR.deriveFast(v, salt);
      s.pinEncryptedMp = await CR.enc(STATE.mp, pinKey);
    } catch {
      /* MP not available yet, just store PIN */
      delete s.pinEncryptedMp;
      delete s.pinSalt;
    }
  }

  ST.saveSettings(s);
  STATE.pinEnabled = true;
  STATE.pinHash = s.pinHash;
  STATE.pinEncryptedMp = s.pinEncryptedMp;
  STATE.pinSalt = s.pinSalt;
  toast('تم تعيين PIN');
});

$('#setTheme')?.addEventListener('change', function () {
  const s = ST.loadSettings();
  s.theme = this.value;
  ST.saveSettings(s);
  applyTheme(this.value);
});

/* ========== THEME INIT ========== */
const settings = ST.loadSettings();
applyTheme(settings.theme || 'dark');

$('#themeToggle')?.addEventListener('click', () => {
  const cur = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  const s = ST.loadSettings();
  s.theme = next;
  ST.saveSettings(s);
});

/* ========== INACTIVITY TIMER ========== */
function restartInactivity() {
  clearTimeout(_inactivityTimer);
  const s = ST.loadSettings();
  const m = parseInt(s.autoLock || '5') * 60000;
  if (m > 0) {
    _inactivityTimer = setTimeout(() => {
      if (STATE.key) { lock(); toast('تم القفل لعدم النشاط', 'info'); }
    }, m);
  }
}

document.addEventListener('click', restartInactivity);
document.addEventListener('keydown', restartInactivity);
document.addEventListener('mousemove', restartInactivity);
window.addEventListener('beforeunload', () => { if (STATE.key) lock(); });

/* ========== PIN QUICK UNLOCK ========== */
async function checkPinUnlock() {
  const s = ST.loadSettings();
  if (s.pinEnabled && s.pinHash && ST.load()) {
    STATE.pinEnabled = true;
    STATE.pinHash = s.pinHash;
    STATE.pinEncryptedMp = s.pinEncryptedMp || null;
    STATE.pinSalt = s.pinSalt || null;

    /* If we have an encrypted master password, try PIN decrypt */
    if (STATE.pinEncryptedMp && STATE.pinSalt) {
      /* Show PIN modal - PIN will decrypt MP */
    } else {
      /* No stored MP encryption, PIN just shows MP prompt */
    }

    const pinModal = $('#pinModal');
    if (pinModal) {
      pinModal.classList.add('active');
      pinModal.style.display = 'flex';
      const pinInput = $('#pinInput');
      if (pinInput) pinInput.focus();
    }
  }
}

$('#pinConfirm')?.addEventListener('click', async () => {
  const pin = $('#pinInput')?.value?.replace(/\D/g, '');
  const pinInput = $('#pinInput');
  if (!pin || pin.length < 4) {
    toast('PIN يجب أن يكون 4-8 أرقام', 'error');
    return;
  }

  const h = await CR.sha256(pin);
  if (h === STATE.pinHash) {
    /* PIN is correct */
    /* Try to decrypt stored master password */
    if (STATE.pinEncryptedMp && STATE.pinSalt) {
      try {
        const salt = CR.strToSalt(STATE.pinSalt);
        const pinKey = await CR.deriveFast(pin, salt);
        const mp = await CR.dec(STATE.pinEncryptedMp, pinKey);

        /* Unlock with decrypted master password */
        const ok = await unlock(mp);
        if (ok) {
          const pinModal = $('#pinModal');
          if (pinModal) { pinModal.classList.remove('active'); pinModal.style.display = 'none'; }
          if (pinInput) pinInput.value = '';
          toast('تم الفتح السريع');
          updateVault();
          updateDash();
          updateSettingsUI();
          return;
        }
      } catch {
        /* Decryption failed, fall through to MP prompt */
      }
    }

    /* PIN verified but can't decrypt MP, prompt for master password */
    const pinModal = $('#pinModal');
    if (pinModal) { pinModal.classList.remove('active'); pinModal.style.display = 'none'; }
    if (pinInput) pinInput.value = '';
    toast('PIN صحيح — أدخل كلمة المرور الرئيسية', 'info');
    const mpInput = $('#mp');
    if (mpInput) mpInput.focus();
  } else {
    toast('PIN خاطئ', 'error');
  }
});

/* Update PIN-encrypted master password if PIN is set but MP not yet encrypted */
async function syncPinEncryption() {
  if (!STATE.mp) return;
  const s = ST.loadSettings();
  if (s.pinEnabled && s.pinSalt && !s.pinEncryptedMp) {
    /* We need the actual PIN to encrypt MP - not possible here */
    /* PIN was set before unlock, user needs to re-enter PIN */
    toast('أعد إدخال PIN في الإعدادات لتشفير كلمة المرور', 'warning');
  }
}

$('#pinCancel')?.addEventListener('click', () => {
  const m = $('#pinModal');
  if (m) { m.classList.remove('active'); m.style.display = 'none'; }
  const i = $('#pinInput');
  if (i) i.value = '';
});

$('#pinInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#pinConfirm')?.click();
});

/* ========== KEYBOARD SHORTCUTS ========== */
document.addEventListener('keydown', e => {
  if (!e.ctrlKey && !e.metaKey) return;
  switch (e.key) {
    case '1': e.preventDefault(); switchTab('generator'); break;
    case '2': e.preventDefault(); switchTab('vault'); break;
    case '3': e.preventDefault(); switchTab('dashboard'); break;
    case '4': e.preventDefault(); switchTab('settings'); break;
    case 'n':
    case 'N':
      if (STATE.tab === 'vault' && STATE.key) { e.preventDefault(); openEntryModal(null); }
      break;
  }
});

/* ========== PWA ========== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ========== INIT ========== */
updateVault();
updateDash();
updateSettingsUI();
restartInactivity();
checkPinUnlock();



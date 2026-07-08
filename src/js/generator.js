/* ===============================================
   PassGuard v6.0 - Password Generator
   =============================================== */

const GEN = {
  sets: {
    u: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    l: 'abcdefghijklmnopqrstuvwxyz',
    n: '0123456789',
    s: '!@#$%^&*()_+-=[]{}|;:,.<>?/~'
  },

  genPwd(length, opts) {
    let cs = '';
    const req = [];

    if (opts.u) {
      let s = this.sets.u;
      if (opts.av) s = s.replace(/[IO]/g, '');
      cs += s;
      req.push(s);
    }
    if (opts.l) {
      let s = this.sets.l;
      if (opts.av) s = s.replace(/[l]/g, '');
      cs += s;
      req.push(s);
    }
    if (opts.n) {
      let s = this.sets.n;
      if (opts.av) s = s.replace(/[01]/g, '');
      cs += s;
      req.push(s);
    }
    if (opts.s) {
      cs += this.sets.s;
      req.push(this.sets.s);
    }
    if (!cs) return { pw: '', ent: 0 };

    const r = [];
    for (const s of req) {
      r.push(s[CR.rnd(4)[0] % s.length]);
    }
    for (let i = 0; i < Math.max(0, length - r.length); i++) {
      r.push(cs[CR.rnd(4)[0] % cs.length]);
    }
    for (let i = r.length - 1; i > 0; i--) {
      const j = CR.rnd(4)[0] % (i + 1);
      [r[i], r[j]] = [r[j], r[i]];
    }
    return {
      pw: r.join(''),
      ent: Math.floor(length * Math.log2(cs.length))
    };
  },

  genPhrase(n, sep, cap, addNum) {
    const r = [];
    for (let i = 0; i < n; i++) {
      let w = WORDS[CR.rnd(4)[0] % WORDS.length];
      if (cap) w = w.charAt(0).toUpperCase() + w.slice(1);
      r.push(w);
    }
    if (addNum) r.push(String(CR.rnd(4)[0] % 1000));
    return {
      pw: r.join(sep),
      ent: Math.floor(n * Math.log2(WORDS.length))
    };
  },

  genPin(length) {
    let r = '';
    for (let i = 0; i < length; i++) {
      r += CR.rnd(4)[0] % 10;
    }
    return { pw: r, ent: Math.floor(length * Math.log2(10)) };
  },

  str(pw) {
    if (!pw) return { sc: 0, lb: '-', hx: '#64748b' };
    let s = 0;
    if (pw.length >= 8) s += 2;
    if (pw.length >= 12) s += 2;
    if (pw.length >= 16) s += 2;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 2;
    if (/\d/.test(pw)) s += 1;
    if (/[^A-Za-z0-9]/.test(pw)) s += 2;
    if (pw.length >= 20) s += 1;
    if (s <= 2) return { sc: 20, lb: 'ضعيفة جداً', hx: '#ef4444' };
    if (s <= 4) return { sc: 40, lb: 'ضعيفة', hx: '#f97316' };
    if (s <= 6) return { sc: 60, lb: 'متوسطة', hx: '#eab308' };
    if (s <= 8) return { sc: 80, lb: 'قوية', hx: '#3b82f6' };
    return { sc: 100, lb: 'قوية جداً', hx: '#22c55e' };
  },

  health(pw) {
    if (!pw) return { sc: 0, iss: ['فارغة'] };
    const iss = [];
    if (pw.length < 8) iss.push('قصيرة (<8)');
    else if (pw.length < 12) iss.push('يمكن أن تكون أطول');
    if (!/[A-Z]/.test(pw)) iss.push('لا تحتوي على كبيرة');
    if (!/[a-z]/.test(pw)) iss.push('لا تحتوي على صغيرة');
    if (!/\d/.test(pw)) iss.push('لا تحتوي على أرقام');
    if (!/[^A-Za-z0-9]/.test(pw)) iss.push('لا تحتوي على رموز');
    const common = ['password','123456','qwerty','admin','letmein','welcome',
      'passw0rd','abc123','iloveyou','monkey','dragon','master'];
    if (common.some(c => pw.toLowerCase().includes(c))) {
      iss.push('تحتوي على نمط شائع');
    }
    return { sc: Math.max(0, 100 - iss.length * 15), iss };
  }
};

/* Generator UI */
function initGeneratorUI() {
  ['genModePwd', 'genModePhrase', 'genModePin'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      _genMode = id.replace('genMode', '').toLowerCase();
      setGenModeUI();
    });
  });

  $('#pwdLen')?.addEventListener('input', function () {
    $('#pwdLenVal').textContent = this.value;
  });
  $('#phraseWords')?.addEventListener('input', function () {
    $('#phraseWordsVal').textContent = this.value;
  });
  $('#pinLen')?.addEventListener('input', function () {
    $('#pinLenVal').textContent = this.value;
  });

  $('#btnGen')?.addEventListener('click', generatePassword);
  $('#btnCopy')?.addEventListener('click', () => {
    if (STATE.genPwd) copyClip(STATE.genPwd);
  });

  setGenModeUI();
}

function setGenModeUI() {
  $$('.mode-btn').forEach(b => {
    const active = b.id === 'genMode' + _genMode.charAt(0).toUpperCase() + _genMode.slice(1);
    b.classList.toggle('active', active);
  });
  $('#genPwdPanel')?.classList.toggle('hidden', _genMode !== 'pwd');
  $('#genPhrasePanel')?.classList.toggle('hidden', _genMode !== 'phrase');
  $('#genPinPanel')?.classList.toggle('hidden', _genMode !== 'pin');
}

function generatePassword() {
  let result = { pw: '', ent: 0 };

  if (_genMode === 'pwd') {
    const len = parseInt($('#pwdLen')?.value || '24');
    const opts = {
      u: $('#pu')?.checked || false,
      l: $('#pl')?.checked || false,
      n: $('#pn')?.checked || false,
      s: $('#ps')?.checked || false,
      av: $('#pavoid')?.checked || false
    };
    if (!opts.u && !opts.l && !opts.n && !opts.s) {
      toast('اختر نوع حرف واحد', 'error');
      return;
    }
    result = GEN.genPwd(len, opts);
  } else if (_genMode === 'phrase') {
    const n = parseInt($('#phraseWords')?.value || '4');
    const sep = $('#phraseSep')?.value || '-';
    const cap = $('#phraseCap')?.checked || false;
    const num = $('#phraseNum')?.checked || false;
    result = GEN.genPhrase(n, sep, cap, num);
  } else {
    const len = parseInt($('#pinLen')?.value || '6');
    result = GEN.genPin(len);
  }

  STATE.genPwd = result.pw;

  if (_genMode === 'pwd') {
    $('#genDisplay').textContent = result.pw || 'خطأ';
    updateStrength(result.pw);
  } else if (_genMode === 'phrase') {
    $('#phraseDisplay').textContent = result.pw || 'خطأ';
    const s = GEN.str(result.pw);
    const bar = $('#phraseStrBar');
    if (bar) { bar.style.width = s.sc + '%'; bar.style.background = s.hx; }
    const txt = $('#phraseStrText');
    if (txt) { txt.textContent = s.lb; txt.style.color = s.hx; }
  } else {
    $('#pinDisplay').textContent = result.pw || 'خطأ';
  }

  $('#btnCopy').disabled = false;
}

function updateStrength(pw) {
  const s = GEN.str(pw);
  const bar = $('#strBar');
  if (bar) { bar.style.width = s.sc + '%'; bar.style.background = s.hx; }
  const txt = $('#strText');
  if (txt) { txt.textContent = s.lb; txt.style.color = s.hx; }
  const ev = $('#entropyVal');
  if (ev) {
    const approxEntropy = pw ? Math.floor(pw.length * Math.log2(72)) : 0;
    ev.textContent = approxEntropy;
  }
}

async function copyClip(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('📋 تم النسخ');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('📋 تم النسخ');
    } catch {
      toast('فشل النسخ', 'error');
    }
    document.body.removeChild(ta);
  }
}

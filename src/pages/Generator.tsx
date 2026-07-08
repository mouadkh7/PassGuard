import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { useToast } from '../components/Toast';
import { genPassword, genPhrase, genPin, strengthLabel } from '../lib/generator';
import { copyToClipboard } from '../lib/helpers';

export function GeneratorPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [mode, setMode] = useState<'pwd' | 'phrase' | 'pin'>('pwd');
  const [result, setResult] = useState<{ pw: string; ent: number }>({ pw: '', ent: 0 });

  /* Password options */
  const [pwdLen, setPwdLen] = useState(24);
  const [opts, setOpts] = useState({ u: true, l: true, n: true, s: true, av: false });

  /* Phrase options */
  const [phraseWords, setPhraseWords] = useState(4);
  const [phraseSep, setPhraseSep] = useState('-');
  const [phraseCap, setPhraseCap] = useState(true);
  const [phraseNum, setPhraseNum] = useState(true);

  /* PIN options */
  const [pinLen, setPinLen] = useState(6);

  const generate = () => {
    let res: { pw: string; ent: number };
    if (mode === 'pwd') {
      if (!opts.u && !opts.l && !opts.n && !opts.s) {
        toast(t('errors.select_charset'), 'error');
        return;
      }
      res = genPassword(pwdLen, opts);
    } else if (mode === 'phrase') {
      res = genPhrase(phraseWords, phraseSep, phraseCap, phraseNum, 'en');
    } else {
      res = genPin(pinLen);
    }
    setResult(res);
  };

  const str = strengthLabel(result.pw);

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-1">{t('generator.title')}</h2>
      <p className="text-sm text-dark-400 mb-5">{t('generator.subtitle')}</p>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <ModeBtn active={mode === 'pwd'} onClick={() => setMode('pwd')}>🔑 {t('generator.pwd_tab')}</ModeBtn>
        <ModeBtn active={mode === 'phrase'} onClick={() => setMode('phrase')}>🔤 {t('generator.phrase_tab')}</ModeBtn>
        <ModeBtn active={mode === 'pin'} onClick={() => setMode('pin')}>🔢 {t('generator.pin_tab')}</ModeBtn>
      </div>

      {/* Output */}
      <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 mb-4">
        <div
          className="text-center font-mono text-lg py-4 break-all min-h-[52px] flex items-center justify-center select-all text-primary-300"
          style={{ direction: 'ltr' }}
        >
          {result.pw || t('generator.click_generate')}
        </div>
        {result.pw && (
          <div className="flex items-center justify-between text-xs text-dark-400 mt-2">
            <div className="flex items-center gap-2">
              <span>{t('generator.strength_label')}:</span>
              <div className="w-20 h-2 rounded-full bg-dark-700 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${str.sc}%`, background: str.hx }} />
              </div>
              <span style={{ color: str.hx }} className="font-medium">{str.lb}</span>
            </div>
            <div>
              {t('generator.entropy_label')}: <span className="text-primary-400 font-mono">{result.ent}</span> bits
            </div>
          </div>
        )}
      </div>

      {/* Password mode options */}
      {mode === 'pwd' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-dark-400 font-medium block mb-1">{t('generator.length_label')}: {pwdLen}</label>
            <input type="range" min={4} max={100} value={pwdLen} onChange={e => setPwdLen(Number(e.target.value))} className="w-full accent-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-2 self-end">
            <CheckPill checked={opts.u} onChange={c => setOpts(p => ({ ...p, u: c }))}>{t('generator.uppercase')}</CheckPill>
            <CheckPill checked={opts.l} onChange={c => setOpts(p => ({ ...p, l: c }))}>{t('generator.lowercase')}</CheckPill>
            <CheckPill checked={opts.n} onChange={c => setOpts(p => ({ ...p, n: c }))}>{t('generator.digits')}</CheckPill>
            <CheckPill checked={opts.s} onChange={c => setOpts(p => ({ ...p, s: c }))}>{t('generator.symbols')}</CheckPill>
          </div>
          <label className="col-span-1 sm:col-span-2 flex items-center gap-2 p-2.5 rounded-lg bg-dark-800/50 border border-dark-700 cursor-pointer text-xs">
            <input type="checkbox" checked={opts.av} onChange={e => setOpts(p => ({ ...p, av: e.target.checked }))} className="w-4 h-4 accent-primary-500" />
            {t('generator.avoid_similar')}
          </label>
        </div>
      )}

      {/* Phrase mode options */}
      {mode === 'phrase' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-dark-400 font-medium block mb-1">{t('generator.words_label')}: {phraseWords}</label>
            <input type="range" min={2} max={12} value={phraseWords} onChange={e => setPhraseWords(Number(e.target.value))} className="w-full accent-primary-500" />
          </div>
          <div>
            <label className="text-xs text-dark-400 font-medium block mb-1">{t('generator.separator_label')}</label>
            <select value={phraseSep} onChange={e => setPhraseSep(e.target.value)} className="input-field text-xs">
              <option value="-">-</option>
              <option value=" ">{'space'}</option>
              <option value="_">_</option>
              <option value=".">.</option>
              <option value=",">,</option>
            </select>
          </div>
          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-dark-800/50 border border-dark-700 cursor-pointer text-xs self-end">
            <input type="checkbox" checked={phraseCap} onChange={e => setPhraseCap(e.target.checked)} className="w-4 h-4 accent-primary-500" />
            {t('generator.capitalize_label')}
          </label>
          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-dark-800/50 border border-dark-700 cursor-pointer text-xs self-end">
            <input type="checkbox" checked={phraseNum} onChange={e => setPhraseNum(e.target.checked)} className="w-4 h-4 accent-primary-500" />
            {t('generator.add_number')}
          </label>
        </div>
      )}

      {/* PIN mode options */}
      {mode === 'pin' && (
        <div className="mb-4 max-w-xs">
          <label className="text-xs text-dark-400 font-medium block mb-1">{t('generator.length_label')}: {pinLen}</label>
          <input type="range" min={4} max={12} value={pinLen} onChange={e => setPinLen(Number(e.target.value))} className="w-full accent-primary-500" />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={generate} className="btn-primary flex-1">🎲 {t('generator.generate_btn')}</button>
        <button
          onClick={() => copyToClipboard(result.pw, toast)}
          className="btn-secondary px-5"
          disabled={!result.pw}
        >
          📋 {t('generator.copy_btn')}
        </button>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
      }`}
    >
      {children}
    </button>
  );
}

function CheckPill({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 p-2 rounded-lg bg-dark-800/50 border border-dark-700 cursor-pointer text-xs hover:border-primary-500/50 transition-colors">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-3.5 h-3.5 accent-primary-500" />
      {children}
    </label>
  );
}

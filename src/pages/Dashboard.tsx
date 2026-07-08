import React, { useMemo } from 'react';
import { useVault } from '../hooks/useVault';
import { useUI } from '../hooks/useUI';
import { useTranslation } from '../i18n';
import { useToast } from '../components/Toast';
import { healthAnalysis } from '../lib/generator';
import { ST } from '../lib/storage';

export function DashboardPage() {
  const vault = useVault();
  const { setActiveTab } = useUI();
  const { t } = useTranslation();

  if (vault.isLocked) {
    return (
      <div className="card">
        <div className="max-w-sm mx-auto py-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-1">{t('dashboard.locked_title')}</h3>
          <p className="text-sm text-dark-400 mb-6">{t('dashboard.locked_desc')}</p>
          <button onClick={() => setActiveTab('vault')} className="btn-primary">
            🗄️ {t('dashboard.unlock_btn')}
          </button>
        </div>
      </div>
    );
  }

  if (!vault.entries.length) {
    return (
      <div className="card">
        <div className="text-center py-16">
          <div className="text-5xl mb-3 opacity-60">📊</div>
          <p className="text-dark-400">{t('dashboard.no_data')}</p>
        </div>
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const vault = useVault();
  const { t } = useTranslation();
  const { toast } = useToast();
  const hist = ST.loadHealthHistory();

  const analysis = useMemo(() => {
    let totalScore = 0;
    let weak = 0, medium = 0, strong = 0;
    const pwMap: Record<string, string[]> = {};

    vault.entries.forEach(e => {
      const h = healthAnalysis(e.password || '');
      totalScore += h.sc;
      if (h.sc < 50) weak++;
      else if (h.sc < 80) medium++;
      else strong++;
      const p = e.password || '';
      if (!pwMap[p]) pwMap[p] = [];
      pwMap[p].push(e.title);
    });

    const avg = Math.round(totalScore / vault.entries.length);
    const reused = Object.values(pwMap).filter(a => a.length > 1).length;
    const withTotp = vault.entries.filter(e => e.totp).length;

    let grade: string, gcolor: string, gradeLabel: string;
    if (avg >= 90) { grade = 'A+'; gcolor = '#4ade80'; gradeLabel = t('dashboard.grade_excellent'); }
    else if (avg >= 80) { grade = 'A'; gcolor = '#4ade80'; gradeLabel = t('dashboard.grade_excellent'); }
    else if (avg >= 70) { grade = 'B'; gcolor = '#60a5fa'; gradeLabel = t('dashboard.grade_good'); }
    else if (avg >= 55) { grade = 'C'; gcolor = '#eab308'; gradeLabel = t('dashboard.grade_fair'); }
    else { grade = 'D'; gcolor = '#f87171'; gradeLabel = t('dashboard.grade_weak'); }

    return { avg, weak, medium, strong, reused, withTotp, grade, gcolor, gradeLabel, pwMap };
  }, [vault.entries, t]);

  const breached = vault.entries.filter(e => healthAnalysis(e.password || '').iss.includes('common_pattern'));
  const expired = vault.entries.filter(e => e.expiry && new Date(e.expiry) < new Date());

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-1">{t('dashboard.title')}</h2>
      <p className="text-sm text-dark-400 mb-5">{t('dashboard.subtitle')}</p>

      <div className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox value={analysis.grade} label={t('dashboard.grade_label')} color={analysis.gcolor} />
          <StatBox value={vault.entries.length} label={t('dashboard.total_label')} color="#818cf8" />
          <StatBox value={analysis.strong} label={t('dashboard.strong_label')} color="#4ade80" />
          <StatBox value={analysis.weak} label={t('dashboard.weak_label')} color={analysis.weak > 0 ? '#f87171' : '#4ade80'} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox value={analysis.reused} label={t('dashboard.reused_label')} color={analysis.reused > 0 ? '#facc15' : '#4ade80'} />
          <StatBox value={analysis.withTotp} label={t('dashboard.totp_label')} color={analysis.withTotp > 0 ? '#4ade80' : '#f87171'} />
          <StatBox value={breached.length} label={t('dashboard.breached_label')} color={breached.length > 0 ? '#f87171' : '#4ade80'} />
          <StatBox value={expired.length} label={t('dashboard.expired_label')} color={expired.length > 0 ? '#f87171' : '#4ade80'} />
        </div>

        {/* 2FA Adoption */}
        <SectionCard>
          <div className="flex justify-between text-sm mb-1">
            <span>{t('dashboard.tfa_adoption')}</span>
            <span className="text-primary-400">{analysis.withTotp > 0 ? Math.round(analysis.withTotp / vault.entries.length * 100) : 0}%</span>
          </div>
          <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all" style={{ width: `${vault.entries.length ? (analysis.withTotp / vault.entries.length * 100) : 0}%` }} />
          </div>
        </SectionCard>

        {/* Health history */}
        {hist.length > 1 && (
          <SectionCard>
            <SectionTitle>{t('dashboard.health_chart')}</SectionTitle>
            <div className="flex items-end gap-1 h-16" style={{ direction: 'ltr' }}>
              {hist.slice(-20).map((h, i) => {
                const p = Math.max(h.score, 3);
                const c = h.score >= 80 ? '#4ade80' : h.score >= 50 ? '#eab308' : '#f87171';
                return <div key={i} className="flex-1 min-w-[3px] rounded-t" style={{ height: `${p}%`, background: c }} title={`${h.score}%`} />;
              })}
            </div>
          </SectionCard>
        )}

        {/* Weak entries */}
        {vault.entries.filter(e => healthAnalysis(e.password || '').sc < 50).length > 0 && (
          <SectionCard className="bg-red-500/5 border-red-500/20">
            <SectionTitle className="text-red-400">⚠️ {t('dashboard.weak_title')} ({vault.entries.filter(e => healthAnalysis(e.password || '').sc < 50).length})</SectionTitle>
            <div className="space-y-1">
              {vault.entries.filter(e => healthAnalysis(e.password || '').sc < 50).map(e => (
                <div key={e.id} className="text-xs text-dark-400">
                  <span className="text-red-400">•</span> <strong className="text-dark-200">{e.title}</strong>
                  <div className="flex gap-1 mt-0.5">
                    {healthAnalysis(e.password || '').iss.map((issue, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">{issue}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Reused */}
        {Object.entries(analysis.pwMap).filter(([p, a]) => a.length > 1).length > 0 && (
          <SectionCard className="bg-amber-500/5 border-amber-500/20">
            <SectionTitle className="text-amber-400">🔄 {t('dashboard.reused_title')} ({Object.entries(analysis.pwMap).filter(([p, a]) => a.length > 1).length})</SectionTitle>
            <div className="space-y-1 text-xs text-dark-400">
              {Object.entries(analysis.pwMap).filter(([p, a]) => a.length > 1).map(([pw, names], i) => (
                <div key={i}>• {names.join(', ')}</div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Recommendations */}
        <SectionCard>
          <SectionTitle>💡 {t('dashboard.recommendations')}</SectionTitle>
          <div className="space-y-1 text-xs">
            <RecItem condition={analysis.weak > 0} text={`🔴 ${analysis.weak} weak ${t('dashboard.weak_label').toLowerCase()} — use stronger passwords (12+ chars)`} />
            <RecItem condition={analysis.reused > 0} text={`🟡 ${analysis.reused} reused — use unique passwords for each account`} />
            <RecItem condition={breached.length > 0} text={`🔴 ${breached.length} contain common patterns — avoid commonly used passwords`} />
            <RecItem condition={analysis.withTotp < vault.entries.length * 0.5 && vault.entries.length > 3} text={`🔵 Only ${Math.round(analysis.withTotp / vault.entries.length * 100)}% have TOTP — enable 2FA for important accounts`} />
            <RecItem condition={vault.entries.filter(e => !e.password).length > 0} text={`⚪ ${vault.entries.filter(e => !e.password).length} entries without password (notes)`} />
            {analysis.weak === 0 && analysis.reused === 0 && breached.length === 0 && (
              <li className="text-emerald-400">✅ No recommendations — your vault is secure!</li>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */
function StatBox({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 text-center">
      <div className="text-2xl sm:text-3xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-dark-400 mt-1">{label}</div>
    </div>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-dark-800/50 border border-dark-700 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h4 className={`font-semibold text-sm mb-2 ${className}`}>{children}</h4>;
}

function RecItem({ condition, text }: { condition: boolean; text: string }) {
  if (!condition) return null;
  return <li>{text}</li>;
}

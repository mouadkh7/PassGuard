import React from 'react';

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function formatDate(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

export function formatDateAr(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'اليوم';
  if (d === 1) return 'أمس';
  if (d < 7) return `منذ ${d} أيام`;
  if (d < 30) return `منذ ${Math.floor(d / 7)} أسابيع`;
  if (d < 365) return `منذ ${Math.floor(d / 30)} شهر`;
  return `منذ ${Math.floor(d / 365)} سنة`;
}

export async function copyToClipboard(text: string, toast?: (msg: string, type?: string) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast?.('📋 Copied');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast?.('📋 Copied');
    } catch {
      toast?.('Copy failed', 'error');
    }
    document.body.removeChild(ta);
  }
}

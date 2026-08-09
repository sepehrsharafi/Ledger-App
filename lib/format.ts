import { MONTH_LABELS } from '@/constants/enums';

const SHORT_MONTHS = MONTH_LABELS.map((month) => month.slice(0, 3));

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return value.toLocaleString('en-US', { maximumFractionDigits });
}

export function formatCurrency(value: number, currency = '$'): string {
  const rounded = Math.abs(value) >= 1000 ? Math.round(value) : Number(value.toFixed(2));
  return `${currency}${rounded.toLocaleString('en-US', { maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2 })}`;
}

/** Compact currency for dense tiles: $53.2k, $1.2M. */
export function formatCompactCurrency(value: number, currency = '$'): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${currency}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${currency}${Math.round(value / 1000)}k`;
  return formatCurrency(value, currency);
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(2)}×`;
}

export function formatDelta(current: number, previous: number): { label: string; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { label: '—', direction: 'flat' };
  const change = (current - previous) / Math.abs(previous);
  if (Math.abs(change) < 0.0005) return { label: '0.0%', direction: 'flat' };
  return {
    label: `${Math.abs(change * 100).toFixed(1)}%`,
    direction: change > 0 ? 'up' : 'down',
  };
}

function parseDateOnly(value: string): Date | null {
  const iso = value.length > 10 ? value : `${value}T00:00:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14 Jun" — the dense date format used across lists. */
export function formatDayMonth(value: string): string {
  const date = parseDateOnly(value);
  if (!date) return value;
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

export function formatFullDate(value: string): string {
  const date = parseDateOnly(value);
  if (!date) return value;
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Relative stamp for feeds and due dates: 2m, 5h, 3d in the past, "in 3d" ahead, then a date.
 * Future-aware because inbox items stamp tasks with their due date, not a past event.
 */
export function formatRelative(value: string): string {
  const date = parseDateOnly(value);
  if (!date) return value;
  const diffMs = Date.now() - date.getTime();
  const ahead = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60000);
  const stamp = () => {
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return days < 14 ? `${days}d` : formatDayMonth(value);
  };
  const label = stamp();
  if (!ahead || label === 'now' || label === formatDayMonth(value)) return label;
  return `in ${label}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Local calendar day as YYYY-MM-DD — never use toISOString, it shifts behind UTC. */
export function todayKey(): string {
  return dateKey(new Date());
}

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatKpi(value: number, format: 'number' | 'currency' | 'multiple' | 'percent'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'multiple':
      return formatMultiple(value);
    case 'percent':
      return formatPercent(value);
    default:
      return formatNumber(value);
  }
}

export function formatGoalValue(value: number, unit: string): string {
  if (unit === '€' || unit === '$') return formatCompactCurrency(value, unit);
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'x') return formatMultiple(value);
  return `${formatNumber(value)} ${unit}`;
}

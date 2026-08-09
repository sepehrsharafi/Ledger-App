import { ApiError } from '@/lib/api/error';

let sequence = 0;

export function id(prefix: string): string {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${random}${sequence.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar day — UTC would shift dates behind by a day for negative offsets. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export const badRequest = (message: string) => new ApiError(400, message);
export const notFound = (message: string) => new ApiError(404, message);

export function requireString(value: unknown, field: string, max = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw badRequest(`${field} is required`);
  if (value.length > max) throw badRequest(`${field} is too long`);
  return value.trim();
}

export function optionalString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function requireDate(value: unknown, field: string): string {
  const raw = requireString(value, field, 40);
  const normalized = raw.length > 10 ? raw.slice(0, 10) : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    throw badRequest(`${field} must be a valid YYYY-MM-DD date`);
  }
  return normalized;
}

export function requireEmail(value: unknown, field: string): string {
  const raw = requireString(value, field, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) throw badRequest(`${field} must be a valid email`);
  return raw.toLowerCase();
}

export function requireHexColor(value: unknown, field: string): string {
  const raw = requireString(value, field, 9);
  if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(raw)) {
    throw badRequest(`${field} must be a hex colour such as #1F4BC5`);
  }
  return raw.toUpperCase();
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(isoMonth: string): string {
  const monthIndex = Number(isoMonth.slice(5, 7)) - 1;
  return SHORT_MONTHS[monthIndex] ?? isoMonth.slice(5, 7);
}

/** "6 Aug" — for human-readable dates baked into generated copy. */
export function dayMonth(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split('-');
  const monthIndex = Number(parts[1]) - 1;
  const day = parts[2];
  if (!day || Number.isNaN(monthIndex)) return isoDate;
  return `${Number(day)} ${SHORT_MONTHS[monthIndex] ?? parts[1]}`;
}

export function reportingPeriod(): { label: string; comparisonLabel: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const format = (date: Date) => `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return {
    label: `${start.getDate()} – ${format(end)}`,
    comparisonLabel: `compared with ${prevStart.getDate()}–${format(prevEnd)}`,
  };
}

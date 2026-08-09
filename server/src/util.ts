import { randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message: string) => new HttpError(404, message);

export function id(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar day — overdue checks compare against the user's day, not UTC's. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function requireString(value: unknown, field: string, max = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`${field} is required`);
  }
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

/** "6 Aug" — used for human-readable dates baked into API copy. */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-');
  const monthIndex = Number(month) - 1;
  if (!day || Number.isNaN(monthIndex)) return isoDate;
  return `${Number(day)} ${SHORT_MONTHS[monthIndex] ?? month}`;
}

export function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ============================================================
// Day-first date helpers (single source of truth for display)
//
// Display format everywhere: "26 Sep 2026" (day-first)
// Filenames / API payloads stay ISO: "2026-09-26"
// ============================================================

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

/** Pad a number to 2 digits. */
const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Build a *local* Date from a YYYY-MM-DD string.
 * (Avoids `new Date('YYYY-MM-DD')` which parses as UTC and can shift the day.)
 */
export function parseISO(value: string): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Local today as ISO date string (YYYY-MM-DD). Safe across timezones. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Coerce any supported value (Date, ISO string, day-first string) to a local Date.
 * Returns null when unparseable.
 */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const iso = parseISO(value);
  if (iso) return iso;
  return parseDayFirst(value, true);
}

/** Accepts ISO, Date, or "26 Sep 2026" / "26-09-2026" → "26 Sep 2026". */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "26 Sep 2026, 14:05" */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${formatDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Monday, 26 September 2026" — used by report headers. */
export function formatDateLong(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "26 Sep" — compact timeline format. */
export function formatDateShort(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return '—';
  return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`;
}

/**
 * Parse user-typed day-first input.
 * Supports: "26 Sep 2026", "26-sep-2026", "26/09/2026", "26-09-2026", "26.09.2026"
 * Returns ISO "YYYY-MM-DD" or null if unparseable.
 */
export function parseDayFirst(input: string): string | null;
export function parseDayFirst(input: string, asDate: true): Date | null;
export function parseDayFirst(input: string, asDate?: true): string | null | Date {
  const raw = (input || '').trim();
  if (!raw) return null;

  // Numeric: D, D/M, D-M, D.M, D M with Y
  const num = /^(\d{1,2})[\s/\-.](\d{1,2})(?:[\s/\-.](\d{2,4}))?$/.exec(raw);
  if (num) {
    const day = Number(num[1]);
    const month = Number(num[2]);
    let year = num[3] ? Number(num[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const d = new Date(year, month - 1, day);
    if (d.getDate() !== day || d.getMonth() !== month - 1) return null; // e.g. 31 Feb
    return asDate ? d : `${year}-${pad(month)}-${pad(day)}`;
  }

  // Day + month name: "26 Sep 2026" / "26 september"
  const named = /^(\d{1,2})[\s/\-.]+([a-zA-Z]+)(?:[\s/\-.]+(\d{2,4}))?$/.exec(raw);
  if (named) {
    const day = Number(named[1]);
    const monRaw = named[2].toLowerCase();
    let idx = MONTHS_SHORT.findIndex((m) => m.toLowerCase() === monRaw);
    if (idx < 0) idx = MONTHS_LONG.findIndex((m) => m.toLowerCase().startsWith(monRaw.slice(0, 3)));
    if (idx >= 0 && day >= 1 && day <= 31) {
      let year = named[3] ? Number(named[3]) : new Date().getFullYear();
      if (year < 100) year += 2000;
      const d = new Date(year, idx, day);
      if (d.getMonth() !== idx) return null;
      return asDate ? d : `${year}-${pad(idx + 1)}-${pad(day)}`;
    }
  }

  // Fall back: native parse (last resort)
  const d = new Date(raw);
  if (!isNaN(d.getTime()) && asDate) return d;
  return null;
}

/** Format a Date as the value for <input type="date"> (ISO, stays ISO). */
export function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

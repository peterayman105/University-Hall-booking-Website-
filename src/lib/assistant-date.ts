import { normalizeArabicDigits } from "@/lib/assistant-locale";

/** Format local date as YYYY-MM-DD */
export function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAME_TO_NUM: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function ymdFromParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** e.g. 22nd of April 2026, 22 April 2026, April 22nd, 2026 */
function parseWrittenDate(text: string): string | null {
  // 22nd of April 2026 / 22 April 2026 / date 22nd of April 2026
  let m = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+of\s+([a-z]+)\s*,?\s*(\d{4})\b/i
  );
  if (m) {
    const day = Number(m[1]);
    const month = MONTH_NAME_TO_NUM[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (month && Number.isFinite(year)) return ymdFromParts(year, month, day);
  }

  // 22 April 2026 / 22nd April 2026
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s*,?\s*(\d{4})\b/i);
  if (m) {
    const day = Number(m[1]);
    const month = MONTH_NAME_TO_NUM[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (month) return ymdFromParts(year, month, day);
  }

  // April 22nd, 2026 / April 22, 2026
  m = text.match(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})\b/i);
  if (m) {
    const month = MONTH_NAME_TO_NUM[m[1].toLowerCase()];
    const day = Number(m[2]);
    const year = Number(m[3]);
    if (month) return ymdFromParts(year, month, day);
  }

  return null;
}

/** MSA month names (no diacritics); longest keys matched first elsewhere */
const AR_MONTHS: { re: RegExp; month: number }[] = [
  { re: /سبتمبر/i, month: 9 },
  { re: /أكتوبر|اكتوبر/i, month: 10 },
  { re: /نوفمبر/i, month: 11 },
  { re: /ديسمبر/i, month: 12 },
  { re: /يناير/i, month: 1 },
  { re: /فبراير|شباط/i, month: 2 },
  { re: /مارس|آذار|اذار/i, month: 3 },
  { re: /أبريل|إبريل|ابريل|نيسان/i, month: 4 },
  { re: /مايو|أيار|ايار/i, month: 5 },
  { re: /يونيو|يونيه|حزيران/i, month: 6 },
  { re: /يوليو|يوليه|تموز/i, month: 7 },
  { re: /أغسطس|اغسطس|آب|اب/i, month: 8 },
];

function parseArabicWrittenDate(text: string): string | null {
  const norm = normalizeArabicDigits(text);
  for (const { re, month } of AR_MONTHS) {
    let m = norm.match(new RegExp(`(\\d{1,2})\\s*${re.source}\\s*,?\\s*(\\d{4})\\b`, "i"));
    if (m) {
      const ymd = ymdFromParts(Number(m[2]), month, Number(m[1]));
      if (ymd) return ymd;
    }
    m = norm.match(new RegExp(`${re.source}\\s+(\\d{1,2})\\s*,?\\s*(\\d{4})\\b`, "i"));
    if (m) {
      const ymd = ymdFromParts(Number(m[2]), month, Number(m[1]));
      if (ymd) return ymd;
    }
  }
  return null;
}

/**
 * Extract a calendar date from natural language (local timezone).
 * Prefer ISO YYYY-MM-DD; supports today/tomorrow; numeric slashes (DD/MM if first > 12);
 * written dates (22nd of April 2026, April 22, 2026); Arabic (غدا، ٢٢ أبريل ٢٠٢٦).
 */
export function parseAssistantDate(text: string): string | null {
  const lower = text.toLowerCase();
  const normalized = normalizeArabicDigits(text);

  if (/\btoday\b/.test(lower) || /اليوم|نهارده/i.test(text)) return formatLocalYMD(new Date());

  if (/\btomorrow\b/.test(lower) || /غدًا|غداً|غدا|بكره|بكرة/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalYMD(d);
  }

  if (/بعد\s*غد|بعد غد|بعد\s*يومين/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return formatLocalYMD(d);
  }

  const iso = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const slash = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})\b/);
  if (slash) {
    let y = slash[3];
    if (y.length === 2) y = `20${y}`;
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    let month: number;
    let day: number;
    if (a > 12) {
      day = a;
      month = b;
    } else {
      month = a;
      day = b;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const written = parseWrittenDate(normalized);
  if (written) return written;

  const arWritten = parseArabicWrittenDate(text);
  if (arWritten) return arWritten;

  return null;
}

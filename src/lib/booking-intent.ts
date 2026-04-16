import { formatLocalYMD, parseAssistantDate } from "@/lib/assistant-date";
import { hasArabicScript, normalizeArabicDigits, type AssistantLang } from "@/lib/assistant-locale";
import { CLOSE_HOUR, OPEN_HOUR } from "@/lib/constants";

export type HallRef = { id: string; name: string };

export type ResolvedBookingIntent = {
  hallId: string;
  hallName: string;
  date: string;
  startHour: number;
  endHour: number;
};

/** Triggers rule-based or LLM booking extraction */
const BOOKING_INTENT_RE =
  /\b(book|reserve|schedule|booking|appointment|make\s+a\s+booking|i\s*(?:'d| would)\s+like\s+to\s+book|i\s+want\s+to\s+(?:book|make\s+a\s+booking)|can\s+i\s+book|need\s+(?:a|the)?\s*(?:hall|room)|grab|lock\s+in|put\s+me\s+down\s+for)\b/i;

const BOOKING_INTENT_RE_AR =
  /(احجز|أحجز|إحجز|حجز|أريد\s+حجز|اريد\s+حجز|أريد\s+أن\s+احجز|اريد\s+ان\s+احجز|عايز\s+احجز|عاوز\s+احجز|موعد|طلب\s+حجز|حجز\s+قاعة|أريد\s+قاعة|اريد\s+قاعة|اعمل\s+حجز|عمل\s+حجز)/i;

function applyAmPm(hour: number, ampm: string | undefined): number {
  if (!ampm) return hour;
  const compact = ampm.toLowerCase().replace(/[^apm]/g, "");
  if (compact === "am") return hour === 12 ? 0 : hour;
  if (compact === "pm") return hour === 12 ? 12 : hour + 12;
  return hour;
}

function parseHourMinuteToken(h: string, min: string | undefined): number | null {
  const hour = Number(h);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (min === undefined || min === "") return hour;
  const m = Number(min);
  if (m !== 0) return null;
  return hour;
}

/**
 * Parse a time range into 24h start/end (end exclusive), whole hours only.
 */
export function parseTimeRange24(text: string): { startHour: number; endHour: number } | null {
  const t = text.replace(/\b([ap])\.?\s*m\.?\b/gi, (_, letter) =>
    String(letter).toLowerCase() === "a" ? "am" : "pm"
  );

  // 10:00 AM to 12:00 PM / 10am to 12pm (whole hours only if :00)
  let m = t.match(
    /\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\s*(?:to|-|–|until|through)\s*(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i
  );
  if (m) {
    const sh = parseHourMinuteToken(m[1], m[2]);
    const eh = parseHourMinuteToken(m[4], m[5]);
    if (sh === null || eh === null) return null;
    const s = applyAmPm(sh, m[3]);
    const e = applyAmPm(eh, m[6]);
    if (Number.isInteger(s) && Number.isInteger(e) && e > s) return { startHour: s, endHour: e };
  }

  m = t.match(
    /\b(\d{1,2})\s*(?::00)?\s*(am|pm)\s*(?:to|-|–|until|through)\s*(\d{1,2})\s*(?::00)?\s*(am|pm)\b/i
  );
  if (m) {
    const s = applyAmPm(Number(m[1]), m[2]);
    const e = applyAmPm(Number(m[3]), m[4]);
    if (Number.isInteger(s) && Number.isInteger(e) && e > s) return { startHour: s, endHour: e };
  }

  // from 10 to 12 (optional am/pm on each side)
  m = t.match(
    /\bfrom\s+(\d{1,2})\s*(?::00)?\s*(am|pm)?\s*(?:to|-|–|until|through)\s*(\d{1,2})\s*(?::00)?\s*(am|pm)?\b/i
  );
  if (m) {
    let s = Number(m[1]);
    let e = Number(m[3]);
    const ap1 = m[2];
    const ap2 = m[4];
    if (ap1) s = applyAmPm(s, ap1);
    if (ap2) e = applyAmPm(e, ap2);
    if (!ap1 && !ap2) {
      if (s >= OPEN_HOUR && e <= CLOSE_HOUR && e > s) {
        return { startHour: s, endHour: e };
      }
      // Spoken "two to four" → often 14:00–16:00
      if (s >= 1 && s <= 11 && e >= 1 && e <= 11 && e > s && /\b(afternoon|evening|pm|p\.m\.)\b/i.test(t)) {
        return { startHour: s + 12, endHour: e + 12 };
      }
      if (s >= 1 && s <= 7 && e >= 2 && e <= 8 && e > s && !/\b(morning|am|a\.m\.)\b/i.test(t)) {
        return { startHour: s + 12, endHour: e + 12 };
      }
    } else if (e > s) {
      return { startHour: s, endHour: e };
    }
  }

  // between 9 and 11
  m = t.match(
    /\bbetween\s+(\d{1,2})\s*(?::00)?\s*(am|pm)?\s+and\s+(\d{1,2})\s*(?::00)?\s*(am|pm)?\b/i
  );
  if (m) {
    let s = Number(m[1]);
    let e = Number(m[3]);
    if (m[2]) s = applyAmPm(s, m[2]);
    if (m[4]) e = applyAmPm(e, m[4]);
    if (!m[2] && !m[4] && s >= OPEN_HOUR && e <= CLOSE_HOUR && e > s) {
      return { startHour: s, endHour: e };
    }
    if ((m[2] || m[4]) && e > s) return { startHour: s, endHour: e };
  }

  // Legacy: "hall … from 10 to 12" already covered by from…to

  return null;
}

/** Arabic time phrases: من 10 إلى 12 ، من الساعة 10 للساعة 12 ، 10:00 إلى 12:00 */
function parseTimeRangeArabic(text: string): { startHour: number; endHour: number } | null {
  const t = normalizeArabicDigits(text);
  const evening = /مساءً|مساءا|مساء|بليل|بعد\s*الظهر|عصر/i.test(text);
  const morning = /صباحًا|صباحاً|صباحا|صباح|الصبح/i.test(text);

  let m = t.match(
    /(?:من\s*(?:الساعة)?|الوقت\s*من)\s*(\d{1,2})(?::00)?\s*(?:إلى|الى|ل|و|-|–)\s*(\d{1,2})(?::00)?/i
  );
  if (!m) {
    m = t.match(
      /(\d{1,2})(?::00)?\s*(?:إلى|الى|ل|-|–)\s*(\d{1,2})(?::00)?\s*(صباحًا|صباحاً|صباحا|مساءً|مساءا|مساء)?/i
    );
  }
  if (!m) return null;

  let s = Number(m[1]);
  let e = Number(m[2]);
  const tail = (m[3] || "").toLowerCase();
  if (/مساء|مساءً|مساءا/i.test(tail) || (evening && !morning)) {
    if (s >= 1 && s <= 11) s += 12;
    if (e >= 1 && e <= 11) e += 12;
  } else if (/صباح/i.test(tail) || (morning && !evening)) {
    if (s === 12) s = 0;
    if (e === 12 && e > s) e = 12;
  } else if (!evening && !morning && s >= 1 && s <= 7 && e >= 2 && e <= 8 && e > s) {
    s += 12;
    e += 12;
  }

  if (s >= OPEN_HOUR && e <= CLOSE_HOUR && e > s) return { startHour: s, endHour: e };
  if (e > s && s >= 0 && e <= 24) {
    if (s >= OPEN_HOUR && e <= CLOSE_HOUR) return { startHour: s, endHour: e };
  }
  return null;
}

/** e.g. "on the whole auditorium E date 22nd" → "auditorium E" */
function hallCandidateFromOnDatePattern(text: string): string | null {
  const m = text.match(
    /\b(?:on|at|for|in)\s+(?:the\s+)?(?:whole\s+|entire\s+|full\s+)?(.+?)\s+date\b/i
  );
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, " ").replace(/[,.;:]+$/, "");
}

/** Arabic: قاعة X ، في قاعة X ، المسرح X */
function hallCandidateFromArabic(text: string): string | null {
  let m = text.match(/قاعة\s+["'«»]?([^"'«»\n،,]{2,55})["'«»]?/i);
  if (m) return m[1].trim().replace(/\s+/g, " ");
  m = text.match(/في\s+قاعة\s+([^\n،,]{2,55}?)(?:\s+يوم|\s+بتاريخ|\s+التاريخ|\s+من\s|\s+تاريخ|$)/i);
  if (m) return m[1].trim().replace(/\s+/g, " ");
  m = text.match(/(?:المسرح|القاعة)\s+["'«»]?([^"'«»\n،,]{2,55})["'«»]?/i);
  if (m) return m[1].trim().replace(/\s+/g, " ");
  return null;
}

export function resolveHallFromText(text: string, halls: HallRef[]): HallRef | null {
  const lower = text.toLowerCase();
  const norm = normalizeArabicDigits(text);

  const arCand = hallCandidateFromArabic(text);
  if (arCand) {
    const c = arCand.toLowerCase();
    const sorted = [...halls].sort((a, b) => b.name.length - a.name.length);
    const byPrefix = sorted.find((h) => {
      const n = h.name.toLowerCase();
      return n.startsWith(c) || c.startsWith(n) || n.includes(c) || c.includes(n);
    });
    if (byPrefix) return byPrefix;
  }

  const yom = text.match(/قاعة\s+(.+?)\s+يوم\s+/i);
  if (yom) {
    const c = yom[1].trim().toLowerCase();
    const sorted = [...halls].sort((a, b) => b.name.length - a.name.length);
    const hit = sorted.find((h) => {
      const n = h.name.toLowerCase();
      return n.startsWith(c) || c.startsWith(n) || n.includes(c) || c.includes(n);
    });
    if (hit) return hit;
  }

  const onDateCandidate = hallCandidateFromOnDatePattern(text);
  if (onDateCandidate) {
    const c = onDateCandidate.toLowerCase();
    const sorted = [...halls].sort((a, b) => b.name.length - a.name.length);
    const byPrefix = sorted.find((h) => {
      const n = h.name.toLowerCase();
      return n.startsWith(c) || c.startsWith(n);
    });
    if (byPrefix) return byPrefix;
  }

  const quoted = text.match(/["'“”]([^"'“”]{2,60})["'“”]/);
  if (quoted) {
    const q = quoted[1].trim().toLowerCase();
    const byExact = halls.find((h) => h.name.toLowerCase() === q);
    if (byExact) return byExact;
    const byLoose = halls.find(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        q.includes(h.name.toLowerCase())
    );
    if (byLoose) return byLoose;
  }

  const sorted = [...halls].sort((a, b) => b.name.length - a.name.length);
  for (const h of sorted) {
    const n = h.name.toLowerCase();
    if (n.length >= 2 && (lower.includes(n) || norm.toLowerCase().includes(n))) return h;
  }

  let best: HallRef | null = null;
  let bestWeight = 0;
  for (const h of halls) {
    const words = h.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1);
    if (words.length === 0) continue;
    const hit = words.filter((w) => lower.includes(w)).length;
    if (hit === words.length && words.length >= bestWeight) {
      best = h;
      bestWeight = words.length;
    }
  }
  return best;
}

export function looksLikeBookingRequest(text: string, lang: AssistantLang = "en"): boolean {
  const t = text.trim();
  if (BOOKING_INTENT_RE.test(t)) return true;
  if (lang === "ar" || hasArabicScript(t)) return BOOKING_INTENT_RE_AR.test(t);
  return false;
}

export function extractBookingIntentFromMessage(
  text: string,
  halls: HallRef[],
  lang: AssistantLang = "en"
): ResolvedBookingIntent | null {
  if (!looksLikeBookingRequest(text, lang)) return null;
  const date = parseAssistantDate(text);
  if (!date) return null;
  const norm = normalizeArabicDigits(text);
  const times =
    parseTimeRange24(text) ||
    parseTimeRange24(norm) ||
    parseTimeRangeArabic(text) ||
    parseTimeRangeArabic(norm);
  if (!times || times.endHour <= times.startHour) return null;
  if (times.startHour < OPEN_HOUR || times.endHour > CLOSE_HOUR) return null;
  const hall = resolveHallFromText(text, halls);
  if (!hall) return null;
  return {
    hallId: hall.id,
    hallName: hall.name,
    date,
    startHour: times.startHour,
    endHour: times.endHour,
  };
}

type OpenAiIntentJson = {
  hallName?: string | null;
  dateYmd?: string | null;
  startHour24?: number | null;
  endHour24?: number | null;
};

export async function extractBookingIntentWithOpenAI(
  userText: string,
  halls: HallRef[],
  lang: AssistantLang = "en"
): Promise<ResolvedBookingIntent | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || halls.length === 0) return null;

  const today = formatLocalYMD(new Date());
  const hallList = halls.map((h) => h.name).join("; ");

  const arNote =
    lang === "ar"
      ? "\nThe user may write in Arabic (or mixed Arabic/English). Map the hall to the closest name from the list (Latin names). Use Western digits in JSON."
      : "";

  const system = `You extract structured hall booking data. Reply with JSON only, no markdown.
Booking window: whole hours from ${OPEN_HOUR}:00 up to ${CLOSE_HOUR}:00 (last booking ends at ${CLOSE_HOUR}:00). endHour24 is EXCLUSIVE (same convention as the app: 10–12 means start 10, end 12).
Today (local) is ${today}.
Known hall names (pick the closest match): ${hallList}

Schema: {"hallName":string|null,"dateYmd":"YYYY-MM-DD"|null,"startHour24":number|null,"endHour24":number|null}
Use null when unknown. If the user says tomorrow/next Friday/etc., compute dateYmd from today.${arNote}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    let raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) raw = fenced[1].trim();

    let parsed: OpenAiIntentJson;
    try {
      parsed = JSON.parse(raw) as OpenAiIntentJson;
    } catch {
      return null;
    }

    const date = parsed.dateYmd?.trim();
    const start = Number(parsed.startHour24);
    const end = Number(parsed.endHour24);
    const hallName = parsed.hallName?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return null;
    if (start < OPEN_HOUR || end > CLOSE_HOUR) return null;

    const lowerHN = (hallName || "").toLowerCase();
    let hall: HallRef | undefined;
    if (hallName) {
      hall = halls.find((h) => h.name.toLowerCase() === lowerHN);
      if (!hall) hall = halls.find((h) => h.name.toLowerCase().includes(lowerHN));
      if (!hall) hall = halls.find((h) => lowerHN.includes(h.name.toLowerCase()));
    }
    if (!hall) hall = resolveHallFromText(userText, halls) ?? undefined;
    if (!hall) return null;

    return {
      hallId: hall.id,
      hallName: hall.name,
      date,
      startHour: start,
      endHour: end,
    };
  } catch {
    return null;
  }
}

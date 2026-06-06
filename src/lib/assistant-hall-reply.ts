import { hasArabicScript } from "@/lib/assistant-locale";

export type HallNameRef = { id: string; name: string };

/** User explicitly asked for capacity, price, amenities, etc. */
export function userWantsHallDetails(text: string): boolean {
  const t = text.toLowerCase();
  if (
    /\b(details?|specs?|specifications?|full\s+info|capacity|capacities|price|pricing|features?|amenities|projector|air\s*condition|seating|how\s+many\s+seats|how\s+big|how\s+much\s+(does|is)|what\s+are\s+the\s+(features|amenities))\b/.test(
      t
    )
  ) {
    return true;
  }
  if (/\b(with|show|give|list)\s+(details?|specs?|info)\b/.test(t)) return true;
  if (
    /تفاصيل|مواصفات|معلومات\s+عن|سعة|سعر|بروجيكتور|تكييف|كم\s+مقعد|كم\s+سعة|وصف\s+القاعة|مميزات/i.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

/** Casual hall browse — names only unless details requested. */
export function looksLikeHallBrowse(text: string): boolean {
  const t = text.toLowerCase();
  const en =
    /\b(hall|halls|room|rooms|lecture|classroom|lab|auditorium|campus\s+room)\b/.test(t) ||
    /\b(what\s+halls|which\s+halls|list\s+halls|show\s+halls|all\s+halls|any\s+halls|our\s+halls)\b/.test(
      t
    ) ||
    /\b(do\s+we\s+have|do\s+you\s+have|what\s+do\s+you\s+have)\b/.test(t) ||
    /\b(recommend|suggest|find|search|show\s+me|give\s+me)\b.*\b(room|hall|space)\b/.test(t) ||
    /\b(room|hall|space)\b.*\b(for|with|under|that)\b/.test(t);
  const ar =
    hasArabicScript(text) &&
    /قاعة|قاعات|مسرح|معمل|قاعة\s+دراسية|قائمة|اذكر|اعرض|ما\s+هي|عندنا|متوفرة|متاحة|فاضية|بحث/i.test(
      text
    );
  return en || ar;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match hall names mentioned in free text (longest names first). */
export function findMentionedHalls<T extends HallNameRef>(text: string, halls: T[]): T[] {
  const compact = text.replace(/\s+/g, " ").trim();
  const compactLower = compact.toLowerCase();
  const compactJoined = compactLower.replace(/\s/g, "");

  const sorted = [...halls].sort((a, b) => b.name.length - a.name.length);
  const found: T[] = [];

  for (const hall of sorted) {
    const name = hall.name.trim();
    const lower = name.toLowerCase();
    const joined = lower.replace(/\s/g, "");

    const patterns = [
      new RegExp(`\\b${escapeRe(lower)}\\b`, "i"),
      new RegExp(`\\b${escapeRe(joined)}\\b`, "i"),
      new RegExp(`قاعة\\s*${escapeRe(lower)}`, "i"),
      new RegExp(`hall\\s*${escapeRe(lower)}`, "i"),
    ];

    const hit =
      patterns.some((p) => p.test(compact)) ||
      compactJoined.includes(joined) ||
      compactLower.includes(lower);

    if (hit && !found.some((f) => f.id === hall.id)) {
      found.push(hall);
    }
  }

  return found;
}

function normalizeHallCode(raw: string): string {
  const c = raw.toLowerCase().replace(/\s/g, "");
  if (/^hall\d+$/.test(c)) return `Hall${c.slice(4)}`;
  if (/^[abc]\d+$/.test(c)) return c[0].toUpperCase() + c.slice(1);
  return raw;
}

/** Short hall codes: "b3", "c1", "hall2" when not already matched. */
export function findHallCodesInText<T extends HallNameRef>(text: string, halls: T[]): T[] {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const found: T[] = [];
  const codeRe = /\b(hall\s*\d+|[abc]\s*\d+)\b/gi;
  let m: RegExpExecArray | null;
  const codes = new Set<string>();
  while ((m = codeRe.exec(t)) !== null) {
    codes.add(normalizeHallCode(m[1]));
  }
  codes.forEach((code) => {
    const hall = halls.find(
      (h) => h.name.replace(/\s/g, "").toLowerCase() === code.replace(/\s/g, "").toLowerCase()
    );
    if (hall && !found.some((f) => f.id === hall.id)) found.push(hall);
  });
  return found;
}

export function resolveHallsFromMessage<T extends HallNameRef>(text: string, halls: T[]): T[] {
  const byName = findMentionedHalls(text, halls);
  const byCode = findHallCodesInText(text, halls);
  const merged = [...byName];
  for (const h of byCode) {
    if (!merged.some((x) => x.id === h.id)) merged.push(h);
  }
  return merged;
}

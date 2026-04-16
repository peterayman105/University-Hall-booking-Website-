export type AssistantLang = "en" | "ar";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const LATIN_DIGITS = "0123456789";

export function parseAssistantLang(v: unknown): AssistantLang {
  if (v === "ar" || v === "arabic") return "ar";
  return "en";
}

/** Eastern Arabic-Indic digits → ASCII digits */
export function normalizeArabicDigits(text: string): string {
  let out = "";
  for (const ch of text) {
    const i = AR_DIGITS.indexOf(ch);
    out += i >= 0 ? LATIN_DIGITS[i]! : ch;
  }
  return out;
}

const ARABIC_LETTER_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function hasArabicScript(text: string): boolean {
  return ARABIC_LETTER_RE.test(text);
}

export function defaultAssistantLang(): AssistantLang {
  if (typeof navigator !== "undefined" && /^ar/i.test(navigator.language || "")) return "ar";
  return "en";
}

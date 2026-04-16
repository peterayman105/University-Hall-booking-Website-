import { parseAssistantDate, formatLocalYMD } from "@/lib/assistant-date";
import { hasArabicScript, type AssistantLang } from "@/lib/assistant-locale";
import { OPEN_HOUR, CLOSE_HOUR, SEATING } from "@/lib/constants";
import { availableStartHours } from "@/lib/booking-utils";
import { HallModel } from "./hall.model";

export type HallSearchRow = {
  id: string;
  name: string;
  capacity: number;
  pricePerHour: number;
  hasProjector: boolean;
  hasAC: boolean;
  seatingType: string;
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "are",
  "can",
  "how",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "not",
  "but",
  "all",
  "any",
  "some",
  "into",
  "about",
  "like",
  "just",
  "also",
  "only",
  "very",
  "more",
  "most",
  "than",
  "then",
  "them",
  "they",
  "have",
  "has",
  "had",
  "was",
  "were",
  "been",
  "being",
  "its",
  "our",
  "out",
  "get",
  "got",
  "use",
  "using",
  "used",
  "need",
  "want",
  "show",
  "find",
  "give",
  "please",
  "help",
  "looking",
  "search",
  "recommend",
  "suggest",
  "hall",
  "halls",
  "room",
  "rooms",
  "space",
  "cheap",
  "budget",
  "large",
  "small",
  "good",
  "best",
  "available",
  "list",
  "showing",
  "hello",
  "hi",
  "hey",
  "thanks",
  "thank",
  "yes",
  "no",
  "ok",
  "okay",
  "bye",
  "sure",
]);

const FACILITY_TOKENS = new Set([
  "projector",
  "screen",
  "presentation",
  "conditioning",
  "conditioned",
  "aircon",
  "seating",
  "escalated",
  "tiered",
  "stepped",
  "flat",
  "seats",
  "seat",
  "people",
  "students",
  "student",
  "capacity",
  "hour",
  "hours",
  "egp",
  "under",
  "below",
  "above",
  "over",
  "least",
  "most",
  "max",
  "min",
  "less",
  "than",
  "per",
  "around",
  "about",
]);

function looksLikeHallSearch(text: string): boolean {
  const t = text.toLowerCase();
  if (t.length < 3) return false;
  const keys = [
    "find",
    "search",
    "show",
    "list",
    "need",
    "want",
    "hall",
    "room",
    "book",
    "cheap",
    "projector",
    " ac",
    "air",
    "seat",
    "capacity",
    "under",
    "below",
    "large",
    "small",
    "flat",
    "escalated",
    "recommend",
    "suggest",
    "which",
    "where",
    "fit",
    "hold",
    "lecture",
    "seminar",
    "lab",
    "auditorium",
    "training",
    "campus",
    "price",
    "budget",
  ];
  return keys.some((k) => t.includes(k));
}

function looksLikeHallSearchAr(text: string): boolean {
  if (!hasArabicScript(text)) return false;
  return /قاعة|قاعات|مسرح|سعر|جنيه|مقعد|مقاعد|بروجيكتور|تكييف|متاح|حجز|بحث|دور|طابق|صغير|كبير|رخيص/i.test(
    text
  );
}

export type ParsedHallCriteria = {
  where: Record<string, unknown>;
  nameTokens: string[];
};

export function parseHallSearchCriteria(raw: string): ParsedHallCriteria {
  const t = raw.toLowerCase();
  const where: Record<string, unknown> = {};

  if (/\b(projector|presentation screen)\b/.test(t)) where.hasProjector = true;
  if (/\b(no projector|without a projector|without projector)\b/.test(t)) where.hasProjector = false;

  if (/\b(ac|air conditioning|air conditioned|aircon)\b/.test(t)) where.hasAC = true;
  if (/\b(no ac|without ac|no air)\b/.test(t)) where.hasAC = false;

  if (/\b(escalated|tiered|stepped|amphitheatre)\b/.test(t)) where.seatingType = SEATING.ESCALATED;
  if (/\b(flat seating|flat seats)\b/.test(t) || /\bflat\b.*\b(seat|hall|room)\b/.test(t)) {
    where.seatingType = SEATING.FLAT;
  }

  let m = t.match(
    /\b(?:under|below|max|less than|cheaper than|at most)\s+(\d{2,4})\s*(?:egp)?\b/
  );
  if (m) {
    where.pricePerHour = { ...((where.pricePerHour as object) || {}), lte: Number(m[1]) };
  }
  m = t.match(/\b(?:over|above|min|at least|more than)\s+(\d{2,4})\s*(?:egp)?\b/);
  if (m) {
    where.pricePerHour = { ...((where.pricePerHour as object) || {}), gte: Number(m[1]) };
  }

  m = t.match(/\b(?:at least|minimum|min|for|holds?|fits?)\s+(\d{1,3})\b/);
  if (m) where.capacity = { gte: Number(m[1]) };
  m = t.match(/\b(\d{1,3})\s*(?:seats?|people|students|persons?)\b/);
  if (m) where.capacity = { gte: Number(m[1]) };

  const words = raw
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !FACILITY_TOKENS.has(w));

  const nameTokens = Array.from(new Set(words));

  return { where, nameTokens };
}

function hasStructuredCriteria(p: ParsedHallCriteria): boolean {
  return Object.keys(p.where).length > 0 || p.nameTokens.length > 0;
}

function filterByNameTokens(halls: HallSearchRow[], tokens: string[]): HallSearchRow[] {
  if (tokens.length === 0) return halls;
  return halls.filter((h) => {
    const n = h.name.toLowerCase();
    return tokens.every((tok) => n.includes(tok));
  });
}

function asksFreeOnDate(text: string): boolean {
  const l = text.toLowerCase();
  const en =
    /\bfree\s+on\b/.test(l) ||
    /\bavailable\s+on\b/.test(l) ||
    /\bfree\s+for\b/.test(l) ||
    /\bavailable\s+for\b/.test(l) ||
    /\bwhich\s+halls\s+(are\s+)?(free|available)\b/.test(l) ||
    /\b(anything|what)\s+free\b/.test(l) ||
    (/\b(free|available|vacant|availability)\b/.test(l) &&
      (/\btoday\b/.test(l) || /\btomorrow\b/.test(l))) ||
    (/\b(free|available|vacant|availability)\b/.test(l) && /\d{4}-\d{2}-\d{2}/.test(text));
  const arHint =
    /متاح|فارغ|فاضي|فاضية|غير\s*محجوز|مواعيد|القاعات\s*اللي|قاعات\s*فاضية|قاعات\s*متاحة|وين\s*القاعات|اشمعني|ايه\s*القاعات|إيه\s*القاعات/i.test(
      text
    );
  const arDate =
    /غد|غدا|اليوم|بكره|بكرة|\d{4}-\d{2}-\d{2}/.test(text) ||
    /أبريل|ابريل|إبريل|يناير|فبراير|مارس|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر/i.test(
      text
    );
  return Boolean(en || (arHint && arDate));
}

function formatFreeOnReply(
  date: string,
  items: { hall: HallSearchRow; slots: number[] }[],
  fullyBusyNames: string[],
  lang: AssistantLang
): string {
  const free = items.filter((x) => x.slots.length > 0);
  if (lang === "ar") {
    let msg = `**${date}** (نافذة الحجز ${OPEN_HOUR}:00–${CLOSE_HOUR}:00 بتوقيت محلي). الحجوزات المعلّقة والمؤكدة تُحسب مانعة للتعارض.\n\n`;
    if (free.length === 0) {
      msg +=
        "لا توجد قاعة بها ساعة بداية **لحجز ساعة واحدة** في ذلك اليوم — كل القاعات مغطاة بحجوزات معلّقة أو مؤكدة.";
      return msg;
    }
    msg += "قاعات فيها **على الأقل** ساعة بداية متاحة:\n\n";
    for (const { hall, slots } of free) {
      const preview = slots.slice(0, 14).map((s) => `${s}:00`).join("، ");
      const more = slots.length > 14 ? ` …ومعها ${slots.length - 14} وقت بداية إضافي` : "";
      msg += `• **${hall.name}** — أوقات البداية: ${preview}${more}\n`;
    }
    if (fullyBusyNames.length > 0) {
      msg += `\nمحجوزة بالكامل ذلك اليوم: ${fullyBusyNames.join("، ")}.`;
    }
    return msg;
  }

  let msg = `**${date}** (bookable window ${OPEN_HOUR}:00–${CLOSE_HOUR}:00, local time). Pending + confirmed bookings are treated as blocking.\n\n`;

  if (free.length === 0) {
    msg +=
      "No hall has a free **1-hour** start slot that day — every hall is fully covered by pending or confirmed bookings in that window.";
    return msg;
  }

  msg += "Halls with **at least one** bookable start hour:\n\n";
  for (const { hall, slots } of free) {
    const preview = slots.slice(0, 14).map((s) => `${s}:00`).join(", ");
    const more =
      slots.length > 14 ? ` …and ${slots.length - 14} more start time(s)` : "";
    msg += `• **${hall.name}** — start times: ${preview}${more}\n`;
  }

  if (fullyBusyNames.length > 0) {
    msg += `\nFully booked that day (no free hour to start): ${fullyBusyNames.join(", ")}.`;
  }
  return msg;
}

function formatHallSearchReply(halls: HallSearchRow[], intro: string, lang: AssistantLang): string {
  if (halls.length === 0) {
    if (lang === "ar") {
      return `${intro}\n\nلا توجد قاعات مطابقة. جرّب توسيع السعر أو تقليل الفلاتر، أو افتح صفحة **القاعات** واستخدم التصفية.`;
    }
    return `${intro}\n\nNo halls in the database match those criteria. Try a higher price limit, fewer facility filters, or different name keywords — or open **Halls** and use the filter panel.`;
  }
  const lines = halls.map((h) => {
    const bits =
      lang === "ar"
        ? [
            `${h.capacity} مقعد`,
            `${h.pricePerHour} جنيه/ساعة`,
            h.hasProjector ? "بروجيكتور" : "بدون بروجيكتور",
            h.hasAC ? "تكييف" : "بدون تكييف",
            h.seatingType === SEATING.ESCALATED ? "مقاعد مصعدة" : "مقاعد مسطحة",
          ]
        : [
            `${h.capacity} seats`,
            `${h.pricePerHour} EGP/h`,
            h.hasProjector ? "projector" : "no projector",
            h.hasAC ? "AC" : "no AC",
            h.seatingType === SEATING.ESCALATED ? "escalated seating" : "flat seating",
          ];
    return `• **${h.name}** — ${bits.join("، ")}.`;
  });
  return `${intro}\n\n${lines.join("\n")}`;
}

/**
 * Model: Assistant — DB-backed hall search + optional OpenAI phrasing.
 */
export const AssistantModel = {
  systemPrompt() {
    return `You are "Spot", the hall search assistant for Find Your Spot (Helwan National University / Team 21).
Booking hours are typically ${OPEN_HOUR}:00–${CLOSE_HOUR}:00. You must only mention halls that appear in the provided database JSON.`;
  },

  ruleBasedReply(text: string, lang: AssistantLang = "en"): string {
    const t = text.toLowerCase();
    if (lang === "ar") {
      if (/ساعة|وقت|متى|موعد|فتح|دوام/i.test(text)) {
        return `الحجز بالساعة بين ${OPEN_HOUR}:00 و${CLOSE_HOUR}:00. اختر التاريخ ثم وقت البداية والنهاية. الطلبات المعلّقة تمنع التعارض حتى يقرر المشرف.`;
      }
      if (/تقييم|مراجعة|review/i.test(t)) {
        return "يمكنك كتابة تقييم بعد انتهاء حجز مؤكد لتلك القاعة. التقييمات تُراجع قبل الظهور للجميع.";
      }
      if (/مشرف|أدمن|admin/i.test(t)) {
        return "المشرفون يديرون القاعات والمستخدمين والحجوزات والتقييمات.";
      }
      if (/حجز|book/i.test(t)) {
        return `يمكنك الحجز من صفحة القاعة، أو قل لي في جملة واحدة: **أي قاعة**، **أي يوم** (اليوم/غدًا/تاريخ)، **من أي ساعة لأي ساعة** (مثل من 10 إلى 12). سأحوّل ذلك إلى طلب معلّق لموافقة المشرف.`;
      }
      return "اسأل عن القاعات (سعر، مقاعد، بروجيكتور، تكييف…) أو **التوفر**: «متاح غدًا»، «قاعات فاضية يوم 2026-06-15». البيانات من قاعدة البيانات مباشرة.";
    }
    if (t.includes("hour") || t.includes("time") || t.includes("open")) {
      return `Halls can be booked in hourly blocks between ${OPEN_HOUR}:00 and ${CLOSE_HOUR}:00. Pick a date, then start and end times. Pending requests block double booking until an admin decides.`;
    }
    if (t.includes("review")) {
      return "You can leave a review only after a confirmed booking for that hall has ended. Reviews are moderated before they appear to everyone.";
    }
    if (t.includes("admin") || t.includes("super")) {
      return "Super admins manage halls, users, booking requests, schedules, and review moderation.";
    }
    if (t.includes("book") || t.includes("pending")) {
      return `You can book from the hall page, or tell me in one sentence: **which hall**, **which day** (today / tomorrow / a date), and **start–end time** (e.g. 10am–12pm). I translate that into a pending request for an admin to approve.`;
    }
    return 'Ask for halls by criteria (e.g. "under 200 EGP with projector") or **availability**: "free on 2026-06-15", "available tomorrow", "which halls are free on …". I use the live booking database.';
  },

  async replyFreeOnDate(
    date: string,
    userMessage: string,
    messages: { role: string; content: string }[],
    lang: AssistantLang = "en"
  ): Promise<string> {
    const today = formatLocalYMD(new Date());
    if (date < today) {
      return lang === "ar"
        ? "هذا التاريخ في الماضي. اسأل عن **اليوم** أو **غدًا** أو تاريخ قادم."
        : "That date is already in the past. Ask about **today**, **tomorrow**, or a future date.";
    }

    const halls = await HallModel.findAllForAssistantSearch();
    const items: { hall: HallSearchRow; slots: number[] }[] = [];
    const fullyBusyNames: string[] = [];

    for (const h of halls) {
      const bookings = await HallModel.blockingBookingsForDay(h.id, date);
      const slots = availableStartHours(OPEN_HOUR, CLOSE_HOUR, bookings, 1);
      items.push({ hall: h, slots });
      if (slots.length === 0) fullyBusyNames.push(h.name);
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const payload = items.map(({ hall, slots }) => ({
          name: hall.name,
          capacity: hall.capacity,
          pricePerHour: hall.pricePerHour,
          hasProjector: hall.hasProjector,
          hasAC: hall.hasAC,
          seatingType: hall.seatingType,
          bookableStartHours: slots,
        }));
        const ai = await AssistantModel.openAiFreeOnReply(
          messages,
          userMessage,
          date,
          payload,
          lang
        );
        if (ai) return ai;
      } catch (e) {
        console.error(e);
      }
    }

    return formatFreeOnReply(date, items, fullyBusyNames, lang);
  },

  async openAiFreeOnReply(
    messages: { role: string; content: string }[],
    _lastUserText: string,
    date: string,
    payload: {
      name: string;
      capacity: number;
      pricePerHour: number;
      hasProjector: boolean;
      hasAC: boolean;
      seatingType: string;
      bookableStartHours: number[];
    }[],
    lang: AssistantLang = "en"
  ): Promise<string | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;

    const system = `${AssistantModel.systemPrompt()}

The user asked which halls are **free / have availability** on **${date}** (local date).

DATA is from the real database: for each hall, \`bookableStartHours\` lists whole-hour **start** times (between ${OPEN_HOUR}:00 and ${CLOSE_HOUR}:00) where at least a **1-hour** booking could start without overlapping pending or confirmed bookings.

Rules:
- Only discuss halls in AVAILABILITY_JSON.
- List halls that have **any** bookableStartHours first, **by name**.
- Mention halls with **empty** bookableStartHours as fully blocked that day.
- Do not invent halls or times.
- Be concise.
${lang === "ar" ? "\n- Answer in **Modern Standard Arabic** (فصحى مبسطة). Keep hall **names** exactly as in JSON (Latin)." : ""}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${system}\n\nDATE: ${date}\nAVAILABILITY_JSON:\n${JSON.stringify(payload)}`,
          },
          ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 800,
        temperature: 0.25,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI error", await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  },

  async findMatchingHalls(userMessage: string): Promise<{
    halls: HallSearchRow[];
    parsed: ParsedHallCriteria;
    browseAll: boolean;
  }> {
    const parsed = parseHallSearchCriteria(userMessage);
    const structured = hasStructuredCriteria(parsed);
    const searchLike = looksLikeHallSearch(userMessage) || looksLikeHallSearchAr(userMessage);

    if (structured) {
      const rows: HallSearchRow[] =
        Object.keys(parsed.where).length > 0
          ? ((await HallModel.findManyFiltered(parsed.where)) as HallSearchRow[])
          : await HallModel.findAllForAssistantSearch();

      let halls = filterByNameTokens(rows, parsed.nameTokens);

      if (
        halls.length === 0 &&
        parsed.nameTokens.length > 0 &&
        Object.keys(parsed.where).length > 0
      ) {
        const all = await HallModel.findAllForAssistantSearch();
        halls = filterByNameTokens(all, parsed.nameTokens);
      }

      return { halls: halls.slice(0, 25), parsed, browseAll: false };
    }

    if (searchLike) {
      const all = await HallModel.findAllForAssistantSearch();
      return { halls: all.slice(0, 25), parsed, browseAll: true };
    }

    if (hasArabicScript(userMessage)) {
      const all = await HallModel.findAllForAssistantSearch();
      return { halls: all.slice(0, 25), parsed, browseAll: true };
    }

    return { halls: [], parsed, browseAll: false };
  },

  async composeReply(
    userMessage: string,
    messages: { role: string; content: string }[],
    lang: AssistantLang = "en"
  ): Promise<string> {
    const trimmed = userMessage.trim();
    if (trimmed.length <= 2) return AssistantModel.ruleBasedReply(trimmed, lang);

    const freeDate = parseAssistantDate(trimmed);
    if (asksFreeOnDate(trimmed)) {
      if (!freeDate) {
        return lang === "ar"
          ? "حدّد **التاريخ** المطلوب — مثل: متاح يوم 2026-06-15، أو غدًا، أو اليوم. أفحص كل القاعات مقابل الحجوزات المعلّقة والمؤكدة."
          : "Tell me **which date** to check — e.g. **free on 2026-06-15**, **available on tomorrow**, or **free today**. I scan every hall against pending + confirmed bookings.";
      }
      return await AssistantModel.replyFreeOnDate(freeDate, trimmed, messages, lang);
    }

    const { halls, parsed, browseAll } = await AssistantModel.findMatchingHalls(trimmed);
    const structured = hasStructuredCriteria(parsed);
    const searchLike = looksLikeHallSearch(trimmed) || looksLikeHallSearchAr(trimmed);
    const searchIntent = structured || searchLike || browseAll;

    if (!searchIntent) {
      if ((lang === "ar" || hasArabicScript(trimmed)) && process.env.OPENAI_API_KEY) {
        try {
          const ai = await AssistantModel.openAiArabicAssist(messages, trimmed, lang);
          if (ai) return ai;
        } catch (e) {
          console.error(e);
        }
      }
      return AssistantModel.ruleBasedReply(trimmed, lang);
    }

    const intro =
      browseAll || (lang === "ar" && hasArabicScript(trimmed))
        ? lang === "ar"
          ? "هذه القاعات المسجّلة لدينا (يمكنك تضييق البحث بالسعر أو البروجيكتور أو التكييف أو السعة أو اسم القاعة):"
          : "Here are the halls currently in our database (you can narrow this with price, projector, AC, capacity, or a name keyword):"
        : lang === "ar"
          ? "قاعات من **قاعدة البيانات** تطابق معاييرك:"
          : "Here are halls from our **live database** that match your criteria:";

    if (process.env.OPENAI_API_KEY) {
      try {
        const ai = await AssistantModel.openAiSearchReply(
          messages,
          trimmed,
          halls,
          intro,
          lang
        );
        if (ai) return ai;
      } catch (e) {
        console.error(e);
      }
    }

    return formatHallSearchReply(halls, intro, lang);
  },

  async openAiArabicAssist(
    messages: { role: string; content: string }[],
    userText: string,
    lang: AssistantLang
  ): Promise<string | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    const halls = await HallModel.findAllForAssistantSearch();
    const replyAr = lang === "ar" || hasArabicScript(userText);
    const system = `${AssistantModel.systemPrompt()}

The user wrote in ${replyAr ? "Arabic (possibly mixed with English)" : "English"}.
You help with **Find Your Spot** (university hall booking). Booking hours ${OPEN_HOUR}:00–${CLOSE_HOUR}:00.
HALLS_JSON lists real halls (names may stay in Latin).

Rules:
- Be concise and accurate; do not invent halls not in HALLS_JSON.
- If they need booking steps, explain: pick hall, date, hours; customer requests become pending until admin approves.
${replyAr ? "- Reply in **Modern Standard Arabic** (فصحى مبسطة). Keep official hall names from JSON as-is." : "- Reply in clear, concise English." }

HALLS_JSON:
${JSON.stringify(halls.slice(0, 20))}`;

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
          ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 600,
        temperature: 0.35,
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  },

  async openAiSearchReply(
    messages: { role: string; content: string }[],
    lastUserText: string,
    halls: HallSearchRow[],
    introHint: string,
    lang: AssistantLang = "en"
  ): Promise<string | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key || !lastUserText) return null;

    const system = `${AssistantModel.systemPrompt()}

You are the **hall search assistant**. The user asked for help choosing a hall.

Rules:
- ONLY recommend halls that appear in HALLS_JSON below (these are real rows from our SQLite/Prisma database).
- Always mention halls **by name** (exact strings from JSON).
- For each suggested hall, add one short line: capacity, price/hour, projector yes/no, AC yes/no, seating type.
- If HALLS_JSON is empty, say no halls matched and suggest relaxing filters or using the Halls page filters.
- Do not invent hall names.
- Keep the answer concise.
${lang === "ar" ? "\n- Answer in **Modern Standard Arabic**. Keep hall **names** exactly as in HALLS_JSON (Latin spellings)." : ""}

INTRO_HINT: ${introHint}

HALLS_JSON:
${JSON.stringify(halls)}`;

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
          ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 700,
        temperature: 0.35,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI error", await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  },
};

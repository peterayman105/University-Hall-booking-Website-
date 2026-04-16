"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  defaultAssistantLang,
  type AssistantLang,
} from "@/lib/assistant-locale";

type Msg = { role: "user" | "assistant"; content: string };

const LANG_STORAGE = "fys_assistant_lang";

function welcomeCustomer(lang: AssistantLang): Msg {
  if (lang === "ar") {
    return {
      role: "assistant",
      content:
        "مرحبًا، أنا **Spot**. اسأل عن القاعات (السعر، المقاعد، البروجيكتور، التكييف…) أو **التوفر** (مثل: متاح غدًا، قاعات فاضية يوم 2026-06-15). البيانات مباشرة من قاعدة البيانات. **للحجز** اكتب أو تحدّث بجملة واحدة: أي قاعة، أي يوم (اليوم/غدًا/تاريخ)، من أي ساعة إلى أي ساعة (مثل من 10 إلى 12).",
    };
  }
  return {
    role: "assistant",
    content:
      "Hi! I’m Spot. Ask for halls by criteria (price, seats, projector, AC…) or **availability**: e.g. 'free on 2026-06-15', 'available tomorrow'. I read the live database. **Book in plain English or Arabic** — one sentence with hall, date, and time range; I create a pending request (with optional AI help).",
  };
}

function welcomeViewer(lang: AssistantLang): Msg {
  if (lang === "ar") {
    return {
      role: "assistant",
      content:
        "مرحبًا، أنا **Spot**. يمكنني اقتراح القاعات والمواعيد من قاعدة البيانات. **وضع المشاهد** لا يسمح بالحجز — سجّل كعميل لوضع طلبات.",
    };
  }
  return {
    role: "assistant",
    content:
      "Hi! I’m Spot. Ask for halls by criteria or **availability** — I read the live database. **Viewer mode**: I can suggest halls and times only; booking is disabled. Sign in as a customer to submit requests.",
  };
}

function welcomeDefault(lang: AssistantLang): Msg {
  if (lang === "ar") {
    return {
      role: "assistant",
      content:
        "مرحبًا، أنا **Spot**. أساعد في البحث عن القاعات والتوفر بعد تسجيل الدخول.",
    };
  }
  return welcomeCustomer("en");
}

function readStoredLang(): AssistantLang {
  if (typeof window === "undefined") return "en";
  try {
    const s = localStorage.getItem(LANG_STORAGE) as AssistantLang | null;
    if (s === "ar" || s === "en") return s;
  } catch {
    /* ignore */
  }
  return defaultAssistantLang();
}

export function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [assistantLang, setAssistantLang] = useState<AssistantLang>(readStoredLang);
  const [user, setUser] = useState<{ role: string } | null | undefined>(undefined);
  const [messages, setMessages] = useState<Msg[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  const langRef = useRef(assistantLang);
  langRef.current = assistantLang;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  function applyWelcome(role: string | undefined, lang: AssistantLang) {
    let m: Msg;
    if (role === "CUSTOMER") m = welcomeCustomer(lang);
    else if (role === "VIEWER") m = welcomeViewer(lang);
    else m = welcomeDefault(lang);
    setMessages([m]);
    messagesRef.current = [m];
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        if (d?.user?.role) applyWelcome(d.user.role, langRef.current);
        else setUser(null);
      })
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      const prev = messagesRef.current;
      const nextMsgs = [...prev, { role: "user" as const, content: t }];
      setMessages(nextMsgs);
      setInput("");
      setLoading(true);
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: assistantLang,
            messages: nextMsgs.map((x) => ({ role: x.role, content: x.content })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              assistantLang === "ar"
                ? "حدث خطأ. حاول مرة أخرى بعد قليل."
                : "Something went wrong. Try again in a moment.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [assistantLang]
  );

  const toggleVoice = useCallback(() => {
    type Rec = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    type RecCtor = new () => Rec;
    const w = window as Window & {
      SpeechRecognition?: RecCtor;
      webkitSpeechRecognition?: RecCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert(
        assistantLang === "ar"
          ? "التعرف على الصوت غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge."
          : "Speech recognition is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }
    if (listening) return;
    const rec = new SR();
    rec.lang = assistantLang === "ar" ? "ar-SA" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (ev) => {
      const said = ev.results[0]?.[0]?.transcript?.trim();
      if (said) void send(said);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }, [assistantLang, listening, send]);

  function setLang(next: AssistantLang) {
    setAssistantLang(next);
    try {
      localStorage.setItem(LANG_STORAGE, next);
    } catch {
      /* ignore */
    }
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.role === "assistant") {
        const role = user?.role;
        if (role === "CUSTOMER") return [welcomeCustomer(next)];
        if (role === "VIEWER") return [welcomeViewer(next)];
        return [welcomeDefault(next)];
      }
      return prev;
    });
  }

  if (user === undefined || !user) return null;
  if (pathname === "/") return null;

  const ar = assistantLang === "ar";

  return (
    <>
      <button
        type="button"
        aria-label={ar ? "فتح المساعد" : "Open assistant"}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 dark:bg-sky-500 dark:hover:bg-sky-400"
      >
        <span className="text-2xl leading-none">✨</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-4 sm:items-center sm:justify-end sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={ar ? "مساعد Spot" : "AI assistant"}
        >
          <div
            className="flex h-[min(32rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            dir={ar ? "rtl" : "ltr"}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {ar ? "مساعد Spot" : "Spot assistant"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {ar ? "محادثة وصوت" : "Chat & voice"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs dark:border-slate-600">
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`rounded-md px-2 py-1 ${
                      assistantLang === "en"
                        ? "bg-slate-200 font-medium dark:bg-slate-700"
                        : "text-slate-500"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("ar")}
                    className={`rounded-md px-2 py-1 ${
                      assistantLang === "ar"
                        ? "bg-slate-200 font-medium dark:bg-slate-700"
                        : "text-slate-500"
                    }`}
                  >
                    عربي
                  </button>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  {ar ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-brand-600 text-white dark:bg-sky-600"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  } ${ar && m.role === "user" ? "!ml-0 !mr-auto" : ""}`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {ar ? "جارٍ التفكير…" : "Thinking…"}
                </p>
              )}
              <div ref={endRef} />
            </div>
            <form
              className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-700"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                placeholder={ar ? "اكتب رسالتك…" : "Ask anything…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                dir={ar ? "rtl" : "ltr"}
              />
              <button
                type="button"
                onClick={() => toggleVoice()}
                disabled={listening || loading}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
                title={ar ? "إدخال صوتي" : "Voice input"}
              >
                {listening ? "…" : "🎤"}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-sky-600"
              >
                {ar ? "إرسال" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

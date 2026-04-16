import type { AssistantLang } from "@/lib/assistant-locale";

export function msgBookingConflict(
  lang: AssistantLang,
  hallName: string,
  date: string,
  startHour: number,
  endHour: number
): string {
  if (lang === "ar") {
    return `لا يمكن حجز **${hallName}** في **${date}** من **${startHour}:00** إلى **${endHour}:00** — يوجد تعارض مع حجز قيد الانتظار أو مؤكد.`;
  }
  return `I cannot book **${hallName}** on **${date}** from **${startHour}:00** to **${endHour}:00** — that slot overlaps a pending or confirmed booking.`;
}

export function msgBookingOk(
  lang: AssistantLang,
  hallName: string,
  date: string,
  startHour: number,
  endHour: number
): string {
  if (lang === "ar") {
    return `تم إرسال طلب حجز **${hallName}** في **${date}** من **${startHour}:00** إلى **${endHour}:00** (بانتظار موافقة المشرف).`;
  }
  return `Done. I submitted a booking request for **${hallName}** on **${date}**, **${startHour}:00–${endHour}:00** (pending admin approval).`;
}

export function msgBookingNeedDetail(lang: AssistantLang): string {
  if (lang === "ar") {
    return "فهمت أنك تريد الحجز. أحتاج **تاريخًا** (مثل غدًا أو ٢٠٢٦-٠٤-٢٢)، **وقت البداية والنهاية** (مثل من ١٠ إلى ١٢ أو ١٠ صباحًا إلى ١٢ ظهرًا)، و**اسم القاعة** كما يظهر في الموقع. جرّب جملة واحدة تتضمن الثلاثة.";
  }
  return "I understood you want to book, but I need a **clear date** (e.g. tomorrow or 2026-04-15), **time range** (e.g. 10am–12pm or from 10 to 12), and which **hall** (say the hall name as it appears on the site). Try one sentence with all three.";
}

export function msgViewerNoBook(lang: AssistantLang): string {
  if (lang === "ar") {
    return "وضع المشاهد: يمكنني اقتراح القاعات والمواعيد فقط. الحجز غير متاح — سجّل كعميل لإنشاء طلبات.";
  }
  return "Viewer mode can suggest halls and availability only. Booking is disabled for viewers. Switch to a customer account to place bookings.";
}

export function msgChatError(lang: AssistantLang): string {
  if (lang === "ar") {
    return "حدث خطأ. حاول مرة أخرى بعد قليل.";
  }
  return "Something went wrong. Try again in a moment.";
}

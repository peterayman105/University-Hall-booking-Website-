import type { SessionPayload } from "@/lib/auth";
import { isCustomer, isViewer } from "@/lib/auth";
import { isSlotBlocked } from "@/lib/booking-utils";
import { parseAssistantLang } from "@/lib/assistant-locale";
import {
  msgBookingConflict,
  msgBookingNeedDetail,
  msgBookingOk,
  msgViewerNoBook,
} from "@/lib/assistant-messages";
import {
  extractBookingIntentFromMessage,
  extractBookingIntentWithOpenAI,
  looksLikeBookingRequest,
} from "@/lib/booking-intent";
import { AssistantModel } from "@/models/assistant.model";
import { BookingModel } from "@/models/booking.model";
import { HallModel } from "@/models/hall.model";
import { fail, ok, type ActionResult } from "./types";

/**
 * MVC — Controller: AI assistant (DB-backed hall search + optional OpenAI).
 */
export const AssistantController = {
  async chat(
    session: SessionPayload | null,
    body: unknown
  ): Promise<ActionResult<{ reply: string }>> {
    if (!session) return fail(401, "Sign in to use the assistant");

    const messages = (body as { messages?: { role: string; content: string }[] }).messages || [];
    const last =
      messages.filter((m) => m.role === "user").pop()?.content?.trim() || "";
    const lang = parseAssistantLang((body as { language?: string }).language);

    if (isCustomer(session.role)) {
      const halls = await HallModel.findAllForAssistantSearch();
      const intent =
        extractBookingIntentFromMessage(last, halls, lang) ||
        (looksLikeBookingRequest(last, lang)
          ? await extractBookingIntentWithOpenAI(last, halls, lang)
          : null);

      if (intent) {
        const existing = await BookingModel.findBlockingForHallAndDate(intent.hallId, intent.date);
        if (isSlotBlocked(intent.startHour, intent.endHour, existing)) {
          return ok({
            reply: msgBookingConflict(
              lang,
              intent.hallName,
              intent.date,
              intent.startHour,
              intent.endHour
            ),
          });
        }
        await BookingModel.createPending({
          userId: session.sub,
          hallId: intent.hallId,
          date: intent.date,
          startHour: intent.startHour,
          endHour: intent.endHour,
        });
        return ok({
          reply: msgBookingOk(lang, intent.hallName, intent.date, intent.startHour, intent.endHour),
        });
      }

      if (looksLikeBookingRequest(last, lang)) {
        return ok({ reply: msgBookingNeedDetail(lang) });
      }
    }

    if (
      isViewer(session.role) &&
      (/\b(book|reserve)\b/i.test(last) || /(احجز|أحجز|حجز|موعد)/i.test(last))
    ) {
      return ok({ reply: msgViewerNoBook(lang) });
    }

    const reply = await AssistantModel.composeReply(last, messages, lang);
    return ok({ reply });
  },
};

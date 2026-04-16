import { isCustomer, type SessionPayload } from "@/lib/auth";
import { BookingModel } from "@/models/booking.model";
import { ReviewModel } from "@/models/review.model";
import { fail, ok, type ActionResult } from "./types";

/**
 * MVC — Controller: customer-submitted reviews.
 */
export const ReviewController = {
  async create(session: SessionPayload | null, body: unknown): Promise<ActionResult<{ review: unknown }>> {
    if (!session || !isCustomer(session.role)) return fail(401, "Unauthorized");
    try {
      const b = body as Record<string, unknown>;
      const hallId = String(b.hallId || "");
      const rating = Number(b.rating);
      const comment = String(b.comment || "").trim();

      if (!hallId || !Number.isFinite(rating) || rating < 1 || rating > 5 || !comment) {
        return fail(400, "Invalid review");
      }

      const eligible = await BookingModel.findEligibleForReview(session.sub, hallId);
      if (!eligible) {
        return fail(
          403,
          "You can review only after a confirmed booking for this hall has finished (end time has passed)."
        );
      }

      const review = await ReviewModel.createPending({
        userId: session.sub,
        hallId,
        rating,
        comment,
      });
      return ok({ review });
    } catch (e) {
      console.error(e);
      return fail(500, "Server error");
    }
  },
};

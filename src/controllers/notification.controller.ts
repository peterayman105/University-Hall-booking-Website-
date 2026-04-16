import { isCustomer, type SessionPayload } from "@/lib/auth";
import { REVIEW_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { BookingModel } from "@/models/booking.model";
import { ReviewModel } from "@/models/review.model";
import { fail, ok, type ActionResult } from "./types";

type NotificationItem = {
  id: string;
  kind: "BOOKING" | "REVIEW";
  createdAt: string;
  title: string;
  message: string;
  status: string;
  reason?: string;
};

/**
 * MVC — Controller: customer notifications.
 */
export const NotificationController = {
  async listMine(
    session: SessionPayload | null
  ): Promise<ActionResult<{ notifications: NotificationItem[] }>> {
    if (!session || !isCustomer(session.role)) return fail(401, "Unauthorized");

    const [bookings, reviews] = await Promise.all([
      BookingModel.listForUser(session.sub),
      ReviewModel.listForUser(session.sub),
    ]);
    const rawBookingReasons = await prisma.$queryRaw<Array<{ id: string; rejectReason: string | null }>>`
      SELECT id, rejectReason
      FROM "Booking"
      WHERE userId = ${session.sub}
    `;
    const bookingReasonMap = new Map(rawBookingReasons.map((r) => [r.id, r.rejectReason]));

    // Fallback read for rejection reasons (covers stale Prisma client edge cases).
    const rawReviewReasons = await prisma.$queryRaw<Array<{ id: string; rejectReason: string | null }>>`
      SELECT id, rejectReason
      FROM "Review"
      WHERE userId = ${session.sub}
    `;
    const reviewReasonMap = new Map(rawReviewReasons.map((r) => [r.id, r.rejectReason]));

    const bookingItems: NotificationItem[] = bookings.map((b) => ({
      id: `booking:${b.id}`,
      kind: "BOOKING",
      createdAt: new Date(b.createdAt).toISOString(),
      title: "Booking update",
      message: `${b.hall.name} on ${b.date} (${b.startHour}:00-${b.endHour}:00) is ${b.status.toLowerCase()}.`,
      status: b.status,
      reason: (b.rejectReason || bookingReasonMap.get(b.id) || undefined) ?? undefined,
    }));

    const reviewItems: NotificationItem[] = reviews
      .filter((r) => r.status !== REVIEW_STATUS.PENDING)
      .map((r) => ({
        id: `review:${r.id}`,
        kind: "REVIEW",
        createdAt: new Date(r.createdAt).toISOString(),
        title: "Review moderation",
        message: `Your review for ${r.hall.name} is ${r.status.toLowerCase()}.`,
        status: r.status,
        reason: (r.rejectReason || reviewReasonMap.get(r.id) || undefined) ?? undefined,
      }));

    const notifications = [...bookingItems, ...reviewItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return ok({ notifications });
  },
};

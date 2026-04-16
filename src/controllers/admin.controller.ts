import { isSuperadmin, type SessionPayload } from "@/lib/auth";
import { BOOKING_STATUS, ROLES } from "@/lib/constants";
import { isSlotBlocked } from "@/lib/booking-utils";
import { BookingModel } from "@/models/booking.model";
import { ReviewModel } from "@/models/review.model";
import { UserModel } from "@/models/user.model";
import { fail, ok, type ActionResult } from "./types";

export const AdminController = {
  weekScheduleRange(startRaw: string | null) {
    const start = startRaw && /^\d{4}-\d{2}-\d{2}$/.test(startRaw) ? new Date(`${startRaw}T00:00:00`) : new Date();
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${da}`;
    };
    return { weekStart: fmt(start), weekEnd: fmt(end) };
  },

  async listUsers(session: SessionPayload | null): Promise<
    ActionResult<{ users: unknown[]; superAdminTotal: number }>
  > {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const [allUsers, superAdminTotal] = await Promise.all([
      UserModel.listWithBookingsForAdmin(),
      UserModel.countSuperadmins(),
    ]);
    const users = allUsers.filter((u) => u.id !== session.sub);
    return ok({ users, superAdminTotal });
  },

  async listBookings(
    session: SessionPayload | null,
    status: string | null
  ): Promise<ActionResult<{ bookings: unknown[] }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const validStatuses = [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.REJECTED,
    ] as const;
    const where =
      status && validStatuses.includes(status as (typeof validStatuses)[number])
        ? { status }
        : {};
    const bookings = await BookingModel.listForAdmin(where);
    return ok({ bookings });
  },

  async weeklySchedule(
    session: SessionPayload | null,
    weekStartRaw: string | null
  ): Promise<ActionResult<{ weekStart: string; weekEnd: string; bookings: unknown[] }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const { weekStart, weekEnd } = AdminController.weekScheduleRange(weekStartRaw);
    const bookings = await BookingModel.listForAdminWeek(weekStart, weekEnd);
    return ok({ weekStart, weekEnd, bookings });
  },

  async patchBooking(
    session: SessionPayload | null,
    bookingId: string,
    body: unknown
  ): Promise<ActionResult<{ booking?: unknown; ok?: boolean }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const action = String((body as Record<string, unknown>).action || "");

    const booking = await BookingModel.findByIdWithHall(bookingId);
    if (!booking) return fail(404, "Not found");

    if (action === "reject") {
      if (booking.status !== BOOKING_STATUS.PENDING) {
        return fail(400, "Only pending can be rejected");
      }
      const reason = String((body as Record<string, unknown>).reason || "").trim();
      if (reason.length < 3) {
        return fail(400, "Please provide a short rejection reason");
      }
      const updated = await BookingModel.updateStatus(bookingId, BOOKING_STATUS.REJECTED, reason);
      return ok({ booking: updated });
    }

    if (action === "confirm") {
      if (booking.status !== BOOKING_STATUS.PENDING) {
        return fail(400, "Only pending can be confirmed");
      }
      const others = await BookingModel.othersBlockingSameSlot(
        bookingId,
        booking.hallId,
        booking.date
      );
      if (isSlotBlocked(booking.startHour, booking.endHour, others)) {
        return fail(409, "Another booking now overlaps this slot; cannot confirm");
      }
      const updated = await BookingModel.updateStatus(bookingId, BOOKING_STATUS.CONFIRMED);
      return ok({ booking: updated });
    }

    return fail(400, "Invalid action");
  },

  async listReviews(
    session: SessionPayload | null,
    pendingOnly: boolean
  ): Promise<ActionResult<{ reviews: unknown[] }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const reviews = await ReviewModel.listForAdmin(pendingOnly);
    return ok({ reviews });
  },

  async menuCounts(
    session: SessionPayload | null
  ): Promise<
    ActionResult<{
      users: number;
      pendingBookings: number;
      confirmedBookings: number;
      rejectedBookings: number;
      pendingReviews: number;
    }>
  > {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const [users, pendingBookings, confirmedBookings, rejectedBookings, pendingReviews] =
      await Promise.all([
        UserModel.countCustomers(),
        BookingModel.countByStatus(BOOKING_STATUS.PENDING),
        BookingModel.countByStatus(BOOKING_STATUS.CONFIRMED),
        BookingModel.countByStatus(BOOKING_STATUS.REJECTED),
        ReviewModel.countPending(),
      ]);
    return ok({
      users,
      pendingBookings,
      confirmedBookings,
      rejectedBookings,
      pendingReviews,
    });
  },

  async patchReview(
    session: SessionPayload | null,
    reviewId: string,
    body: unknown
  ): Promise<ActionResult<{ review?: unknown; ok?: boolean }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const action = String((body as Record<string, unknown>).action || "");

    const review = await ReviewModel.findById(reviewId);
    if (!review) return fail(404, "Not found");

    if (action === "approve") {
      const updated = await ReviewModel.approve(reviewId);
      return ok({ review: updated });
    }
    if (action === "reject") {
      const reason = String((body as Record<string, unknown>).reason || "").trim();
      if (reason.length < 3) {
        return fail(400, "Please provide a short rejection reason");
      }
      const updated = await ReviewModel.reject(reviewId, reason);
      return ok({ review: updated });
    }
    return fail(400, "Invalid action");
  },

  async patchUser(
    session: SessionPayload | null,
    userId: string,
    body: unknown
  ): Promise<ActionResult<{ user: unknown }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    if (userId === session.sub) return fail(400, "Cannot change your own role here");
    const target = await UserModel.findByIdForAdmin(userId);
    if (!target) return fail(404, "Not found");

    const b = body as Record<string, unknown>;
    if (b.role === undefined) return fail(400, "Role required");

    const role = String(b.role || "").toUpperCase();
    if (role !== ROLES.CUSTOMER && role !== ROLES.SUPERADMIN) {
      return fail(400, "Invalid role");
    }
    if (target.role === ROLES.SUPERADMIN && role === ROLES.CUSTOMER) {
      const n = await UserModel.countSuperadmins();
      if (n <= 1) return fail(400, "Cannot demote the last super admin");
    }

    await UserModel.updateById(userId, { role });
    const row = await UserModel.findForAdminListItem(userId);
    if (!row) return fail(404, "Not found");
    return ok({ user: row });
  },

  async deleteUser(session: SessionPayload | null, userId: string): Promise<ActionResult<{ ok: boolean }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    if (userId === session.sub) return fail(400, "Cannot delete your own account");
    const target = await UserModel.findByIdForAdmin(userId);
    if (!target) return fail(404, "Not found");
    if (target.role === ROLES.SUPERADMIN) {
      const n = await UserModel.countSuperadmins();
      if (n <= 1) return fail(400, "Cannot delete the last super admin");
    }
    await UserModel.deleteById(userId);
    return ok({ ok: true });
  },
};

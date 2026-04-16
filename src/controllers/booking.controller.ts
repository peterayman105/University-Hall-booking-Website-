import { isCustomer, type SessionPayload } from "@/lib/auth";
import { CLOSE_HOUR, isSlotBlocked, OPEN_HOUR, availableTimeRanges } from "@/lib/booking-utils";
import { MAX_BOOKING_HOURS } from "@/lib/constants";
import { BookingModel } from "@/models/booking.model";
import { HallModel } from "@/models/hall.model";
import { isBookingEndInPast } from "@/lib/booking-time";
import { fail, ok, type ActionResult } from "./types";

/**
 * MVC — Controller: customer bookings.
 */
export const BookingController = {
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

  async create(session: SessionPayload | null, body: unknown): Promise<ActionResult<{ booking: unknown }>> {
    if (!session || !isCustomer(session.role)) return fail(401, "Unauthorized");
    try {
      const b = body as Record<string, unknown>;
      const hallId = String(b.hallId || "");
      const date = String(b.date || "");
      const startHour = Number(b.startHour);
      const endHour = Number(b.endHour);

      if (!hallId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, "Invalid input");
      if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) {
        return fail(400, "Start and end time must be whole hours");
      }
      if (endHour <= startHour) return fail(400, "End time must be after start time");
      if (startHour < OPEN_HOUR || endHour > CLOSE_HOUR) {
        return fail(400, `Bookings must stay within ${OPEN_HOUR}:00–${CLOSE_HOUR}:00`);
      }
      if (endHour - startHour > MAX_BOOKING_HOURS) {
        return fail(400, `Maximum booking length is ${MAX_BOOKING_HOURS} hours`);
      }

      const hall = await HallModel.findById(hallId);
      if (!hall) return fail(404, "Hall not found");

      const existing = await BookingModel.findBlockingForHallAndDate(hallId, date);
      const allowed = availableTimeRanges(OPEN_HOUR, CLOSE_HOUR, existing);
      const valid = allowed.some((r) => r.startHour === startHour && r.endHour === endHour);
      if (!valid) {
        return fail(400, "This start/end combination is not available for that date");
      }

      if (isSlotBlocked(startHour, endHour, existing)) {
        return fail(
          409,
          "This time range is no longer available (pending or confirmed overlap)"
        );
      }

      const booking = await BookingModel.createPending({
        userId: session.sub,
        hallId,
        date,
        startHour,
        endHour,
      });
      return ok({ booking });
    } catch (e) {
      console.error(e);
      return fail(500, "Server error");
    }
  },

  async mine(session: SessionPayload | null): Promise<ActionResult<{ bookings: unknown[] }>> {
    if (!session || !isCustomer(session.role)) return fail(401, "Unauthorized");
    const bookings = await BookingModel.listForUser(session.sub);
    return ok({ bookings });
  },

  async completed(session: SessionPayload | null): Promise<ActionResult<{ bookings: unknown[] }>> {
    if (!session || !isCustomer(session.role)) return fail(401, "Unauthorized");
    const all = await BookingModel.listConfirmedForUser(session.sub);
    const bookings = all.filter((b) => isBookingEndInPast(b.date, b.endHour));
    return ok({ bookings });
  },

  async weeklySchedule(
    session: SessionPayload | null,
    weekStartRaw: string | null
  ): Promise<ActionResult<{ weekStart: string; weekEnd: string; bookings: unknown[] }>> {
    if (!session || !isCustomer(session.role)) return fail(401, "Unauthorized");
    const { weekStart, weekEnd } = BookingController.weekScheduleRange(weekStartRaw);
    const bookings = await BookingModel.listForUserWeek(session.sub, weekStart, weekEnd);
    return ok({ weekStart, weekEnd, bookings });
  },
};

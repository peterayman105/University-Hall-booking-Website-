import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/constants";
import { isBookingEndInPast } from "@/lib/booking-time";

/**
 * Model: Booking — reservations and admin listing.
 */
export const BookingModel = {
  findBlockingForHallAndDate(hallId: string, date: string) {
    return prisma.booking.findMany({
      where: {
        hallId,
        date,
        status: { in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      },
      select: { startHour: true, endHour: true, status: true },
    });
  },

  findByIdWithHall(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: { hall: true },
    });
  },

  othersBlockingSameSlot(excludeBookingId: string, hallId: string, date: string) {
    return prisma.booking.findMany({
      where: {
        hallId,
        date,
        id: { not: excludeBookingId },
        status: { in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      },
      select: { startHour: true, endHour: true, status: true },
    });
  },

  createPending(data: {
    userId: string;
    hallId: string;
    date: string;
    startHour: number;
    endHour: number;
  }) {
    return prisma.booking.create({
      data: {
        ...data,
        status: BOOKING_STATUS.PENDING,
      },
      include: { hall: true },
    });
  },

  updateStatus(id: string, status: string, rejectReason?: string | null) {
    return prisma.$transaction(async (tx) => {
      if (status === BOOKING_STATUS.REJECTED) {
        try {
          await tx.booking.update({
            where: { id },
            data: {
              status,
              ...(rejectReason ? ({ rejectReason } as Record<string, string>) : {}),
            } as Record<string, unknown>,
          });
        } catch {
          try {
            await tx.$executeRaw`UPDATE "Booking" SET "status" = ${status}, "rejectReason" = ${
              rejectReason ?? null
            } WHERE "id" = ${id}`;
          } catch {
            await tx.booking.update({
              where: { id },
              data: { status },
            });
          }
        }
      } else {
        await tx.booking.update({
          where: { id },
          data: { status, rejectReason: null },
        });
      }
      return tx.booking.findUnique({
        where: { id },
        include: { user: true, hall: true },
      });
    });
  },

  listForUser(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      include: { hall: true },
      orderBy: [{ date: "desc" }, { startHour: "desc" }],
    });
  },

  listForAdmin(where: { status?: string }) {
    return prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        hall: true,
      },
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
    });
  },

  countByStatus(status: string) {
    return prisma.booking.count({ where: { status } });
  },

  /** Confirmed booking for this hall whose end time is already in the past (eligible to review). */
  async findEligibleForReview(userId: string, hallId: string) {
    const rows = await prisma.booking.findMany({
      where: { userId, hallId, status: BOOKING_STATUS.CONFIRMED },
      orderBy: [{ date: "desc" }, { endHour: "desc" }],
    });
    return rows.find((b) => isBookingEndInPast(b.date, b.endHour)) ?? null;
  },

  listConfirmedForUser(userId: string) {
    return prisma.booking.findMany({
      where: { userId, status: BOOKING_STATUS.CONFIRMED },
      include: { hall: true },
      orderBy: [{ date: "desc" }, { startHour: "desc" }],
    });
  },

  listForAdminWeek(weekStart: string, weekEnd: string) {
    return prisma.booking.findMany({
      where: {
        date: { gte: weekStart, lte: weekEnd },
        status: { in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        hall: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
    });
  },

  listForUserWeek(userId: string, weekStart: string, weekEnd: string) {
    return prisma.booking.findMany({
      where: {
        userId,
        date: { gte: weekStart, lte: weekEnd },
        status: { in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      },
      include: { hall: { select: { id: true, name: true } } },
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
    });
  },
};

import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/constants";

export type HallCreateInput = {
  name: string;
  capacity: number;
  hasProjector: boolean;
  hasAC: boolean;
  seatingType: string;
  pricePerHour: number;
  photoUrl: string | null;
};

/**
 * Model: Hall — CRUD and queries used for availability / assistant context.
 */
export const HallModel = {
  findAllOrdered() {
    return prisma.hall.findMany({ orderBy: { name: "asc" } });
  },

  findManyFiltered(where: Record<string, unknown>) {
    return prisma.hall.findMany({
      where,
      orderBy: { name: "asc" },
    });
  },

  async maxCapacity(): Promise<number> {
    const r = await prisma.hall.aggregate({ _max: { capacity: true } });
    const m = r._max.capacity;
    return m != null && m >= 1 ? m : 1;
  },

  findById(id: string) {
    return prisma.hall.findUnique({ where: { id } });
  },

  create(data: HallCreateInput) {
    return prisma.hall.create({ data });
  },

  update(id: string, data: Record<string, unknown>) {
    return prisma.hall.update({ where: { id }, data });
  },

  countBlockingBookings(hallId: string) {
    return prisma.booking.count({
      where: {
        hallId,
        status: { in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      },
    });
  },

  async deleteByIdIfSafe(hallId: string) {
    await prisma.review.deleteMany({ where: { hallId } });
    await prisma.booking.deleteMany({ where: { hallId } });
    return prisma.hall.delete({ where: { id: hallId } });
  },

  blockingBookingsForDay(hallId: string, date: string) {
    return prisma.booking.findMany({
      where: {
        hallId,
        date,
        status: { in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      },
      select: { startHour: true, endHour: true, status: true },
    });
  },

  snapshotForAssistant() {
    return prisma.hall.findMany({
      take: 15,
      select: {
        name: true,
        capacity: true,
        pricePerHour: true,
        hasProjector: true,
        hasAC: true,
        seatingType: true,
      },
    });
  },

  /** Full list for assistant search (all halls, ordered). */
  findAllForAssistantSearch() {
    return prisma.hall.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        capacity: true,
        pricePerHour: true,
        hasProjector: true,
        hasAC: true,
        seatingType: true,
      },
    });
  },
};

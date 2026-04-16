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
  photos: string[];
};

/**
 * Model: Hall — CRUD and queries used for availability / assistant context.
 */
export const HallModel = {
  findAllOrdered() {
    return prisma.hall.findMany({
      orderBy: { name: "asc" },
      include: {
        images: {
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  findManyFiltered(where: Record<string, unknown>) {
    return prisma.hall.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        images: {
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  async maxCapacity(): Promise<number> {
    const r = await prisma.hall.aggregate({ _max: { capacity: true } });
    const m = r._max.capacity;
    return m != null && m >= 1 ? m : 1;
  },

  findById(id: string) {
    return prisma.hall.findUnique({
      where: { id },
      include: {
        images: {
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  create(data: HallCreateInput) {
    return prisma.hall.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        hasProjector: data.hasProjector,
        hasAC: data.hasAC,
        seatingType: data.seatingType,
        pricePerHour: data.pricePerHour,
        photoUrl: data.photoUrl,
        images: {
          create: data.photos.map((url) => ({ url })),
        },
      },
      include: {
        images: {
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  update(id: string, data: Record<string, unknown>, photos?: string[]) {
    return prisma.hall.update({
      where: { id },
      data: {
        ...data,
        ...(photos
          ? {
              images: {
                deleteMany: {},
                create: photos.map((url) => ({ url })),
              },
            }
          : {}),
      },
      include: {
        images: {
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
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
        photoUrl: true,
        images: {
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
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
        photoUrl: true,
        images: {
          select: { url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },
};

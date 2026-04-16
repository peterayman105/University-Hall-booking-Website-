import { prisma } from "@/lib/prisma";
import { REVIEW_STATUS } from "@/lib/constants";

/**
 * Model: Review — moderation and hall page display.
 */
export const ReviewModel = {
  findApprovedByHall(hallId: string) {
    return prisma.review.findMany({
      where: { hallId, status: REVIEW_STATUS.APPROVED },
      include: { user: { select: { name: true, id: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  createPending(data: { userId: string; hallId: string; rating: number; comment: string }) {
    return prisma.review.create({
      data: {
        ...data,
        status: REVIEW_STATUS.PENDING,
      },
    });
  },

  listForAdmin(pendingOnly: boolean) {
    return prisma.review.findMany({
      where: pendingOnly ? { status: REVIEW_STATUS.PENDING } : undefined,
      include: {
        user: { select: { id: true, name: true, email: true } },
        hall: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  listForUser(userId: string) {
    return prisma.review.findMany({
      where: { userId },
      include: { hall: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  countPending() {
    return prisma.review.count({ where: { status: REVIEW_STATUS.PENDING } });
  },

  findById(id: string) {
    return prisma.review.findUnique({ where: { id } });
  },

  approve(id: string) {
    return prisma.review.update({
      where: { id },
      data: { status: REVIEW_STATUS.APPROVED },
      include: { user: true, hall: true },
    });
  },

  reject(id: string, rejectReason?: string | null) {
    return prisma.$transaction(async (tx) => {
      try {
        await tx.review.update({
          where: { id },
          data: {
            status: REVIEW_STATUS.REJECTED,
            ...(rejectReason ? ({ rejectReason } as Record<string, string>) : {}),
          } as Record<string, unknown>,
        });
      } catch {
        try {
          await tx.$executeRaw`UPDATE "Review" SET "status" = ${REVIEW_STATUS.REJECTED}, "rejectReason" = ${
            rejectReason ?? null
          } WHERE "id" = ${id}`;
        } catch {
          // Last fallback: reject without reason if runtime schema/client is stale.
          await tx.review.update({
            where: { id },
            data: { status: REVIEW_STATUS.REJECTED },
          });
        }
      }
      return tx.review.findUnique({
        where: { id },
        include: { user: true, hall: true },
      });
    });
  },
};

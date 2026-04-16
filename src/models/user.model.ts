import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

export const UserModel = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findByIdForAdmin(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByIdForMe(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photoUrl: true,
        createdAt: true,
      },
    });
  },

  async emailTaken(email: string) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return Boolean(u);
  },

  async emailTakenByOther(email: string, excludeUserId: string) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return Boolean(u && u.id !== excludeUserId);
  },

  countSuperadmins() {
    return prisma.user.count({ where: { role: ROLES.SUPERADMIN } });
  },

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    photoUrl?: string | null;
  }) {
    return prisma.user.create({ data });
  },

  async hashPassword(plain: string) {
    return bcrypt.hash(plain, 10);
  },

  verifyPassword(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  },

  updateById(
    id: string,
    data: { name?: string; email?: string; photoUrl?: string | null; role?: string }
  ) {
    return prisma.user.update({ where: { id }, data });
  },

  deleteById(id: string) {
    return prisma.user.delete({ where: { id } });
  },

  listWithBookingsForAdmin() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photoUrl: true,
        createdAt: true,
        bookings: {
          include: { hall: { select: { name: true, id: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  findForAdminListItem(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photoUrl: true,
        createdAt: true,
        bookings: {
          include: { hall: { select: { name: true, id: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  countCustomers() {
    return prisma.user.count({ where: { role: ROLES.CUSTOMER } });
  },
};

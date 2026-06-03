import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Meets app password policy (run seed after policy changes). */
const ADMIN_PASSWORD = "Admin1!demo";
const CUSTOMER_PASSWORD = "Customer1!demo";

async function main() {
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const customerHash = await bcrypt.hash(CUSTOMER_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: "admin@findyourspot.edu" },
    create: {
      email: "admin@findyourspot.edu",
      name: "Super Admin",
      passwordHash: adminHash,
      role: "SUPERADMIN",
    },
    update: {
      passwordHash: adminHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@findyourspot.edu" },
    create: {
      email: "customer@findyourspot.edu",
      name: "Demo Customer",
      passwordHash: customerHash,
      role: "CUSTOMER",
    },
    update: {
      passwordHash: customerHash,
    },
  });

  const hallRows = [
    { name: "A1", capacity: 25 },
    { name: "Hall1", capacity: 60 },
    { name: "B1", capacity: 55 },
    { name: "B2", capacity: 25 },
    { name: "B3", capacity: 50 },
    { name: "B4", capacity: 40 },
    { name: "B5", capacity: 50 },
    { name: "B6", capacity: 50 },
    { name: "B7", capacity: 25 },
    { name: "C1", capacity: 55 },
    { name: "C2", capacity: 25 },
    { name: "C3", capacity: 25 },
    { name: "C4", capacity: 25 },
    { name: "Hall2", capacity: 50 },
    { name: "C5", capacity: 35 },
    { name: "Hall3", capacity: 55 },
    { name: "C6", capacity: 25 },
    { name: "C7", capacity: 25 },
    { name: "C8", capacity: 25 },
    { name: "معمل 7", capacity: 60 },
    { name: "Hall4", capacity: 55 },
    { name: "معمل 6", capacity: 35 },
    { name: "Hall5", capacity: 55 },
  ];

  const canonicalNames = hallRows.map((r) => r.name);

  // Remove old demo halls that are not in the official list (only if they have no bookings).
  const staleHalls = await prisma.hall.findMany({
    where: { name: { notIn: canonicalNames } },
    include: { _count: { select: { bookings: true, reviews: true } } },
  });
  for (const hall of staleHalls) {
    if (hall._count.bookings === 0 && hall._count.reviews === 0) {
      await prisma.hall.delete({ where: { id: hall.id } });
    }
  }

  const seatingTypes = ["ESCALATED", "FLAT", "U_SHAPE"];
  const extrasOptions = [
    "Whiteboard + marker set",
    "Dual display screens",
    "Sound system with wireless mic",
    "Instructor desk and HDMI switch",
    "Fast campus Wi-Fi coverage",
    "Accessible entrance and wide aisles",
  ];

  for (const [idx, row] of hallRows.entries()) {
    const hallPhotos = [
      `https://picsum.photos/seed/${encodeURIComponent(row.name)}-1/1200/800`,
      `https://picsum.photos/seed/${encodeURIComponent(row.name)}-2/1200/800`,
      `https://picsum.photos/seed/${encodeURIComponent(row.name)}-3/1200/800`,
    ];

    const hallData = {
      name: row.name,
      capacity: row.capacity,
      hasProjector: idx % 2 === 0,
      hasAC: idx % 3 !== 0,
      seatingType: seatingTypes[idx % seatingTypes.length],
      pricePerHour: 0,
      photoUrl: hallPhotos[0],
      extras: extrasOptions[idx % extrasOptions.length],
    };

    const existing = await prisma.hall.findFirst({ where: { name: row.name } });
    if (!existing) {
      await prisma.hall.create({
        data: {
          ...hallData,
          images: {
            create: hallPhotos.map((url) => ({ url })),
          },
        },
      });
      continue;
    }

    await prisma.hall.update({
      where: { id: existing.id },
      data: {
        ...hallData,
        images: {
          deleteMany: {},
          create: hallPhotos.map((url) => ({ url })),
        },
      },
    });
  }

  const hallCount = await prisma.hall.count();
  console.log(
    `Seed OK — ${hallCount} halls in database — admin@findyourspot.edu / ${ADMIN_PASSWORD}, customer@findyourspot.edu / ${CUSTOMER_PASSWORD}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

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

  const halls = [
    {
      name: "Lecture Hall A",
      capacity: 120,
      hasProjector: true,
      hasAC: true,
      seatingType: "ESCALATED",
      pricePerHour: 350,
      photoUrl:
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    },
    {
      name: "Seminar Room B12",
      capacity: 40,
      hasProjector: true,
      hasAC: true,
      seatingType: "FLAT",
      pricePerHour: 180,
      photoUrl:
        "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
    },
    {
      name: "Training Lab C5",
      capacity: 28,
      hasProjector: false,
      hasAC: true,
      seatingType: "FLAT",
      pricePerHour: 120,
      photoUrl:
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
    },
    {
      name: "Auditorium East",
      capacity: 280,
      hasProjector: true,
      hasAC: false,
      seatingType: "ESCALATED",
      pricePerHour: 520,
      photoUrl:
        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
    },
  ];

  for (const h of halls) {
    const existing = await prisma.hall.findFirst({ where: { name: h.name } });
    if (!existing) {
      await prisma.hall.create({ data: h });
    }
  }

  console.log(
    `Seed OK — admin@findyourspot.edu / ${ADMIN_PASSWORD}, customer@findyourspot.edu / ${CUSTOMER_PASSWORD}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

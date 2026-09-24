import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.siteSetting.upsert({
    where: { key: "business.name" },
    update: { value: "African Bison Classic Tours" },
    create: { key: "business.name", value: "African Bison Classic Tours" },
  });

  await prisma.siteSetting.upsert({
    where: { key: "business.city" },
    update: { value: "Nairobi, Kenya" },
    create: { key: "business.city", value: "Nairobi, Kenya" },
  });

  await prisma.siteSetting.upsert({
    where: { key: "business.address" },
    update: { value: "JKIA Airport, 1st Floor, Suite 1" },
    create: { key: "business.address", value: "JKIA Airport, 1st Floor, Suite 1" },
  });

  // Contact details below mirror the live site at time of migration review.
  // They are seeded as configurable settings, not hard-coded constants.
  await prisma.siteSetting.upsert({
    where: { key: "business.phonePrimary" },
    update: { value: "+254734466432" },
    create: { key: "business.phonePrimary", value: "+254734466432" },
  });

  await prisma.siteSetting.upsert({
    where: { key: "business.phoneSecondary" },
    update: { value: "+254111234567" },
    create: { key: "business.phoneSecondary", value: "+254111234567" },
  });

  await prisma.siteSetting.upsert({
    where: { key: "business.email" },
    update: { value: "info@africanbisonclassictours.com" },
    create: { key: "business.email", value: "info@africanbisonclassictours.com" },
  });

  console.log("Phase 0 seed complete: business settings upserted.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

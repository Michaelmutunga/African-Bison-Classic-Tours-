import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Under Vitest (NODE_ENV=test) the suite points at the isolated test
  // database. Production and development always use DATABASE_URL.
  if (process.env.NODE_ENV === "test" && process.env.TEST_DATABASE_URL) {
    return new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

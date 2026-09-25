import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// NOTE: plain-node context (no next/* imports allowed here).
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Playwright global setup: staff fixtures in the DEVELOPMENT database.
 * Clearly-marked fake accounts used only by e2e (Phase 3).
 */
export const E2E_ADMIN = {
  email: "phase3-e2e-admin@example.com",
  password: "E2E-Admin-Password-123!",
  role: "ADMIN" as const,
};

export const E2E_CONSULTANT = {
  email: "phase3-e2e-consultant@example.com",
  password: "E2E-Consultant-Password-123!",
  role: "SAFARI_CONSULTANT" as const,
};

async function setup() {
  config({ path: ".env" });
  const prisma = new PrismaClient();
  try {
    for (const account of [E2E_ADMIN, E2E_CONSULTANT]) {
      await prisma.user.upsert({
        where: { email: account.email },
        update: {
          role: account.role,
          isActive: true,
          passwordHash: await hashPassword(account.password),
        },
        create: {
          email: account.email,
          name: "E2E Staff Fixture",
          role: account.role,
          passwordHash: await hashPassword(account.password),
        },
      });
    }
    console.log("E2E staff fixtures ready.");
  } finally {
    await prisma.$disconnect();
  }
}

export default setup;

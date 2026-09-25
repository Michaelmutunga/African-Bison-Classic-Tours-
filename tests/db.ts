import type { Role } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/server/catalogue";

export function testActor(role: Role): Actor {
  return { id: `test-actor-${role}`, role };
}

let counter = 0;

/** Unique slug prefix per test so suites can run without collisions. */
export function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export async function createTestUser(email: string, role: Role, password = "Test-Password-123!") {
  return prisma.user.upsert({
    where: { email },
    update: { role, isActive: true, passwordHash: await hashPassword(password) },
    create: {
      email,
      name: "Test User",
      role,
      passwordHash: await hashPassword(password),
    },
  });
}

export { prisma as testPrisma };

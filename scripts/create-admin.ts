/*
 * Create or promote a staff user. Production must run this with a strong,
 * unique password supplied via environment — never commit credentials.
 *
 * Usage:
 *   ADMIN_EMAIL="ops@example.com" ADMIN_PASSWORD="..." ADMIN_NAME="Ops" \
 *     npx tsx scripts/create-admin.ts [--role ADMIN]
 */
import { hashPassword } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { STAFF_ROLES } from "../lib/auth.js";
import type { Role } from "@prisma/client";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME?.trim() || "Operations";
  const roleArg = process.argv.find((arg) => arg.startsWith("--role="))?.split("=")[1];
  const role: Role =
    roleArg && (STAFF_ROLES as string[]).includes(roleArg) ? (roleArg as Role) : "ADMIN";

  if (!email || !email.includes("@")) {
    console.error("Set a valid ADMIN_EMAIL before running create-admin.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Set ADMIN_PASSWORD with at least 12 characters.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, isActive: true, passwordHash },
    create: { email, name, role, passwordHash },
  });
  console.log(`Staff user ready: ${user.email} (${user.role}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

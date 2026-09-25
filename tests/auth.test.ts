import { describe, expect, it } from "vitest";
import {
  createSession,
  destroySession,
  getUserFromToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createTestUser, unique } from "@/tests/db";

describe("password hashing", () => {
  it("verifies correct passwords and rejects wrong ones", async () => {
    const hash = await hashPassword("Correct-Horse-123!");
    expect(await verifyPassword("Correct-Horse-123!", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("salts identical passwords differently", async () => {
    const a = await hashPassword("same-password-123");
    const b = await hashPassword("same-password-123");
    expect(a).not.toBe(b);
  });
});

describe("sessions", () => {
  it("creates, resolves and destroys sessions", async () => {
    const email = `${unique("session")}@example.com`;
    const user = await createTestUser(email, "CONTENT_MANAGER");
    const { token } = await createSession(user.id);
    const resolved = await getUserFromToken(token);
    expect(resolved?.email).toBe(email);
    expect(resolved?.role).toBe("CONTENT_MANAGER");
    await destroySession(token);
    expect(await getUserFromToken(token)).toBeNull();
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("rejects expired sessions and inactive users", async () => {
    const email = `${unique("expired")}@example.com`;
    const user = await createTestUser(email, "ADMIN");
    const { token } = await createSession(user.id);
    const db = prisma;
    const session = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await getUserFromToken(token)).toBeNull();

    const { token: token2 } = await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect(await getUserFromToken(token2)).toBeNull();
    await db.user.delete({ where: { id: user.id } });
  });

  it("returns null for unknown tokens", async () => {
    expect(await getUserFromToken("not-a-real-token")).toBeNull();
    expect(await getUserFromToken(null)).toBeNull();
  });
});

describe("permission matrix", () => {
  it("grants catalogue.read to everyone, including anonymous", () => {
    expect(hasPermission(undefined, "catalogue.read")).toBe(true);
    expect(hasPermission("CUSTOMER", "catalogue.read")).toBe(true);
  });

  it("restricts writes to content roles", () => {
    expect(hasPermission("ADMIN", "catalogue.write")).toBe(true);
    expect(hasPermission("CONTENT_MANAGER", "catalogue.write")).toBe(true);
    expect(hasPermission("SAFARI_CONSULTANT", "catalogue.write")).toBe(false);
    expect(hasPermission("CUSTOMER", "catalogue.write")).toBe(false);
    expect(hasPermission(undefined, "catalogue.write")).toBe(false);
  });

  it("restricts publishing separately from writing", () => {
    expect(hasPermission("CONTENT_MANAGER", "catalogue.publish")).toBe(true);
    expect(hasPermission("RESERVATION_STAFF", "catalogue.publish")).toBe(false);
  });

  it("restricts user management to admins", () => {
    expect(hasPermission("ADMIN", "users.manage")).toBe(true);
    expect(hasPermission("CONTENT_MANAGER", "users.manage")).toBe(false);
  });
});

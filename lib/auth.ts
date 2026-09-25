import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ForbiddenError,
  UnauthorizedError,
  hasPermission,
  type Permission,
} from "@/lib/permissions";

export const SESSION_COOKIE = "bison_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const BCRYPT_ROUNDS = 12;

export type SafeUser = Pick<User, "id" | "email" | "name" | "role" | "isActive">;

export function toSafeUser(user: User): SafeUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function getUserFromToken(token: string | null | undefined): Promise<SafeUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return toSafeUser(session.user);
}

export async function destroySession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { tokenHash: hashToken(token) } }).catch(() => undefined);
}

export async function currentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  return getUserFromToken(store.get(SESSION_COOKIE)?.value);
}

/** Server-side gate: throws 401 without a session, 403 without the permission. */
export async function requirePermission(permission: Permission): Promise<SafeUser> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  if (!hasPermission(user.role, permission)) throw new ForbiddenError(permission);
  return user;
}

export function sessionCookieHeader(token: string, expiresAt: Date): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Expires=${expiresAt.toUTCString()}`;
}

export function clearedSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export const STAFF_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CONTENT_MANAGER",
  "SAFARI_CONSULTANT",
  "RESERVATION_STAFF",
  "OPERATIONS_MANAGER",
  "FINANCE_USER",
];

import type { Role } from "@prisma/client";

/**
 * Explicit permission matrix. Every protected action checks these
 * server-side; UI hiding is never the enforcement mechanism.
 *
 * Role mapping for the marketplace model:
 * - super admin  → SUPER_ADMIN (everything, including finance)
 * - admin       → ADMIN (everything; operational owner)
 * - booking agent → SAFARI_CONSULTANT / RESERVATION_STAFF / OPERATIONS_MANAGER
 *   (sell and operate trips, but NEVER see supplier cost, markup or margin)
 * - finance     → FINANCE_USER (reads money, settles payouts, no booking writes)
 * - read-only   → CONTENT_MANAGER outside catalogue (no finance, no bookings)
 * - customer    → CUSTOMER (own data only, via portal ownership gates)
 */
export const PERMISSIONS = [
  "catalogue.read",
  "catalogue.write",
  "catalogue.publish",
  "inquiries.read",
  "bookings.write",
  "finance.read",
  "users.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ["catalogue.read", "catalogue.write", "catalogue.publish", "inquiries.read", "bookings.write", "finance.read", "users.manage"],
  ADMIN: ["catalogue.read", "catalogue.write", "catalogue.publish", "inquiries.read", "bookings.write", "finance.read", "users.manage"],
  CONTENT_MANAGER: ["catalogue.read", "catalogue.write", "catalogue.publish"],
  SAFARI_CONSULTANT: ["catalogue.read", "inquiries.read", "bookings.write"],
  RESERVATION_STAFF: ["catalogue.read", "inquiries.read", "bookings.write"],
  OPERATIONS_MANAGER: ["catalogue.read", "inquiries.read", "bookings.write"],
  FINANCE_USER: ["catalogue.read", "finance.read"],
  CUSTOMER: ["catalogue.read"],
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  // Public catalogue reads are open; everything else needs an explicit grant.
  if (permission === "catalogue.read") return true;
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Cost, markup and margin data: super admin, admin and finance only. */
export function canSeeFinance(role: Role | null | undefined): boolean {
  return hasPermission(role, "finance.read");
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
  }
}

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Authentication required");
  }
}

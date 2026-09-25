import type { Role } from "@prisma/client";

/**
 * Explicit permission matrix (Phase 3). Every protected action checks these
 * server-side; UI hiding is never the enforcement mechanism.
 */
export const PERMISSIONS = [
  "catalogue.read",
  "catalogue.write",
  "catalogue.publish",
  "inquiries.read",
  "users.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ["catalogue.read", "catalogue.write", "catalogue.publish", "inquiries.read", "users.manage"],
  ADMIN: ["catalogue.read", "catalogue.write", "catalogue.publish", "inquiries.read", "users.manage"],
  CONTENT_MANAGER: ["catalogue.read", "catalogue.write", "catalogue.publish"],
  SAFARI_CONSULTANT: ["catalogue.read", "inquiries.read"],
  RESERVATION_STAFF: ["catalogue.read", "inquiries.read"],
  OPERATIONS_MANAGER: ["catalogue.read", "inquiries.read"],
  FINANCE_USER: ["catalogue.read"],
  CUSTOMER: ["catalogue.read"],
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  // Public catalogue reads are open; everything else needs an explicit grant.
  if (permission === "catalogue.read") return true;
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
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

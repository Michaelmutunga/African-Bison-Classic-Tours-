/**
 * Minimal in-memory throttle (single instance). Counts per key inside a
 * rolling window. A distributed limiter lands with hardening (Phase 14).
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function throttled(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

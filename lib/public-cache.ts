/**
 * Tiny cross-request cache for hot public reads (tour catalogue, post
 * summaries). Every public page render hits these; without sharing, a burst
 * of N concurrent renders issues N identical full-table scans and saturates
 * the database pool.
 *
 * - 30s TTL bounds CMS staleness (admin edits appear within seconds —
 *   ISR-style freshness, documented in docs/PERFORMANCE.md if added).
 * - In-flight deduplication: concurrent renders share one loader promise.
 * - Errors are never cached.
 * - Bypassed entirely under NODE_ENV=test so integration tests see fresh
 *   writes immediately.
 */

const TTL_MS = 30_000;

interface Entry<T> {
  expires: number;
  value: T | undefined;
  inflight: Promise<T> | null;
}

const store = new Map<string, Entry<unknown>>();

export async function cachedPublic<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "test") return loader();
  const now = Date.now();
  const existing = store.get(key);
  if (existing) {
    if (existing.expires > now && existing.value !== undefined) {
      return existing.value as T;
    }
    if (existing.inflight) return existing.inflight as Promise<T>;
  }
  const inflight: Promise<T> = loader().then(
    (value) => {
      store.set(key, { expires: Date.now() + TTL_MS, value, inflight: null });
      return value;
    },
    (error: unknown) => {
      // Drop the entry so the next request retries instead of sticking.
      if (store.get(key)?.inflight === inflight) store.delete(key);
      throw error;
    },
  );
  store.set(key, { expires: 0, value: undefined, inflight: inflight as Promise<unknown> });
  return inflight;
}

export function invalidatePublic(key: string): void {
  store.delete(key);
}

/** Test/dev escape hatch — not used in production code paths. */
export function clearPublicCache(): void {
  store.clear();
}

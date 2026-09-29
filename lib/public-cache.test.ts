import { afterEach, describe, expect, it, vi } from "vitest";
import { cachedPublic, clearPublicCache, invalidatePublic } from "@/lib/public-cache";

afterEach(() => {
  clearPublicCache();
  vi.unstubAllEnvs();
});

describe("cachedPublic", () => {
  it("bypasses the cache under NODE_ENV=test so tests see fresh writes", async () => {
    vi.stubEnv("NODE_ENV", "test");
    let calls = 0;
    const loader = async () => (++calls).toString();
    await expect(cachedPublic("k", loader)).resolves.toBe("1");
    await expect(cachedPublic("k", loader)).resolves.toBe("2");
  });

  it("shares one loader across concurrent callers and caches within TTL", async () => {
    vi.stubEnv("NODE_ENV", "development");
    let calls = 0;
    const loader = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return { n: calls };
    };
    const [a, b, c] = await Promise.all([
      cachedPublic("burst", loader),
      cachedPublic("burst", loader),
      cachedPublic("burst", loader),
    ]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
    await expect(cachedPublic("burst", loader)).resolves.toBe(a);
    expect(calls).toBe(1);
  });

  it("never caches errors and invalidates on demand", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await expect(cachedPublic("bad", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    let calls = 0;
    await expect(
      cachedPublic("bad", async () => {
        calls += 1;
        return calls;
      }),
    ).resolves.toBe(1);
    invalidatePublic("bad");
    await expect(
      cachedPublic("bad", async () => {
        calls += 1;
        return calls;
      }),
    ).resolves.toBe(2);
  });
});

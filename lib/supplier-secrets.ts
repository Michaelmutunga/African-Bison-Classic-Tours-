import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Supplier payout-detail encryption (Phase 2). Bank/M-Pesa details are
 * encrypted at rest with AES-256-GCM; the UI only ever sees `payoutHint`.
 *
 * Key: SUPPLIER_PII_KEY env var, 64 hex chars (32 bytes).
 * Generate with: openssl rand -hex 32
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export class SupplierSecretError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

export function supplierPiiKey(): Buffer {
  const raw = process.env.SUPPLIER_PII_KEY;
  if (!raw) {
    throw new SupplierSecretError(
      "SUPPLIER_PII_KEY is not configured. Generate one with: openssl rand -hex 32",
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new SupplierSecretError("SUPPLIER_PII_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(raw, "hex");
}

/** Encrypt payout details. Returns an opaque "v1:iv:tag:cipher" payload. */
export function encryptSecret(plaintext: string, key: Buffer = supplierPiiKey()): string {
  if (key.length !== 32) throw new SupplierSecretError("Encryption key must be 32 bytes");
  const clean = plaintext.trim();
  if (clean.length < 1 || clean.length > 2000) {
    throw new SupplierSecretError("Payout details must be 1–2000 characters");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/** Decrypt a payload from encryptSecret. Throws on tampering/wrong key. */
export function decryptSecret(payload: string, key: Buffer = supplierPiiKey()): string {
  if (key.length !== 32) throw new SupplierSecretError("Encryption key must be 32 bytes");
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new SupplierSecretError("Malformed encrypted payload");
  }
  try {
    const iv = Buffer.from(parts[1] ?? "", "base64");
    const tag = Buffer.from(parts[2] ?? "", "base64");
    const data = Buffer.from(parts[3] ?? "", "base64");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    throw new SupplierSecretError("Could not decrypt payout details (wrong key or tampered data)");
  }
}

/** Hash a single-purpose supplier token for storage (plaintext never stored). */
export function hashSupplierToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintSupplierToken(): string {
  return `supt_${randomBytes(24).toString("hex")}`;
}

export function tokensEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

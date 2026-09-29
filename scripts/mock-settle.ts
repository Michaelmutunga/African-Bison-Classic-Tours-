/*
 * Settle a PENDING mock-provider payment from the command line (local
 * manual testing of the Phase-7 payment flow without crafting webhooks).
 *
 * Usage: npm run payments:settle -- <providerRef> [succeeded|failed]
 *
 * The signature scheme mirrors MockProvider: HMAC-SHA256 over the raw body
 * with MOCK_PROVIDER_SECRET (or the "dev-mock-secret" development default).
 */
import { createHmac } from "node:crypto";

async function main() {
  const providerRef = process.argv[2];
  const type = process.argv[3] === "failed" ? "failed" : "succeeded";
  if (!providerRef) {
    console.error("Usage: npm run payments:settle -- <providerRef> [succeeded|failed]");
    process.exit(1);
  }
  const secret = process.env.MOCK_PROVIDER_SECRET ?? "dev-mock-secret";
  const body = JSON.stringify({ providerRef, type });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  const response = await fetch(`${base}/api/payments/webhook/mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mock-signature": signature },
    body,
  });
  console.log(`webhook -> ${response.status}`);
  console.log(JSON.stringify(await response.json(), null, 2));
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

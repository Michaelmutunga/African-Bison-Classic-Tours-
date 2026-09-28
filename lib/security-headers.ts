/**
 * HTTP security headers (Phase 14). Defined here — not inline in
 * next.config.ts — so the contract is unit-testable. The production CSP is
 * pragmatic: App Router embeds React Flight data in inline scripts and
 * React sets inline style attributes, so script/style 'unsafe-inline' is
 * required. No third-party scripts, trackers or embeds exist, so nothing
 * external is allowlisted. The dev policy additionally allows 'unsafe-eval'
 * (webpack dev-mode evaluates modules with eval) and is never shipped.
 */
export interface SecurityHeader {
  key: string;
  value: string;
}

function policy(scriptSrc: string): string {
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export const contentSecurityPolicy = policy("script-src 'self' 'unsafe-inline'");
export const devContentSecurityPolicy = policy("script-src 'self' 'unsafe-inline' 'unsafe-eval'");

const securityHeadersBase: SecurityHeader[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Ignored by browsers over plain HTTP (local dev); enforced behind
  // Railway's TLS in production.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

function withPolicy(csp: string): SecurityHeader[] {
  return [{ key: "Content-Security-Policy", value: csp }, ...securityHeadersBase];
}

export const securityHeaders: SecurityHeader[] = withPolicy(contentSecurityPolicy);
export const devSecurityHeaders: SecurityHeader[] = withPolicy(devContentSecurityPolicy);

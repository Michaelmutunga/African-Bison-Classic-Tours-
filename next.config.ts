import type { NextConfig } from "next";
import { devSecurityHeaders, securityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: __dirname,
  // Playwright serves tests from 127.0.0.1; allow dev assets cross-origin.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    // `next dev` evaluates webpack modules with eval(), so development
    // serves the eval-tolerant policy; production always serves the strict one.
    const headers = process.env.NODE_ENV === "production" ? securityHeaders : devSecurityHeaders;
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;

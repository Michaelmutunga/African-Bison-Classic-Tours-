import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: __dirname,
  // Playwright serves tests from 127.0.0.1; allow dev assets cross-origin.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

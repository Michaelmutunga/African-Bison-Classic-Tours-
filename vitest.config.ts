import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    // Generous on constrained machines; jsdom + axe suites are slow here.
    testTimeout: 30_000,
    globalSetup: ["./tests/global-setup.ts"],
    environmentMatchGlobs: [
      ["components/**/*.test.{ts,tsx}", "jsdom"],
      ["app/**/*.test.{ts,tsx}", "jsdom"],
    ],
    include: [
      "tests/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
      "server/**/*.{test,spec}.{ts,tsx}",
      "components/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
    ],
    setupFiles: ["./tests/setup.ts"],
  },
});

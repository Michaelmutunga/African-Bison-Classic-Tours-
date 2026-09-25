import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

/**
 * Vitest global setup: provisions an isolated `bison_test` database and
 * applies migrations. Never touches the development database.
 */
export default async function setup() {
  config({ path: ".env" });
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) throw new Error("DATABASE_URL must be set for test setup");
  const testUrl =
    process.env.TEST_DATABASE_URL ??
    devUrl.replace(/\/[^/?]+(\?|$)/, "/bison_test$1");
  process.env.TEST_DATABASE_URL = testUrl;

  const maintenanceUrl = testUrl.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const maintenance = new PrismaClient({ datasourceUrl: maintenanceUrl });
  try {
    await maintenance.$executeRawUnsafe(`CREATE DATABASE "bison_test"`);
    console.log("Created bison_test database.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("already exists")) throw error;
  } finally {
    await maintenance.$disconnect();
  }

  // Invoke the Prisma CLI through node directly: `npx` is a .cmd shim that
  // child_process cannot spawn without a shell on Windows.
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, DATABASE_URL: testUrl },
      stdio: "inherit",
    },
  );
}

export async function teardown() {}

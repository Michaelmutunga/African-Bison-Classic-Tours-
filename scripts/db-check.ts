import { prisma } from "../lib/prisma.js";

async function main() {
  await prisma.$queryRawUnsafe("SELECT 1");
  console.log("DB reachable");
}

main()
  .catch((error) => {
    console.log(`DB FAIL: ${(error as Error).message.split("\n")[0]}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

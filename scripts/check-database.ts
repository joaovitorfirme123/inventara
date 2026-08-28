import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function checkDatabase() {
  const [result] = await prisma.$queryRaw<Array<{ connection_ok: number }>>`
    SELECT 1 AS connection_ok
  `;

  if (result?.connection_ok !== 1) {
    throw new Error("PostgreSQL returned an unexpected result.");
  }

  console.log("Database connection verified through Prisma Client.");
}

checkDatabase()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

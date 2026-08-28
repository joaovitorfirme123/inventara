import "dotenv/config";
import { listUsersByOrganization } from "../src/data/users";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";

function hasPrismaCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

async function expectPrismaError(
  operation: () => Promise<unknown>,
  expectedCode: string,
) {
  try {
    await operation();
  } catch (error: unknown) {
    if (hasPrismaCode(error, expectedCode)) {
      return;
    }

    throw error;
  }

  throw new Error(`Expected Prisma error ${expectedCode}.`);
}

async function testTenancy() {
  const [usersA, usersB] = await Promise.all([
    listUsersByOrganization(organizationAId),
    listUsersByOrganization(organizationBId),
  ]);

  if (
    usersA.length !== 1 ||
    usersA[0].email !== "ana@alfa.test" ||
    usersA.some((user) => user.organizationId !== organizationAId)
  ) {
    throw new Error("Organization A received data from another tenant.");
  }

  if (
    usersB.length !== 1 ||
    usersB[0].email !== "bruno@beta.test" ||
    usersB.some((user) => user.organizationId !== organizationBId)
  ) {
    throw new Error("Organization B received data from another tenant.");
  }

  await expectPrismaError(
    () =>
      prisma.user.create({
        data: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          name: "Duplicate primary key",
          email: "duplicate-pk@test.invalid",
          organizationId: organizationAId,
        },
      }),
    "P2002",
  );

  await expectPrismaError(
    () =>
      prisma.user.create({
        data: {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          name: "Invalid organization",
          email: "invalid-fk@test.invalid",
          organizationId: "99999999-9999-4999-8999-999999999999",
        },
      }),
    "P2003",
  );

  console.log("PK, FK, and tenant isolation checks passed.");
}

testTenancy()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

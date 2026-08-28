import "dotenv/config";
import {
  getProductFilterOptions,
  listProducts,
  PRODUCT_PAGE_SIZE,
} from "../src/data/products";
import { getProductDetailsByPlu } from "../src/data/stock-history";
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

async function testDuplicatePlu() {
  try {
    await prisma.product.create({
      data: {
        organizationId: organizationAId,
        plu: "1000",
        description: "PLU duplicado",
      },
    });
  } catch (error: unknown) {
    if (hasPrismaCode(error, "P2002")) {
      return;
    }

    throw error;
  }

  throw new Error("Duplicate PLU was accepted in the same organization.");
}

async function testProducts() {
  const [pageOne, pageTwo, betaProducts] = await Promise.all([
    listProducts({ organizationId: organizationAId, page: 1 }),
    listProducts({ organizationId: organizationAId, page: 2 }),
    listProducts({ organizationId: organizationBId, page: 1 }),
  ]);

  if (
    pageOne.products.length !== PRODUCT_PAGE_SIZE ||
    pageTwo.products.length === 0 ||
    pageOne.products.some(
      (product) => product.organizationId !== organizationAId,
    ) ||
    betaProducts.products.some(
      (product) => product.organizationId !== organizationBId,
    )
  ) {
    throw new Error("Pagination or organization isolation failed.");
  }

  const [alfaPlu, betaPlu] = await Promise.all([
    getProductDetailsByPlu(organizationAId, "1000"),
    getProductDetailsByPlu(organizationBId, "1000"),
  ]);

  if (!alfaPlu || !betaPlu || alfaPlu.id === betaPlu.id) {
    throw new Error("The same PLU was not isolated between organizations.");
  }

  const searches = await Promise.all([
    listProducts({ organizationId: organizationAId, page: 1, query: "Arroz" }),
    listProducts({ organizationId: organizationAId, page: 1, query: "1001" }),
    listProducts({
      organizationId: organizationAId,
      page: 1,
      query: "7890000000002",
    }),
    listProducts({
      organizationId: organizationAId,
      page: 1,
      section: "Bebidas",
    }),
    listProducts({
      organizationId: organizationAId,
      page: 1,
      group: "Laticínios",
    }),
    listProducts({
      organizationId: organizationAId,
      page: 1,
      subgroup: "Higiene do lar",
    }),
  ]);

  if (searches.some((result) => result.total === 0)) {
    throw new Error("A product search or filter returned no test records.");
  }

  const [sectionOptions, groupOptions] = await Promise.all([
    getProductFilterOptions(organizationAId, { section: "Mercearia" }),
    getProductFilterOptions(organizationAId, {
      section: "Mercearia",
      group: "Alimentos",
    }),
  ]);

  if (
    sectionOptions.groups.join(",") !== "Alimentos,Lanches" ||
    groupOptions.subgroups.join(",") !== "Secos"
  ) {
    throw new Error("Dependent product filter options are incorrect.");
  }

  await testDuplicatePlu();
  console.log("Product uniqueness, pagination, search, filters, and isolation passed.");
}

testProducts()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";

const organizations = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Organização Alfa",
    user: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Ana Alfa",
      email: "ana@alfa.test",
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Organização Beta",
    user: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Bruno Beta",
      email: "bruno@beta.test",
    },
  },
] as const;

const demoOrganization = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Inventara Demo",
  user: {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    name: "Marina Demo",
    email: "demo@inventara.test",
  },
} as const;

const demoProducts = [
  {
    plu: "DEMO-1001",
    barcode: "7900000001001",
    description: "Grão Aurora 1kg",
    section: "Mercearia",
    group: "Cereais",
    subgroup: "Grãos",
    lastInventory: "2026-08-25",
    previousStock: "18",
    currentStock: "24",
  },
  {
    plu: "DEMO-1002",
    barcode: "7900000001002",
    description: "Café Nebulosa 500g",
    section: "Mercearia",
    group: "Bebidas quentes",
    subgroup: "Cafés",
    lastInventory: "2026-08-22",
    previousStock: "11",
    currentStock: "7",
  },
  {
    plu: "DEMO-1003",
    barcode: "7900000001003",
    description: "Massa Orbit 500g",
    section: "Mercearia",
    group: "Massas",
    subgroup: "Secas",
    lastInventory: null,
    previousStock: "30",
    currentStock: "30",
  },
  {
    plu: "DEMO-1004",
    barcode: "7900000001004",
    description: "Biscoito Prisma 300g",
    section: "Mercearia",
    group: "Lanches",
    subgroup: "Biscoitos",
    lastInventory: "2026-07-10",
    previousStock: "6",
    currentStock: "15",
  },
  {
    plu: "DEMO-1005",
    barcode: "7900000001005",
    description: "Leite Lunar 1L",
    section: "Frios",
    group: "Laticínios",
    subgroup: "Leites",
    lastInventory: "2026-08-18",
    previousStock: "20",
    currentStock: "12",
  },
  {
    plu: "DEMO-1006",
    barcode: "7900000001006",
    description: "Queijo Brisa 300g",
    section: "Frios",
    group: "Laticínios",
    subgroup: "Queijos",
    lastInventory: "2026-08-05",
    previousStock: "9",
    currentStock: "9",
  },
  {
    plu: "DEMO-1007",
    barcode: "7900000001007",
    description: "Suco Solar 1L",
    section: "Bebidas",
    group: "Sucos",
    subgroup: "Prontos",
    lastInventory: null,
    previousStock: "14",
    currentStock: "22",
  },
  {
    plu: "DEMO-1008",
    barcode: "7900000001008",
    description: "Água Estelar 500ml",
    section: "Bebidas",
    group: "Águas",
    subgroup: "Sem gás",
    lastInventory: "2026-07-01",
    previousStock: "40",
    currentStock: "28",
  },
  {
    plu: "DEMO-1009",
    barcode: "7900000001009",
    description: "Limpador Cometa 500ml",
    section: "Limpeza",
    group: "Superfícies",
    subgroup: "Multiuso",
    lastInventory: "2026-08-26",
    previousStock: "8",
    currentStock: "16",
  },
  {
    plu: "DEMO-1010",
    barcode: "7900000001010",
    description: "Sabão Atlas 1kg",
    section: "Limpeza",
    group: "Lavanderia",
    subgroup: "Em pó",
    lastInventory: "2026-06-15",
    previousStock: "13",
    currentStock: "5",
  },
  {
    plu: "DEMO-1011",
    barcode: "7900000001011",
    description: "Papel Nuvem 2un",
    section: "Casa",
    group: "Descartáveis",
    subgroup: "Papéis",
    lastInventory: null,
    previousStock: "17",
    currentStock: "17",
  },
  {
    plu: "DEMO-1012",
    barcode: "7900000001012",
    description: "Esponja Prisma 3un",
    section: "Casa",
    group: "Acessórios",
    subgroup: "Cozinha",
    lastInventory: "2026-08-12",
    previousStock: "4",
    currentStock: "10",
  },
] as const;

const productNames = [
  "Arroz integral",
  "Feijão carioca",
  "Macarrão espaguete",
  "Farinha de trigo",
  "Açúcar cristal",
  "Café torrado",
  "Leite integral",
  "Queijo muçarela",
  "Iogurte natural",
  "Manteiga sem sal",
  "Detergente neutro",
  "Sabão em pó",
  "Limpador multiuso",
  "Esponja dupla face",
  "Papel toalha",
  "Água mineral",
  "Suco de laranja",
  "Refrigerante cola",
  "Chá mate",
  "Água de coco",
  "Biscoito integral",
  "Chocolate ao leite",
  "Granola tradicional",
  "Castanha de caju",
  "Batata chips",
] as const;

const sections = [
  { section: "Mercearia", group: "Alimentos", subgroup: "Secos" },
  { section: "Frios", group: "Laticínios", subgroup: "Refrigerados" },
  { section: "Limpeza", group: "Casa", subgroup: "Higiene do lar" },
  { section: "Bebidas", group: "Bebidas", subgroup: "Não alcoólicas" },
  { section: "Mercearia", group: "Lanches", subgroup: "Snacks" },
] as const;

async function seed() {
  const seedPassword = process.env.SEED_USER_PASSWORD;

  if (!seedPassword || seedPassword.length < 8) {
    throw new Error("SEED_USER_PASSWORD must contain at least 8 characters.");
  }

  const password = await hashPassword(seedPassword);
  const demoPassword = await hashPassword(
    process.env.DEMO_USER_PASSWORD ?? seedPassword,
  );

  for (const organization of organizations) {
    await prisma.organization.upsert({
      where: { id: organization.id },
      update: { name: organization.name },
      create: {
        id: organization.id,
        name: organization.name,
      },
    });

    await prisma.user.upsert({
      where: { email: organization.user.email },
      update: {
        name: organization.user.name,
        role: "OWNER",
        isActive: true,
        organizationId: organization.id,
      },
      create: {
        ...organization.user,
        organizationId: organization.id,
        role: "OWNER",
      },
    });

    await prisma.account.upsert({
      where: {
        issuer_accountId: {
          issuer: "local:credential",
          accountId: organization.user.id,
        },
      },
      update: { password },
      create: {
        issuer: "local:credential",
        accountId: organization.user.id,
        providerId: "credential",
        userId: organization.user.id,
        password,
      },
    });
  }

  for (const [index, description] of productNames.entries()) {
    const category = sections[index % sections.length];
    const plu = String(1000 + index);

    await prisma.product.upsert({
      where: {
        organizationId_plu: {
          organizationId: organizations[0].id,
          plu,
        },
      },
      update: { description },
      create: {
        organizationId: organizations[0].id,
        plu,
        barcode: `78900000${String(index).padStart(5, "0")}`,
        description,
        ...category,
        lastInventory:
          index % 4 === 0
            ? null
            : new Date(2026, index % 7, (index % 24) + 1),
        currentStock: String((index + 1) * 3.5),
      },
    });
  }

  await prisma.product.upsert({
    where: {
      organizationId_plu: {
        organizationId: organizations[1].id,
        plu: "1000",
      },
    },
    update: { description: "Produto exclusivo Beta" },
    create: {
      organizationId: organizations[1].id,
      plu: "1000",
      barcode: "7899999999999",
      description: "Produto exclusivo Beta",
      section: "Exclusiva",
      group: "Beta",
      subgroup: "Restrito",
      currentStock: 12,
    },
  });

  await prisma.organization.upsert({
    where: { id: demoOrganization.id },
    update: { name: demoOrganization.name },
    create: {
      id: demoOrganization.id,
      name: demoOrganization.name,
    },
  });

  await prisma.user.upsert({
    where: { email: demoOrganization.user.email },
      update: {
        name: demoOrganization.user.name,
        role: "OWNER",
        isActive: true,
        organizationId: demoOrganization.id,
      },
      create: {
        ...demoOrganization.user,
        organizationId: demoOrganization.id,
        role: "OWNER",
      },
  });

  await prisma.account.upsert({
    where: {
      issuer_accountId: {
        issuer: "local:credential",
        accountId: demoOrganization.user.id,
      },
    },
    update: { password: demoPassword },
    create: {
      issuer: "local:credential",
      accountId: demoOrganization.user.id,
      providerId: "credential",
      userId: demoOrganization.user.id,
      password: demoPassword,
    },
  });

  const demoImports = [
    {
      id: "44444444-4444-4444-8444-444444444441",
      filename: "demo-inventario-junho.csv",
      importedAt: new Date("2026-06-30T12:00:00.000Z"),
    },
    {
      id: "44444444-4444-4444-8444-444444444442",
      filename: "demo-inventario-agosto.csv",
      importedAt: new Date("2026-08-26T12:00:00.000Z"),
    },
  ] as const;

  for (const [index, demoImport] of demoImports.entries()) {
    await prisma.importRecord.upsert({
      where: { id: demoImport.id },
      update: {
        filename: demoImport.filename,
        importedAt: demoImport.importedAt,
        totalRows: demoProducts.length,
        insertedRows: index === 0 ? demoProducts.length : 0,
        updatedRows: index === 0 ? 0 : demoProducts.length,
        errorRows: 0,
      },
      create: {
        id: demoImport.id,
        organizationId: demoOrganization.id,
        filename: demoImport.filename,
        importedAt: demoImport.importedAt,
        totalRows: demoProducts.length,
        insertedRows: index === 0 ? demoProducts.length : 0,
        updatedRows: index === 0 ? 0 : demoProducts.length,
        errorRows: 0,
      },
    });
  }

  for (const demoProduct of demoProducts) {
    const lastInventory = demoProduct.lastInventory
      ? new Date(`${demoProduct.lastInventory}T00:00:00.000Z`)
      : null;
    const product = await prisma.product.upsert({
      where: {
        organizationId_plu: {
          organizationId: demoOrganization.id,
          plu: demoProduct.plu,
        },
      },
      update: {
        barcode: demoProduct.barcode,
        description: demoProduct.description,
        section: demoProduct.section,
        group: demoProduct.group,
        subgroup: demoProduct.subgroup,
        lastInventory,
        currentStock: demoProduct.currentStock,
      },
      create: {
        organizationId: demoOrganization.id,
        plu: demoProduct.plu,
        barcode: demoProduct.barcode,
        description: demoProduct.description,
        section: demoProduct.section,
        group: demoProduct.group,
        subgroup: demoProduct.subgroup,
        lastInventory,
        currentStock: demoProduct.currentStock,
      },
    });

    await prisma.stockHistory.upsert({
      where: {
        importId_productId: {
          importId: demoImports[0].id,
          productId: product.id,
        },
      },
      update: {
        organizationId: demoOrganization.id,
        stock: demoProduct.previousStock,
        recordedAt: demoImports[0].importedAt,
      },
      create: {
        organizationId: demoOrganization.id,
        productId: product.id,
        importId: demoImports[0].id,
        stock: demoProduct.previousStock,
        recordedAt: demoImports[0].importedAt,
      },
    });

    await prisma.stockHistory.upsert({
      where: {
        importId_productId: {
          importId: demoImports[1].id,
          productId: product.id,
        },
      },
      update: {
        organizationId: demoOrganization.id,
        stock: demoProduct.currentStock,
        recordedAt: demoImports[1].importedAt,
      },
      create: {
        organizationId: demoOrganization.id,
        productId: product.id,
        importId: demoImports[1].id,
        stock: demoProduct.currentStock,
        recordedAt: demoImports[1].importedAt,
      },
    });
  }

  console.log("Test and demo organizations, users, products, and stock created.");
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

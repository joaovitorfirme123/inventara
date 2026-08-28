import "dotenv/config";
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
        organizationId: organization.id,
      },
      create: {
        ...organization.user,
        organizationId: organization.id,
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

  console.log("Test organizations, users, and products created.");
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

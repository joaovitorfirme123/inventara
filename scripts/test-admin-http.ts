import "dotenv/config";

import { createOrganizationUser, deactivateOrganizationUser } from "../src/data/organization-admin";
import { prisma } from "../src/lib/prisma";

const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
const seedPassword = process.env.SEED_USER_PASSWORD;
const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL;
const platformAdminPassword = process.env.PLATFORM_ADMIN_PASSWORD;

if (!seedPassword || !platformAdminEmail || !platformAdminPassword) {
  throw new Error("Admin HTTP test credentials are required.");
}

const adminEmail = platformAdminEmail as string;
const adminPassword = platformAdminPassword as string;
const ownerPassword = seedPassword as string;
const inactiveEmail = "admin-http-inactive@test.invalid";
const organizationAId = "11111111-1111-4111-8111-111111111111";

function getCookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 200) throw new Error(`Login failed for ${email}: ${response.status}`);
  return getCookieHeader(response);
}

async function testAdminHttp() {
  let inactiveUserId = "";

  try {
    const platformCookie = await login(adminEmail, adminPassword);
    const platformPage = await fetch(`${baseUrl}/admin/organizacoes`, { headers: { cookie: platformCookie } });
    if (platformPage.status !== 200 || !(await platformPage.text()).includes("Nova organização")) {
      throw new Error("Platform admin could not access organization administration.");
    }

    const organizationPage = await fetch(`${baseUrl}/admin/organizacoes/11111111-1111-4111-8111-111111111111`, {
      headers: { cookie: platformCookie },
    });
    if (organizationPage.status !== 200 || !(await organizationPage.text()).includes("Usuários e permissões")) {
      throw new Error("Platform admin could not inspect organization users and permissions.");
    }

    const ownerCookie = await login("ana@alfa.test", ownerPassword);
    const dashboardPage = await fetch(baseUrl, { headers: { cookie: ownerCookie } });
    const dashboardHtml = await dashboardPage.text();
    if (
      dashboardPage.status !== 200 ||
      !dashboardHtml.includes('href="/produtos"') ||
      !dashboardHtml.includes('href="/produtos?status=contado"') ||
      !dashboardHtml.includes('href="/produtos?status=pendente"') ||
      !dashboardHtml.includes('href="/produtos?status=sem-data"')
    ) {
      throw new Error("Dashboard product drill-down links are incomplete.");
    }

    const inventoryPage = await fetch(`${baseUrl}/inventarios`, {
      headers: { cookie: ownerCookie },
    });
    const inventoryHtml = await inventoryPage.text();
    const drilldownPrefix =
      'href="/produtos?section=Mercearia&amp;group=Alimentos&amp;subgroup=Secos';
    if (
      inventoryPage.status !== 200 ||
      !inventoryHtml.includes(drilldownPrefix) ||
      !inventoryHtml.includes(`${drilldownPrefix}&amp;status=pendente`) ||
      !inventoryHtml.includes(`${drilldownPrefix}&amp;status=contado`) ||
      !inventoryHtml.includes(`${drilldownPrefix}&amp;status=sem-data`)
    ) {
      throw new Error("Inventory ranking product drill-down links are incomplete.");
    }

    const filteredProductsPage = await fetch(
      `${baseUrl}/produtos?status=pendente&q=Arroz`,
      { headers: { cookie: ownerCookie } },
    );
    const filteredProductsHtml = await filteredProductsPage.text();
    if (
      filteredProductsPage.status !== 200 ||
      !filteredProductsHtml.includes("Filtro ativo") ||
      !filteredProductsHtml.includes("Pendentes") ||
      !filteredProductsHtml.includes("Arroz")
    ) {
      throw new Error("Product status filter was not preserved with search.");
    }

    const directFilteredPage = await fetch(
      `${baseUrl}/produtos?section=Mercearia&group=Alimentos&subgroup=Secos&status=pendente&sort=currentStock&page=1`,
      { headers: { cookie: ownerCookie } },
    );
    const directFilteredHtml = await directFilteredPage.text();
    if (
      directFilteredPage.status !== 200 ||
      !directFilteredPage.url.includes("status=pendente") ||
      !directFilteredPage.url.includes("sort=currentStock") ||
      directFilteredPage.url.includes("page=1") ||
      !directFilteredHtml.includes("Breadcrumb") ||
      !directFilteredHtml.includes("Filtro ativo")
    ) {
      throw new Error("Product URL state or breadcrumbs were not preserved.");
    }

    const incompatibleHierarchyPage = await fetch(
      `${baseUrl}/produtos?section=Mercearia&group=Grupo%20inexistente&subgroup=Subgrupo%20inexistente&sort=description`,
      { headers: { cookie: ownerCookie } },
    );
    if (
      incompatibleHierarchyPage.status !== 200 ||
      !incompatibleHierarchyPage.url.includes("section=Mercearia") ||
      incompatibleHierarchyPage.url.includes("group=") ||
      incompatibleHierarchyPage.url.includes("subgroup=") ||
      incompatibleHierarchyPage.url.includes("sort=")
    ) {
      throw new Error("Incompatible product hierarchy was not canonicalized.");
    }

    const ownerAdminPage = await fetch(`${baseUrl}/admin/organizacoes`, {
      headers: { cookie: ownerCookie },
      redirect: "manual",
    });
    if (ownerAdminPage.status !== 307) {
      throw new Error(`Tenant owner should not access platform admin: ${ownerAdminPage.status}`);
    }

    const ownerOrganizationPage = await fetch(`${baseUrl}/admin/organizacoes/11111111-1111-4111-8111-111111111111`, {
      headers: { cookie: ownerCookie },
      redirect: "manual",
    });
    if (ownerOrganizationPage.status !== 307) {
      throw new Error(`Tenant owner should not inspect platform organizations: ${ownerOrganizationPage.status}`);
    }

    const ownerUsersPage = await fetch(`${baseUrl}/configuracoes/usuarios`, { headers: { cookie: ownerCookie } });
    if (ownerUsersPage.status !== 200 || !(await ownerUsersPage.text()).includes("Novo usuário")) {
      throw new Error("Tenant owner could not access organization user administration.");
    }

    const ana = await prisma.user.findUniqueOrThrow({ where: { email: "ana@alfa.test" }, select: { id: true } });
    const inactiveUser = await createOrganizationUser({
      organizationId: organizationAId,
      name: "Inactive HTTP User",
      email: inactiveEmail,
      password: "inactive-password",
    });
    inactiveUserId = inactiveUser.id;
    await deactivateOrganizationUser({ organizationId: organizationAId, userId: inactiveUser.id, actorId: ana.id });
    const inactiveLogin = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseUrl },
      body: JSON.stringify({ email: inactiveEmail, password: "inactive-password" }),
    });
    if (inactiveLogin.status !== 401) {
      throw new Error(`Inactive user should not sign in: ${inactiveLogin.status}`);
    }

    console.log("Platform, organization, and inactive-user authorization passed.");
  } finally {
    if (inactiveUserId) {
      await prisma.session.deleteMany({ where: { userId: inactiveUserId } });
      await prisma.account.deleteMany({ where: { userId: inactiveUserId } });
      await prisma.user.delete({ where: { id: inactiveUserId } });
    }
  }
}

testAdminHttp()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

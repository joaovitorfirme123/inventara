import type { Metadata } from "next";
import { OrganizationAdmin } from "@/components/organization-admin";
import { listOrganizations } from "@/data/organization-admin";
import { PageHeader } from "@/components/page-header";
import { requirePlatformAdminContext } from "@/lib/session";

export const metadata: Metadata = { title: "Organizações" };

export default async function OrganizationAdminPage() {
  await requirePlatformAdminContext();
  const organizations = await listOrganizations();

  return (
    <>
      <PageHeader
        eyebrow="Administração da plataforma"
        title="Organizações"
        description="Provisione tenants e seus primeiros administradores sem misturar dados operacionais."
      />
      <OrganizationAdmin organizations={organizations} />
    </>
  );
}

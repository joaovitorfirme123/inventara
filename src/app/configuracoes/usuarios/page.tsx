import type { Metadata } from "next";
import { OrganizationUsers } from "@/components/organization-users";
import { listUsersByOrganization } from "@/data/users";
import { PageHeader } from "@/components/page-header";
import { requireOrganizationOwnerContext } from "@/lib/session";

export const metadata: Metadata = { title: "Usuários" };

export default async function OrganizationUsersPage() {
  const session = await requireOrganizationOwnerContext();
  const users = await listUsersByOrganization(session.user.organizationId);

  return (
    <>
      <PageHeader
        eyebrow="Administração da organização"
        title="Usuários"
        description="Crie e desative acessos sem ultrapassar os limites da organização atual."
      />
      <OrganizationUsers
        users={users.map((user) => ({ ...user, createdAt: user.createdAt.toLocaleDateString("pt-BR") }))}
      />
    </>
  );
}

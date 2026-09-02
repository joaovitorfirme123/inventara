import type { Metadata } from "next";
import { OrganizationUsers } from "@/components/organization-users";
import { listOrganizationInvitations } from "@/data/invitations";
import { listUsersByOrganization } from "@/data/users";
import { PageHeader } from "@/components/page-header";
import { requireOrganizationOwnerContext } from "@/lib/session";

export const metadata: Metadata = { title: "Usuários" };

export default async function OrganizationUsersPage() {
  const session = await requireOrganizationOwnerContext();
  const [users, invitations] = await Promise.all([
    listUsersByOrganization(session.user.organizationId),
    listOrganizationInvitations(session.user.organizationId),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Administração da organização"
        title="Usuários"
        description="Crie e desative acessos sem ultrapassar os limites da organização atual."
      />
      <OrganizationUsers
        invitations={invitations.map((invitation) => ({ ...invitation, expiresAt: invitation.expiresAt.toISOString(), acceptedAt: invitation.acceptedAt?.toISOString() ?? null, revokedAt: invitation.revokedAt?.toISOString() ?? null, createdAt: invitation.createdAt.toISOString() }))}
        users={users.map((user) => ({ ...user, createdAt: user.createdAt.toLocaleDateString("pt-BR") }))}
      />
    </>
  );
}

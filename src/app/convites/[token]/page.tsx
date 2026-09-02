import type { Metadata } from "next";
import { AcceptInvitation } from "@/components/accept-invitation";
import { getInvitationPreview } from "@/data/invitations";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Aceitar convite" };

export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationPreview(token);
  if (!invitation || !invitation.isValid) {
    return <><PageHeader eyebrow="Convite de equipe" title="Convite indisponível" description="Este link não pode mais ser utilizado." /><section className="invite-accept panel"><p>Solicite ao owner da organização um novo convite.</p></section></>;
  }
  return <><PageHeader eyebrow="Convite de equipe" title="Aceite seu convite" description="Ative seu acesso ao Inventara em poucos passos." /><AcceptInvitation email={invitation.email} token={token} /></>;
}

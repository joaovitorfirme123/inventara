import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getPermissionMatrix } from "@/lib/permissions";
import { requireOrganizationOwnerContext } from "@/lib/session";

export const metadata: Metadata = { title: "Matriz de permissões" };

export default async function PermissionsPage() {
  await requireOrganizationOwnerContext();
  const permissions = getPermissionMatrix();
  return <><PageHeader eyebrow="Controle de acesso" title="Matriz de permissões" description="Permissões verificadas no servidor para cada perfil da organização." /><section className="permissions-panel panel"><div className="panel-heading"><div><span className="section-kicker">RBAC</span><h2>Acesso por perfil</h2></div><span className="status-pill">Owner / Member</span></div><div className="permissions-table"><table><thead><tr><th>Permissão</th><th>Owner</th><th>Member</th></tr></thead><tbody>{permissions.map((permission) => <tr key={permission.permission}><td>{permission.label}</td><td><span className={permission.OWNER ? "permission-yes" : "permission-no"}>{permission.OWNER ? "Permitido" : "—"}</span></td><td><span className={permission.MEMBER ? "permission-yes" : "permission-no"}>{permission.MEMBER ? "Permitido" : "—"}</span></td></tr>)}</tbody></table></div></section></>;
}

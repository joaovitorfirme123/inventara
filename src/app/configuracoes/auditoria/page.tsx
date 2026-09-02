import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { listOrganizationAuditLogs } from "@/data/audit";
import { requireOrganizationOwnerContext } from "@/lib/session";

export const metadata: Metadata = { title: "Auditoria" };

const actionLabels: Record<string, string> = {
  USER_CREATED: "Usuário criado",
  USER_DEACTIVATED: "Usuário desativado",
  INVITE_CREATED: "Convite criado",
  INVITE_REVOKED: "Convite revogado",
  INVITE_ACCEPTED: "Convite aceito",
};
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function AuditPage() {
  const session = await requireOrganizationOwnerContext();
  const logs = await listOrganizationAuditLogs(session.user.organizationId);
  return <><PageHeader eyebrow="Controle de acesso" title="Auditoria" description="Histórico das alterações relevantes de usuários e convites da organização." /><section className="audit-panel panel"><div className="panel-heading"><div><span className="section-kicker">Rastreabilidade</span><h2>Eventos recentes</h2></div><span className="status-pill">{logs.length} registros</span></div>{logs.length > 0 ? <div className="audit-table"><table><thead><tr><th>Evento</th><th>Entidade</th><th>Responsável</th><th>Data</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td><strong>{actionLabels[log.action] ?? log.action}</strong></td><td>{log.entityType}</td><td>{log.actor?.name ?? "Sistema"}</td><td>{dateFormatter.format(log.createdAt)}</td></tr>)}</tbody></table></div> : <div className="notification-empty"><span>LOG</span><div><h2>Nenhum evento registrado</h2><p>Alterações de acesso aparecerão aqui.</p></div></div>}</section></>;
}

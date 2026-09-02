import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  listNotificationsForUser,
  syncNotifications,
} from "@/data/notifications";
import { requireOrganizationSessionContext } from "@/lib/session";
import { markNotificationReadAction } from "./actions";

export const metadata: Metadata = { title: "Notificações" };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function NotificationsPage() {
  const session = await requireOrganizationSessionContext();
  const year = new Date().getFullYear();
  await syncNotifications(session.user.organizationId, year);
  const notifications = await listNotificationsForUser(
    session.user.organizationId,
    session.user.id,
  );
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <>
      <PageHeader
        eyebrow="Acompanhamento"
        title="Notificações"
        description="Acompanhe prioridades urgentes e metas de cobertura fora do esperado."
      />
      <section className="notifications-panel panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Alertas ativos</span><h2>Central de notificações</h2></div>
          <span className="status-pill">{unreadCount} não lidas</span>
        </div>
        {notifications.length > 0 ? (
          <div className="notification-list">
            {notifications.map((notification) => (
              <article className={`notification-card ${notification.readAt ? "read" : "unread"}`} key={notification.id}>
                <span className={`notification-mark ${notification.severity}`}>{notification.type === "GOAL" ? "META" : "URG"}</span>
                <div className="notification-content">
                  <div className="notification-heading"><h3>{notification.title}</h3><time dateTime={notification.generatedAt.toISOString()}>{dateFormatter.format(notification.generatedAt)}</time></div>
                  <p>{notification.message}</p>
                  {!notification.readAt ? (
                    <form action={markNotificationReadAction}><input name="notificationId" type="hidden" value={notification.id} /><button type="submit">Marcar como lida</button></form>
                  ) : <small className="notification-read-label">Lida</small>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="notification-empty"><span>OK</span><div><h2>Nenhum alerta ativo</h2><p>Quando uma prioridade urgente ou uma meta ficar abaixo do esperado, o alerta aparecerá aqui.</p></div></div>
        )}
      </section>
    </>
  );
}

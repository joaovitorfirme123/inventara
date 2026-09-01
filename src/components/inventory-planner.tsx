"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InventoryPlanListItem } from "@/data/inventory-plans";
import {
  getAllowedNextInventoryPlanStatuses,
  inventoryPlanStatusLabels,
  type InventoryPlanStatus,
} from "@/lib/inventory-plan";

type InventoryTarget = {
  section: string;
  group: string;
  subgroup: string;
  priority: string;
  totalSkus: number;
  pendingSkus: number;
};

type Feedback = { status: "success" | "error"; message: string } | null;

const numberFormatter = new Intl.NumberFormat("pt-BR");

function targetKey(target: Pick<InventoryTarget, "section" | "group" | "subgroup">) {
  return JSON.stringify([target.section, target.group, target.subgroup]);
}

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

function PlanCard({
  plan,
  onFeedback,
}: {
  plan: InventoryPlanListItem;
  onFeedback: (feedback: Feedback) => void;
}) {
  const router = useRouter();
  const [plannedDate, setPlannedDate] = useState(plan.plannedDate ?? "");
  const [responsibleName, setResponsibleName] = useState(plan.responsibleName ?? "");
  const [status, setStatus] = useState<InventoryPlanStatus>(plan.status);
  const [isPending, setIsPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    onFeedback(null);

    try {
      const response = await fetch(`/api/inventarios/planejamentos/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedDate, responsibleName, status }),
      });
      if (!response.ok) throw new Error(await readError(response, "Não foi possível atualizar o planejamento."));
      onFeedback({ status: "success", message: "Planejamento atualizado." });
      router.refresh();
    } catch (error: unknown) {
      onFeedback({ status: "error", message: error instanceof Error ? error.message : "Não foi possível atualizar o planejamento." });
    } finally {
      setIsPending(false);
    }
  }

  const statusClass = plan.status.toLowerCase().replace("_", "-");

  return (
    <article className="inventory-plan-card">
      <div className="inventory-plan-card-heading">
        <div>
          <span className="section-kicker">{plan.section}</span>
          <h3>{plan.group} / {plan.subgroup}</h3>
        </div>
        <span className={`plan-status ${statusClass}`}>{inventoryPlanStatusLabels[plan.status]}</span>
      </div>
      <div className="inventory-plan-metrics">
        <span><strong>{plan.priority}</strong> prioridade</span>
        <span><strong>{numberFormatter.format(plan.pendingSkus)}</strong> pendentes</span>
        <span><strong>{numberFormatter.format(plan.totalSkus)}</strong> SKUs</span>
      </div>
      <form className="inventory-plan-form" onSubmit={submit}>
        <label>
          <span>Data prevista</span>
          <input onChange={(event) => setPlannedDate(event.target.value)} type="date" value={plannedDate} />
        </label>
        <label>
          <span>Responsável</span>
          <input onChange={(event) => setResponsibleName(event.target.value)} placeholder="Nome da pessoa" type="text" value={responsibleName} />
        </label>
        <label>
          <span>Status</span>
          <select onChange={(event) => setStatus(event.target.value as InventoryPlanStatus)} value={status}>
            {getAllowedNextInventoryPlanStatuses(plan.status).map((option) => (
              <option key={option} value={option}>{inventoryPlanStatusLabels[option]}</option>
            ))}
          </select>
        </label>
        <button disabled={isPending} type="submit">{isPending ? "Salvando..." : "Salvar alterações"}</button>
      </form>
    </article>
  );
}

export function InventoryPlanner({
  initialPlans,
  targets,
}: {
  initialPlans: InventoryPlanListItem[];
  targets: InventoryTarget[];
}) {
  const router = useRouter();
  const [selectedTarget, setSelectedTarget] = useState(targets[0] ? targetKey(targets[0]) : "");
  const [plannedDate, setPlannedDate] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryPlanStatus | "">("");
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = targets.find((item) => targetKey(item) === selectedTarget);
    if (!target) {
      setFeedback({ status: "error", message: "Selecione um grupo e subgrupo." });
      return;
    }
    setIsCreating(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/inventarios/planejamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, plannedDate, responsibleName }),
      });
      if (!response.ok) throw new Error(await readError(response, "Não foi possível criar o planejamento."));
      setFeedback({ status: "success", message: "Planejamento criado como pendente." });
      setPlannedDate("");
      setResponsibleName("");
      router.refresh();
    } catch (error: unknown) {
      setFeedback({ status: "error", message: error instanceof Error ? error.message : "Não foi possível criar o planejamento." });
    } finally {
      setIsCreating(false);
    }
  }

  const visiblePlans = statusFilter
    ? initialPlans.filter((plan) => plan.status === statusFilter)
    : initialPlans;

  return (
    <section className="inventory-planner">
      <div className="inventory-planner-create panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Operação</span><h2>Novo planejamento</h2></div>
          <span className="status-pill">Por prioridade</span>
        </div>
        <p className="panel-intro">Transforme um grupo priorizado em uma tarefa de contagem acompanhável.</p>
        <form className="inventory-plan-create-form" onSubmit={createPlan}>
          <label className="plan-target-field">
            <span>Grupo e subgrupo priorizados</span>
            <select disabled={targets.length === 0} onChange={(event) => setSelectedTarget(event.target.value)} value={selectedTarget}>
              {targets.length === 0 ? <option value="">Nenhum recorte disponível</option> : targets.map((target) => (
                <option key={targetKey(target)} value={targetKey(target)}>
                  {target.section} / {target.group} / {target.subgroup} · {target.priority}
                </option>
              ))}
            </select>
          </label>
          <label><span>Data prevista</span><input onChange={(event) => setPlannedDate(event.target.value)} type="date" value={plannedDate} /></label>
          <label><span>Responsável</span><input onChange={(event) => setResponsibleName(event.target.value)} placeholder="Nome da pessoa" type="text" value={responsibleName} /></label>
          <button disabled={isCreating || targets.length === 0} type="submit">{isCreating ? "Criando..." : "Criar planejamento"}</button>
        </form>
        {feedback ? <p className={`action-feedback ${feedback.status}`} role={feedback.status === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
      </div>

      <div className="inventory-planner-list panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Acompanhamento</span><h2>Planejamentos</h2></div>
          <select aria-label="Filtrar planejamentos por status" onChange={(event) => setStatusFilter(event.target.value as InventoryPlanStatus | "")} value={statusFilter}>
            <option value="">Todos os status</option>
            {Object.entries(inventoryPlanStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
        </div>
        {visiblePlans.length > 0 ? (
          <div className="inventory-plan-cards">
            {visiblePlans.map((plan) => (
              <PlanCard
                key={`${plan.id}:${plan.status}:${plan.plannedDate ?? ""}:${plan.responsibleName ?? ""}`}
                onFeedback={setFeedback}
                plan={plan}
              />
            ))}
          </div>
        ) : (
          <div className="inventory-empty"><span>PLN</span><div><h2>Nenhum planejamento encontrado</h2><p>Crie uma tarefa a partir de um grupo priorizado.</p></div></div>
        )}
      </div>
    </section>
  );
}

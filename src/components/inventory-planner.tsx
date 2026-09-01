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

function uniqueValues(values: string[]) {
  return [...new Set(values)];
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
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function remove() {
    if (!window.confirm(`Apagar o planejamento de ${plan.group} / ${plan.subgroup}?`)) return;
    setIsDeleting(true);
    onFeedback(null);

    try {
      const response = await fetch(`/api/inventarios/planejamentos/${plan.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readError(response, "Não foi possível apagar o planejamento."));
      onFeedback({ status: "success", message: "Planejamento apagado." });
      router.refresh();
    } catch (error: unknown) {
      setIsDeleting(false);
      onFeedback({ status: "error", message: error instanceof Error ? error.message : "Não foi possível apagar o planejamento." });
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
        <div className="inventory-plan-actions">
          <button disabled={isPending || isDeleting} type="submit">{isPending ? "Salvando..." : "Salvar alterações"}</button>
          <button className="delete-plan-button" disabled={isPending || isDeleting} onClick={remove} type="button">{isDeleting ? "Apagando..." : "Apagar"}</button>
        </div>
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
  const [selectedSection, setSelectedSection] = useState(targets[0]?.section ?? "");
  const [selectedGroup, setSelectedGroup] = useState(targets[0]?.group ?? "");
  const [selectedSubgroup, setSelectedSubgroup] = useState(targets[0]?.subgroup ?? "");
  const [plannedDate, setPlannedDate] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryPlanStatus | "">("");
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function createPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = targets.find(
      (item) =>
        item.section === selectedSection &&
        item.group === selectedGroup &&
        item.subgroup === selectedSubgroup,
    );
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
  const sectionOptions = uniqueValues(targets.map((target) => target.section));
  const groupOptions = uniqueValues(
    targets
      .filter((target) => target.section === selectedSection)
      .map((target) => target.group),
  );
  const subgroupOptions = uniqueValues(
    targets
      .filter((target) => target.section === selectedSection && target.group === selectedGroup)
      .map((target) => target.subgroup),
  );

  function changeSection(section: string) {
    const nextGroup = uniqueValues(
      targets
        .filter((target) => target.section === section)
        .map((target) => target.group),
    )[0] ?? "";
    const nextSubgroup = uniqueValues(
      targets
        .filter((target) => target.section === section && target.group === nextGroup)
        .map((target) => target.subgroup),
    )[0] ?? "";
    setSelectedSection(section);
    setSelectedGroup(nextGroup);
    setSelectedSubgroup(nextSubgroup);
  }

  function changeGroup(group: string) {
    const nextSubgroup = uniqueValues(
      targets
        .filter((target) => target.section === selectedSection && target.group === group)
        .map((target) => target.subgroup),
    )[0] ?? "";
    setSelectedGroup(group);
    setSelectedSubgroup(nextSubgroup);
  }

  return (
    <section className="inventory-planner">
      <div className="inventory-planner-create panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Operação</span><h2>Novo planejamento</h2></div>
          <span className="status-pill">Por prioridade</span>
        </div>
        <p className="panel-intro">Transforme um grupo priorizado em uma tarefa de contagem acompanhável.</p>
        <form className="inventory-plan-create-form" onSubmit={createPlan}>
          <label className="plan-target-field"><span>Seção</span><select disabled={targets.length === 0} onChange={(event) => changeSection(event.target.value)} value={selectedSection}>{sectionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Grupo</span><select disabled={groupOptions.length === 0} onChange={(event) => changeGroup(event.target.value)} value={selectedGroup}>{groupOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label><span>Subgrupo</span><select disabled={subgroupOptions.length === 0} onChange={(event) => setSelectedSubgroup(event.target.value)} value={selectedSubgroup}>{subgroupOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
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

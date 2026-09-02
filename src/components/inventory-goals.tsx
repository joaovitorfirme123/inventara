"use client";

import { useActionState } from "react";
import { saveInventoryGoalAction } from "@/app/configuracoes/metas/actions";
import type { InventoryGoalState } from "@/app/configuracoes/metas/types";

type Goal = {
  section: string;
  targetPercentage: number | null;
};

const initialState: InventoryGoalState = { status: "idle", message: "" };

function GoalCard({ goal, year }: { goal: Goal; year: number }) {
  const [state, formAction, isPending] = useActionState(saveInventoryGoalAction, initialState);

  return (
    <article className="inventory-goal-card">
      <div>
        <span className="section-kicker">Seção</span>
        <h3>{goal.section}</h3>
      </div>
      <form action={formAction}>
        <input name="section" type="hidden" value={goal.section} />
        <input name="year" type="hidden" value={year} />
        <label>
          <span>Meta de cobertura</span>
          <div className="goal-input">
            <input
              defaultValue={goal.targetPercentage ?? ""}
              max="100"
              min="0"
              name="targetPercentage"
              placeholder="Ex.: 90"
              required
              step="0.1"
              type="number"
            />
            <b>%</b>
          </div>
        </label>
        <button disabled={isPending} type="submit">{isPending ? "Salvando..." : "Salvar meta"}</button>
      </form>
      {state.status !== "idle" && <p className={`action-feedback ${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
    </article>
  );
}

export function InventoryGoals({ sections, goals, year }: { sections: string[]; goals: Goal[]; year: number }) {
  const goalsBySection = new Map(goals.map((goal) => [goal.section, goal.targetPercentage]));

  return (
    <section className="inventory-goals panel">
      <div className="panel-heading">
        <div><span className="section-kicker">Objetivo anual</span><h2>Metas por seção</h2></div>
        <span className="status-pill">Ciclo {year}</span>
      </div>
      <p className="panel-intro">Defina a cobertura desejada para cada seção. O Dashboard compara a meta com os fechamentos mensais registrados.</p>
      {sections.length > 0 ? (
        <div className="inventory-goal-grid">
          {sections.map((section) => <GoalCard goal={{ section, targetPercentage: goalsBySection.get(section) ?? null }} key={section} year={year} />)}
        </div>
      ) : (
        <div className="inventory-empty"><span>MET</span><div><h2>Nenhuma seção encontrada</h2><p>Importe produtos para definir metas de cobertura.</p></div></div>
      )}
    </section>
  );
}

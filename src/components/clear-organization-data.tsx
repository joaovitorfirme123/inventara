"use client";

import { useActionState } from "react";
import {
  clearCurrentOrganizationData,
  initialClearOrganizationState,
} from "@/app/configuracoes/actions";

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function ClearOrganizationData() {
  const [state, formAction, isPending] = useActionState(
    clearCurrentOrganizationData,
    initialClearOrganizationState,
  );

  return (
    <section className="danger-zone panel">
      <div className="danger-zone-heading">
        <div>
          <span className="section-kicker">Zona de risco</span>
          <h2>Limpar dados da organização</h2>
        </div>
        <span className="danger-zone-mark">!</span>
      </div>
      <p>
        Remove produtos, seções, grupos, subgrupos, importações e todo o histórico
        de estoque desta organização. Usuários e sessões permanecem intactos.
      </p>
      <form action={formAction} className="clear-data-form">
        <label>
          <span>Digite APAGAR TUDO para confirmar</span>
          <input
            autoComplete="off"
            name="confirmation"
            placeholder="APAGAR TUDO"
            required
            spellCheck={false}
          />
        </label>
        <button disabled={isPending} type="submit">
          {isPending ? "Limpando base..." : "Apagar todos os dados"}
        </button>
      </form>
      {state.status === "error" && (
        <p className="action-feedback error" role="alert">{state.message}</p>
      )}
      {state.status === "success" && state.counts && (
        <p className="action-feedback success" role="status">
          {state.message} {numberFormatter.format(state.counts.products)} produtos, {numberFormatter.format(state.counts.imports)} importações e {numberFormatter.format(state.counts.stockHistory)} snapshots removidos.
        </p>
      )}
    </section>
  );
}

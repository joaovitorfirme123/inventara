"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";

type VendasFiltrosProps = {
  filters: {
    de: string;
    ate: string;
    secao: string;
    grupo: string;
    subgrupo: string;
  };
  options: {
    sections: string[];
    groups: string[];
    subgroups: string[];
  };
};

function applySelection(
  event: ChangeEvent<HTMLSelectElement>,
  dependentFields: string[],
) {
  const form = event.currentTarget.form;

  if (!form) return;

  for (const name of dependentFields) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLSelectElement) field.value = "";
  }

  form.requestSubmit();
}

export function VendasFiltros({ filters, options }: VendasFiltrosProps) {
  return (
    <form className="product-filters panel" method="get">
      <label>
        <span>De</span>
        <input defaultValue={filters.de} name="de" type="date" />
      </label>

      <label>
        <span>Até</span>
        <input defaultValue={filters.ate} name="ate" type="date" />
      </label>

      <label>
        <span>Seção</span>
        <select
          defaultValue={filters.secao}
          name="secao"
          onChange={(event) => applySelection(event, ["grupo", "subgrupo"])}
        >
          <option value="">Todas</option>
          {options.sections.map((section) => (
            <option key={section}>{section}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Grupo</span>
        <select
          defaultValue={filters.grupo}
          name="grupo"
          onChange={(event) => applySelection(event, ["subgrupo"])}
        >
          <option value="">Todos</option>
          {options.groups.map((group) => (
            <option key={group}>{group}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Subgrupo</span>
        <select defaultValue={filters.subgrupo} name="subgrupo">
          <option value="">Todos</option>
          {options.subgroups.map((subgroup) => (
            <option key={subgroup}>{subgroup}</option>
          ))}
        </select>
      </label>

      <div className="filter-actions">
        <button className="primary-action" type="submit">Filtrar</button>
        <Link className="secondary-action" href="/vendas">Limpar</Link>
      </div>
    </form>
  );
}

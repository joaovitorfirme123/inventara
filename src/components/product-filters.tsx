"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";

type ProductFiltersProps = {
  filters: {
    q: string;
    section: string;
    group: string;
    subgroup: string;
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

export function ProductFilters({ filters, options }: ProductFiltersProps) {
  return (
    <form className="product-filters panel" method="get">
      <label className="search-field">
        <span>Busca</span>
        <input
          defaultValue={filters.q}
          name="q"
          placeholder="Descrição, PLU ou código de barras"
          type="search"
        />
      </label>

      <label>
        <span>Seção</span>
        <select
          defaultValue={filters.section}
          name="section"
          onChange={(event) => applySelection(event, ["group", "subgroup"])}
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
          defaultValue={filters.group}
          name="group"
          onChange={(event) => applySelection(event, ["subgroup"])}
        >
          <option value="">Todos</option>
          {options.groups.map((group) => (
            <option key={group}>{group}</option>
          ))}
        </select>
      </label>

      <label>
        <span>Subgrupo</span>
        <select defaultValue={filters.subgroup} name="subgroup">
          <option value="">Todos</option>
          {options.subgroups.map((subgroup) => (
            <option key={subgroup}>{subgroup}</option>
          ))}
        </select>
      </label>

      <div className="filter-actions">
        <button type="submit">Aplicar</button>
        <Link href="/produtos">Limpar</Link>
      </div>
    </form>
  );
}

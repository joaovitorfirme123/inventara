"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import type { ProductSort } from "@/data/products";
import type { ProductInventoryStatus } from "@/lib/inventory-status";

type ProductFiltersProps = {
  filters: {
    q: string;
    section: string;
    group: string;
    subgroup: string;
    status?: ProductInventoryStatus;
    sort?: ProductSort;
  };
  options: {
    sections: string[];
    groups: string[];
    subgroups: string[];
  };
  statusOptions?: Array<{ value: ProductInventoryStatus; label: string }>;
  sortOptions?: Array<{ value: ProductSort; label: string }>;
  clearHref?: string;
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

export function ProductFilters({
  filters,
  options,
  statusOptions,
  sortOptions,
  clearHref,
}: ProductFiltersProps) {
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

      {statusOptions ? (
        <label>
          <span>Status de inventário</span>
          <select defaultValue={filters.status ?? ""} name="status">
            <option value="">Todos</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {sortOptions ? (
        <label>
          <span>Ordenação</span>
          <select defaultValue={filters.sort ?? "description"} name="sort">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="filter-actions">
        <button type="submit">Aplicar</button>
        <Link href={clearHref ?? "/produtos"}>Limpar</Link>
      </div>
    </form>
  );
}

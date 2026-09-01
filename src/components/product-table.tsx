"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type ProductTableItem = {
  id: string;
  plu: string;
  barcode: string | null;
  description: string;
  section: string | null;
  group: string | null;
  subgroup: string | null;
  lastInventory: string | null;
  currentStock: string;
};

type QuickProduct = Omit<ProductTableItem, "id" | "lastInventory" | "currentStock"> & {
  currentStock: string;
  previousStock: string | null;
  variation: string | null;
  lastInventory: string | null;
  status: "contado" | "pendente" | "sem-data";
  statusLabel: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

const stockFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function ProductQuickDrawer({
  plu,
  returnFocusRef,
  onClose,
}: {
  plu: string;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [product, setProduct] = useState<QuickProduct | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousFocus = returnFocusRef.current;
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          "button, a[href], [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const controller = new AbortController();
    void fetch(`/api/produtos/${encodeURIComponent(plu)}/quick`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o produto.");
        return (await response.json()) as QuickProduct;
      })
      .then(setProduct)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Não foi possível carregar os detalhes deste produto.");
      });

    return () => {
      controller.abort();
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [onClose, plu, returnFocusRef]);

  const variation = product?.variation === null || product?.variation === undefined
    ? null
    : Number(product.variation);
  const variationClass = variation === null || variation === 0
    ? "neutral"
    : variation > 0
      ? "positive"
      : "negative";

  return (
    <div className="product-drawer-layer" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside
        aria-labelledby="product-drawer-title"
        aria-modal="true"
        className="product-drawer"
        ref={drawerRef}
        role="dialog"
      >
        <div className="product-drawer-header">
          <div>
            <span className="section-kicker">Consulta rápida</span>
            <h2 id="product-drawer-title">{product?.description ?? `Produto ${plu}`}</h2>
          </div>
          <button aria-label="Fechar consulta do produto" className="drawer-close" onClick={onClose} ref={closeButtonRef} type="button">×</button>
        </div>

        {error ? (
          <div className="drawer-message" role="alert">{error}</div>
        ) : !product ? (
          <div className="drawer-loading" aria-live="polite">Carregando detalhes...</div>
        ) : (
          <div className="product-drawer-content">
            <div className="drawer-identity">
              <span>PLU</span><strong>{product.plu}</strong>
              <span>Código de barras</span><strong>{product.barcode ?? "Não informado"}</strong>
            </div>
            <div className="drawer-stock-grid">
              <article><span>Estoque atual</span><strong>{stockFormatter.format(Number(product.currentStock))}</strong></article>
              <article><span>Estoque anterior</span><strong>{product.previousStock === null ? "—" : stockFormatter.format(Number(product.previousStock))}</strong></article>
              <article className={variationClass}><span>Variação</span><strong>{variation === null ? "—" : `${variation > 0 ? "+" : ""}${stockFormatter.format(variation)}`}</strong></article>
            </div>
            <dl className="drawer-details">
              <div><dt>Status de inventário</dt><dd><span className="drawer-status">{product.statusLabel}</span></dd></div>
              <div><dt>Último inventário</dt><dd>{product.lastInventory ? dateFormatter.format(new Date(product.lastInventory)) : "Sem data"}</dd></div>
              <div><dt>Seção</dt><dd>{product.section ?? "Sem seção"}</dd></div>
              <div><dt>Grupo</dt><dd>{product.group ?? "Sem grupo"}</dd></div>
              <div><dt>Subgrupo</dt><dd>{product.subgroup ?? "Sem subgrupo"}</dd></div>
            </dl>
            <Link className="drawer-full-link" href={`/produtos/${encodeURIComponent(product.plu)}`} onClick={onClose}>Ver produto completo →</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

export function ProductTable({ products }: { products: ProductTableItem[] }) {
  const [selectedPlu, setSelectedPlu] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function openDrawer(plu: string, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelectedPlu(plu);
  }

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Produto</th><th>PLU / Código</th><th>Classificação</th><th>Último inventário</th><th className="numeric">Estoque</th><th /></tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td data-label="Produto"><strong><Link className="product-detail-link" href={`/produtos/${encodeURIComponent(product.plu)}`}>{product.description}</Link></strong><small>{product.section ?? "Sem seção"}</small></td>
                <td data-label="PLU / Código"><span className="code-value">{product.plu}</span><small>{product.barcode ?? "Sem código"}</small></td>
                <td data-label="Classificação"><span>{product.group ?? "—"}</span><small>{product.subgroup ?? "Sem subgrupo"}</small></td>
                <td data-label="Último inventário">{product.lastInventory ? dateFormatter.format(new Date(product.lastInventory)) : "Sem data"}</td>
                <td className="numeric" data-label="Estoque">{stockFormatter.format(Number(product.currentStock))}</td>
                <td data-label="Ação"><button className="quick-view-button" onClick={(event) => openDrawer(product.plu, event.currentTarget)} type="button">Ver resumo</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedPlu ? <ProductQuickDrawer plu={selectedPlu} returnFocusRef={triggerRef} onClose={() => setSelectedPlu(null)} /> : null}
    </>
  );
}

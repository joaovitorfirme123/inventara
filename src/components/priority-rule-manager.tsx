"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PRIORITY_RULE,
  type PriorityRuleConfig,
} from "@/lib/inventory-priority";

type Settings = {
  name: string;
  version: number;
  configuration: PriorityRuleConfig;
} | null;

function initialConfiguration(settings: Settings) {
  return settings?.configuration ?? DEFAULT_PRIORITY_RULE;
}

export function PriorityRuleManager({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [name, setName] = useState(settings?.name ?? "Regra principal");
  const [configuration, setConfiguration] = useState(() => initialConfiguration(settings));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateWeight(key: keyof PriorityRuleConfig["weights"], value: string) {
    setConfiguration((current) => ({ ...current, weights: { ...current.weights, [key]: Number(value) } }));
  }

  function updateReference(key: keyof PriorityRuleConfig["references"], value: string) {
    setConfiguration((current) => ({ ...current, references: { ...current.references, [key]: Number(value) } }));
  }

  function updateThreshold(key: keyof PriorityRuleConfig["thresholds"], value: string) {
    setConfiguration((current) => ({ ...current, thresholds: { ...current.thresholds, [key]: Number(value) } }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/configuracoes/prioridades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, configuration }),
      });
      const body = await response.json() as { error?: string; version?: number };
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar a regra.");
      setMessage(`Regra salva na revisão ${body.version}. Novas consultas usarão esta configuração.`);
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a regra.");
    } finally {
      setSaving(false);
    }
  }

  const weightTotal = Object.values(configuration.weights).reduce((total, value) => total + value, 0);
  const fields = [
    ["pendingVolume", "Volume pendente", "Quantidade de SKUs pendentes"],
    ["pendingPercentage", "Percentual pendente", "Proporção de pendências"],
    ["age", "Antiguidade", "Dias desde a última contagem"],
    ["noDate", "Sem data", "Produtos sem histórico"],
    ["subgroupVolume", "Volume do subgrupo", "Tamanho total do subgrupo"],
  ] as const;

  return (
    <section className="priority-rule-manager panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Regra {settings ? `v${settings.version}` : "padrão"}</span>
          <h2>Prioridade de inventários</h2>
        </div>
        <span className={Math.abs(weightTotal - 100) < 0.001 ? "status-pill" : "status-pill invalid"}>
          Pesos: {weightTotal.toFixed(1)}%
        </span>
      </div>
      <p className="panel-intro">A pontuação permanece entre 0 e 100. Pesos devem somar 100%; as faixas precisam seguir Urgente maior que Alta maior que Média.</p>

      <label className="priority-rule-name">
        Nome da regra
        <input maxLength={80} onChange={(event) => setName(event.target.value)} value={name} />
      </label>

      <div className="priority-rule-section">
        <div className="priority-rule-section-heading"><h3>Pesos da fórmula</h3><span>Escala percentual</span></div>
        <div className="priority-rule-grid">
          {fields.map(([key, label, description]) => (
            <label key={key}>
              <span>{label}<small>{description}</small></span>
              <input min="0" onChange={(event) => updateWeight(key, event.target.value)} step="0.1" type="number" value={configuration.weights[key]} />
            </label>
          ))}
        </div>
      </div>

      <div className="priority-rule-section">
        <div className="priority-rule-section-heading"><h3>Referências de normalização</h3><span>Valores para nota máxima</span></div>
        <div className="priority-rule-grid three-columns">
          <label><span>SKUs pendentes</span><input min="0.1" onChange={(event) => updateReference("pendingVolume", event.target.value)} step="1" type="number" value={configuration.references.pendingVolume} /></label>
          <label><span>Dias de antiguidade</span><input min="0.1" onChange={(event) => updateReference("ageDays", event.target.value)} step="1" type="number" value={configuration.references.ageDays} /></label>
          <label><span>SKUs no subgrupo</span><input min="0.1" onChange={(event) => updateReference("subgroupVolume", event.target.value)} step="1" type="number" value={configuration.references.subgroupVolume} /></label>
        </div>
      </div>

      <div className="priority-rule-section">
        <div className="priority-rule-section-heading"><h3>Faixas de prioridade</h3><span>Pontuação mínima</span></div>
        <div className="priority-rule-grid three-columns">
          <label><span>Urgente</span><input max="100" min="0" onChange={(event) => updateThreshold("urgent", event.target.value)} step="0.1" type="number" value={configuration.thresholds.urgent} /></label>
          <label><span>Alta</span><input max="100" min="0" onChange={(event) => updateThreshold("high", event.target.value)} step="0.1" type="number" value={configuration.thresholds.high} /></label>
          <label><span>Média</span><input max="100" min="0" onChange={(event) => updateThreshold("medium", event.target.value)} step="0.1" type="number" value={configuration.thresholds.medium} /></label>
        </div>
      </div>

      {message && <p className="action-feedback" role="status">{message}</p>}
      <div className="priority-rule-actions"><button disabled={saving} onClick={save} type="button">{saving ? "Salvando..." : "Salvar nova revisão"}</button></div>
    </section>
  );
}

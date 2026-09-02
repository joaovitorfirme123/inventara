"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CSV_FIELD_LABELS,
  DEFAULT_CSV_IMPORT_CONFIG,
  type CsvField,
  type CsvImportConfig,
} from "@/lib/csv";

type Template = {
  id: string;
  name: string;
  revisionId: string;
  version: number;
  configuration: CsvImportConfig;
};

type Props = {
  templates: Template[];
  canManage: boolean;
};

const fields = Object.keys(CSV_FIELD_LABELS) as CsvField[];
const requiredFields = new Set<CsvField>(["plu", "description", "currentStock"]);

function initialConfiguration(): CsvImportConfig {
  return {
    delimiter: ";",
    columns: { ...DEFAULT_CSV_IMPORT_CONFIG.columns },
    requiredFields: [...requiredFields],
  };
}

export function ImportTemplateManager({ templates, canManage }: Props) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string>();
  const [name, setName] = useState("");
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!canManage) return null;

  function startNew() {
    setTemplateId(undefined);
    setName("");
    setConfiguration(initialConfiguration());
    setMessage("");
  }

  function editTemplate(template: Template) {
    setTemplateId(template.id);
    setName(template.name);
    setConfiguration({
      delimiter: template.configuration.delimiter ?? ";",
      columns: { ...template.configuration.columns },
      requiredFields: [...template.configuration.requiredFields],
    });
    setMessage("");
  }

  function updateColumn(field: CsvField, value: string) {
    setConfiguration((current) => ({
      ...current,
      columns: { ...current.columns, [field]: value },
    }));
  }

  function toggleRequired(field: CsvField) {
    if (requiredFields.has(field)) return;
    setConfiguration((current) => ({
      ...current,
      requiredFields: current.requiredFields.includes(field)
        ? current.requiredFields.filter((item) => item !== field)
        : [...current.requiredFields, field],
    }));
  }

  async function saveTemplate() {
    if (!name.trim()) {
      setMessage("Informe um nome para o template.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/importacoes/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, name, configuration }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar o template.");
      startNew();
      setMessage("Template salvo. A próxima importação já poderá usá-lo.");
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="import-templates panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Configuração</span>
          <h2>Templates do ERP</h2>
        </div>
        <button className="secondary-button" onClick={startNew} type="button">Novo template</button>
      </div>
      <p className="template-help">
        Salve o nome exato das colunas exportadas pelo seu ERP. Cada salvamento cria uma nova revisão, preservada no histórico das importações.
      </p>

      {templates.length > 0 && (
        <div className="template-list">
          {templates.map((template) => (
            <button
              className={template.id === templateId ? "template-item selected" : "template-item"}
              key={template.id}
              onClick={() => editTemplate(template)}
              type="button"
            >
              <strong>{template.name}</strong>
              <span>Revisão {template.version}</span>
            </button>
          ))}
        </div>
      )}

      <div className="template-form">
        <label>
          Nome do template
          <input maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Ex.: ERP Loja Central" value={name} />
        </label>
        <label>
          Separador
          <select
            onChange={(event) => setConfiguration((current) => ({ ...current, delimiter: event.target.value as CsvImportConfig["delimiter"] }))}
            value={configuration.delimiter ?? ";"}
          >
            <option value=";">Ponto e vírgula (;)</option>
            <option value=",">Vírgula (,)</option>
            <option value="\t">Tabulação</option>
          </select>
        </label>
      </div>

      <div className="template-mappings">
        <div className="mapping-heading"><span>Campo Inventara</span><span>Nome da coluna no arquivo</span><span>Obrigatório</span></div>
        {fields.map((field) => (
          <div className="mapping-row" key={field}>
            <label htmlFor={`template-${field}`}>{CSV_FIELD_LABELS[field]}</label>
            <input id={`template-${field}`} onChange={(event) => updateColumn(field, event.target.value)} placeholder="Coluna do CSV" value={configuration.columns[field] ?? ""} />
            <input
              aria-label={`${CSV_FIELD_LABELS[field]} obrigatório`}
              checked={configuration.requiredFields.includes(field)}
              disabled={requiredFields.has(field)}
              onChange={() => toggleRequired(field)}
              type="checkbox"
            />
          </div>
        ))}
      </div>

      {message && <p className="template-message" role="status">{message}</p>}
      <div className="template-actions">
        <button disabled={saving} onClick={saveTemplate} type="button">{saving ? "Salvando..." : "Salvar template"}</button>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { InventoryAssistantChat } from "@/components/inventory-assistant-chat";

export const metadata: Metadata = { title: "Assistente de inventário" };

export default function AssistentePage() {
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Decisão operacional</span>
          <h1>Assistente</h1>
        </div>
        <p>Converse com a IA sobre quais subgrupos priorizar na próxima contagem, usando os indicadores atuais da sua organização.</p>
      </header>
      <InventoryAssistantChat />
    </>
  );
}

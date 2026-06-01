import { BellRing, Building2, FileText, Map, PhoneCall } from "lucide-react";

export function QuickActions() {
  return (
    <nav className="quick-actions" aria-label="Ações rápidas">
      <a href="#alertas"><BellRing aria-hidden="true" /> Consultar alertas</a>
      <a href="#boletins"><FileText aria-hidden="true" /> Ver boletins</a>
      <a href="#mapa-prioritario"><Map aria-hidden="true" /> Ver mapas e painéis</a>
      <a href="#municipios"><Building2 aria-hidden="true" /> Situação dos municípios</a>
      <a className="danger" href="tel:199"><PhoneCall aria-hidden="true" /> Canais de emergência</a>
    </nav>
  );
}

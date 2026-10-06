import { CloudRain, Landmark, ShieldAlert, Waves } from "lucide-react";
import { AlertDetailList } from "./alerts/AlertDetailList";
import { HighlightAlertCard } from "./alerts/HighlightAlertCard";
import { InstitutionAlertCard } from "./alerts/InstitutionAlertCard";

function automaticStatus(alerts, source) {
  if (alerts.state !== "ready") return "Dados indisponíveis no momento";
  const count = source === "INMET" ? alerts.inmetCount : alerts.cemadenCount;
  if (count === null || count === undefined) return 'Fonte temporariamente indisponível';
  return count > 0 ? `${count} aviso${count === 1 ? "" : "s"} vigente${count === 1 ? "" : "s"}` : "Sem alerta vigente";
}

export function OfficialAlertsSection({ alerts, emergency }) {
  const sources = [
    {
      tone: "idap",
      icon: ShieldAlert,
      title: "Defesa Civil / IDAP",
      description: "Alertas públicos e orientações emergenciais.",
      status: "Consulta pública automática não disponível",
      href: "https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/defesa-civil-alerta",
      action: "Acessar canal"
    },
    {
      tone: "inmet",
      icon: CloudRain,
      title: "INMET",
      description: "Avisos meteorológicos para o Tocantins.",
      status: automaticStatus(alerts, "INMET"),
      href: "https://avisos.inmet.gov.br/",
      action: "Ver avisos"
    },
    {
      tone: "cemaden",
      icon: Waves,
      title: "CEMADEN",
      description: "Risco de alagamento, enxurrada ou deslizamento.",
      status: automaticStatus(alerts, "CEMADEN"),
      href: "https://painelalertas.cemaden.gov.br/",
      action: "Acessar painel"
    },
    {
      id: "municipios",
      tone: "s2id",
      icon: Landmark,
      title: "S2ID",
      description: "Emergência e calamidade reconhecidas nos municípios.",
      status:
        emergency?.state === "ready"
          ? `${emergency.federal} reconhecimento${emergency.federal === 1 ? "" : "s"} vigente${emergency.federal === 1 ? "" : "s"}`
          : "Dados indisponíveis no momento",
      href: "https://s2id.mi.gov.br/paginas/series/",
      action: "Ver municípios"
    }
  ];

  return (
    <section className="alerts-section" id="alertas">
      <div className="section-heading">
        <p className="eyebrow">Avisos oficiais</p>
        <h2>Consulte os avisos oficiais vigentes</h2>
        <p>
          Avisos identificados em fontes oficiais, organizados para uma leitura rápida pela
          população. Confirme as orientações no canal emissor.
        </p>
      </div>
      <HighlightAlertCard
        alert={alerts.primaryDetail}
        state={alerts.state}
        activeCount={(alerts.inmetCount || 0) + (alerts.cemadenCount || 0)}
        partial={alerts.coverageComplete === false}
      />
      <div className="official-grid">
        {sources.map((source) => (
          <InstitutionAlertCard key={source.title} {...source} />
        ))}
      </div>
      <AlertDetailList details={alerts.details} />
    </section>
  );
}

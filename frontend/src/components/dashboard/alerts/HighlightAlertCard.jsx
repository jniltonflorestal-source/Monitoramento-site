import { ExternalLink, TriangleAlert } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";

const inmetHref = "https://avisos.inmet.gov.br/";

export function HighlightAlertCard({ alert, state, activeCount = 0, partial = false }) {
  if (state !== "ready") {
    return (
      <article className="highlight-alert neutral">
        <div className="highlight-alert-heading">
          <TriangleAlert aria-hidden="true" />
          <div>
            <p>Principal alerta identificado hoje</p>
            <h3>Dados indisponíveis no momento</h3>
          </div>
        </div>
        <p className="highlight-message">
          Não foi possível atualizar os detalhes agora. Consulte os canais oficiais.
        </p>
      </article>
    );
  }

  if (!alert) {
    const title = activeCount > 0 ? "Aviso vigente identificado" : partial ? 'Consulta parcial de alertas' : "Sem alerta vigente identificado";
    return (
      <article className="highlight-alert normal">
        <div className="highlight-alert-heading">
          <TriangleAlert aria-hidden="true" />
          <div>
            <p>Principal alerta identificado hoje</p>
            <h3>{title}</h3>
          </div>
        </div>
        <p className="highlight-message">
          {partial ? 'Uma das fontes não pôde ser confirmada. Consulte os canais oficiais; ausência de aviso na fonte disponível não confirma ausência de alertas no Estado.' : activeCount > 0
            ? "Consulte o órgão emissor para verificar município, período e orientações."
            : "Continue acompanhando as atualizações dos órgãos oficiais."}
        </p>
      </article>
    );
  }

  return (
    <article className="highlight-alert alert">
      <div className="highlight-alert-main">
        <div className="highlight-alert-heading">
          <TriangleAlert aria-hidden="true" />
          <div>
            <p>Principal alerta identificado hoje</p>
            <h3>{alert.title}</h3>
          </div>
        </div>
        <SeverityBadge severity={alert.severity} />
        <p className="alert-guidance">
          <strong>Orientação preventiva:</strong> {alert.recommendation}
        </p>
      </div>
      <dl className="highlight-alert-meta">
        <div>
          <dt>Vigência</dt>
          <dd>{alert.period}</dd>
        </div>
        <div>
          <dt>Municípios afetados</dt>
          <dd>{alert.location}</dd>
        </div>
        <div>
          <dt>Órgão emissor</dt>
          <dd>{alert.issuer}</dd>
        </div>
        <a href={inmetHref} target="_blank" rel="noreferrer">
          Abrir aviso oficial <ExternalLink aria-hidden="true" />
        </a>
      </dl>
    </article>
  );
}

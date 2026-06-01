import { ExternalLink } from "lucide-react";

export function TechnicalPanelsSection({ drought }) {
  return (
    <section className="technical-panels" id="mapas">
      <div className="section-heading">
        <p className="eyebrow">Mapas e painéis técnicos</p>
        <h2>Consulta territorial e produtos de monitoramento</h2>
        <p>
          Dados técnicos com indicação da fonte oficial e da referência disponível para apoiar a
          leitura pública e a atuação municipal.
        </p>
      </div>
      <div className="technical-map-link" id="seca">
        <div>
          <p className="eyebrow">Mapa técnico em destaque</p>
          <h3>Seca no Tocantins</h3>
          <p>
            A visualização municipal de seca foi movida para o Mapa prioritário, evitando duplicidade
            e mantendo a consulta territorial em um único painel.
          </p>
          {drought?.state === "ready" && (
            <small>
              {drought.summary?.com_seca ?? 0} municípios com algum grau de seca | referência {drought.reference}
            </small>
          )}
        </div>
        <a className="official-inline" href="#mapa-prioritario">
          Ver mapa de seca <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <p className="method-note">
        A seca monitorada por índices técnicos e a situação de emergência registrada no S2ID são
        informações complementares. Um município pode apresentar condição de seca sem ter decreto
        registrado, assim como pode haver decreto vigente relacionado a evento anterior.
      </p>
      <a className="official-inline" href="https://mapasecas.cemaden.gov.br/" target="_blank" rel="noreferrer">
        Consultar Monitor de Secas oficial <ExternalLink aria-hidden="true" />
      </a>
    </section>
  );
}

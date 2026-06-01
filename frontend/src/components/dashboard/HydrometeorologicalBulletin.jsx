import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Flame,
  Gauge,
  Landmark,
  Printer,
  ShieldAlert,
  Sun,
  Waves
} from "lucide-react";
import { getBoletimAtual } from "../../services/boletim";

const statusLabels = {
  normal: "Normalidade",
  atencao: "Atenção",
  alerta: "Alerta",
  emergencia: "Emergência",
  integracao: "Em integração",
  sem_dados: "Sem dados",
  rascunho: "Rascunho",
  publicado: "Publicado"
};

function label(value) {
  return statusLabels[value] || value || "Dado em integração";
}

function formatDate(value) {
  if (!value) return "Data em integração";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function asText(value) {
  if (value === null || value === undefined || value === "") return "Dado em integração";
  return value;
}

function BulletinMetric({ icon: Icon, title, value, description, source, tone = "sem_dados" }) {
  return (
    <article className={`bulletin-metric tone-${tone}`}>
      <header>
        <span><Icon aria-hidden="true" /></span>
        <strong>{title}</strong>
      </header>
      <b>{asText(value)}</b>
      <p>{asText(description)}</p>
      <small>Fonte: {asText(source)}</small>
    </article>
  );
}

export function HydrometeorologicalBulletin() {
  const [boletim, setBoletim] = useState(null);

  useEffect(() => {
    let active = true;
    getBoletimAtual().then((data) => {
      if (active) setBoletim(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const data = boletim || {};
  const riverTotals = data.rios || {};
  const status = data.situacaoGeral?.status || data.status || "sem_dados";
  const metrics = useMemo(() => ([
    {
      icon: ShieldAlert,
      title: "Alertas vigentes",
      value: `${data.alertas?.quantidade ?? 0} registro${data.alertas?.quantidade === 1 ? "" : "s"}`,
      description: data.alertas?.descricao,
      source: data.alertas?.fonte,
      tone: data.alertas?.status || "sem_dados"
    },
    {
      icon: CloudRain,
      title: "Chuva observada",
      value: data.chuva?.maiorAcumulado,
      description: `${data.chuva?.estacoesConsultadas ?? 0} estações consultadas | Destaque: ${asText(data.chuva?.municipioMaiorAcumulado)}`,
      source: data.chuva?.fonte,
      tone: "normal"
    },
    {
      icon: Waves,
      title: "Rios monitorados",
      value: `${data.rios?.estacoesMonitoradas ?? 0} estações`,
      description: `Normal: ${riverTotals.normal ?? 0} | Atenção: ${riverTotals.atencao ?? 0} | Alerta: ${riverTotals.alerta ?? 0} | Emergência: ${riverTotals.emergencia ?? 0}`,
      source: data.rios?.fonte,
      tone: (riverTotals.emergencia || riverTotals.alerta) ? "alerta" : "normal"
    },
    {
      icon: Gauge,
      title: "Usinas e vazões",
      value: data.usinas?.[0]?.vazaoDefluente || "Dado em integração",
      description: data.usinas?.[0]?.nome || "Vazões defluentes em estrutura de integração.",
      source: data.usinas?.[0]?.fonte || "Operadores / ONS / ANA",
      tone: "integracao"
    },
    {
      icon: Flame,
      title: "Focos de calor",
      value: `${data.focosCalor?.quantidade24h ?? 0} focos`,
      description: `${asText(data.focosCalor?.periodo)} | Total no período: ${data.focosCalor?.quantidadePeriodo ?? 0}`,
      source: data.focosCalor?.fonte,
      tone: (data.focosCalor?.quantidade24h || 0) > 0 ? "atencao" : "normal"
    },
    {
      icon: Sun,
      title: "Seca",
      value: data.seca?.situacao,
      description: `${data.seca?.municipiosAfetados ?? 0} municípios afetados ou em análise.`,
      source: data.seca?.fonte,
      tone: "atencao"
    }
  ]), [data]);

  return (
    <section className="hydro-bulletin" id="boletim-hidrometeorologico">
      <div className="bulletin-paper">
        <header className="bulletin-header">
          <div>
            <p className="eyebrow">Boletim Hidrometeorológico</p>
            <h2>Boletim Hidrometeorológico</h2>
            <p>
              Produto digital do Centro de Monitoramento para leitura rápida das condições
              hidrometeorológicas, ambientais e operacionais no Tocantins.
            </p>
          </div>
          <div className="bulletin-meta-card">
            <span className={`bulletin-status tone-${data.status || "rascunho"}`}>{label(data.status)}</span>
            <strong>Nº {asText(data.numero)}</strong>
            <small>Emissão: {formatDate(data.dataEmissao)}</small>
            <small>Referência: {asText(data.periodoReferencia)}</small>
          </div>
        </header>

        <div className={`bulletin-executive tone-${status}`}>
          <Landmark aria-hidden="true" />
          <div>
            <span>Situação geral</span>
            <strong>{label(status)}</strong>
            <p>{asText(data.situacaoGeral?.texto || data.resumoExecutivo)}</p>
            <small>Responsável: {asText(data.responsavel)}</small>
          </div>
        </div>

        <div className="bulletin-summary">
          <article>
            <AlertTriangle aria-hidden="true" />
            <strong>Resumo executivo</strong>
            <p>{asText(data.resumoExecutivo)}</p>
          </article>
          <article>
            <Droplets aria-hidden="true" />
            <strong>Previsão do tempo</strong>
            <p>{asText(data.previsaoTempo?.descricao)}</p>
            <small>Fonte: {asText(data.previsaoTempo?.fonte)}</small>
          </article>
        </div>

        <div className="bulletin-metrics">
          {metrics.map((metric) => (
            <BulletinMetric key={metric.title} {...metric} />
          ))}
        </div>

        <div className="bulletin-recommendations">
          <div>
            <p className="eyebrow">Recomendações à população</p>
            <h3>Como agir</h3>
          </div>
          <div>
            {(data.recomendacoes || []).map((item) => (
              <article key={item.tema}>
                <strong>{item.tema}</strong>
                <p>{item.texto}</p>
              </article>
            ))}
          </div>
        </div>

        <footer className="bulletin-footer">
          <div>
            <strong>Fontes oficiais consultadas</strong>
            <p>{(data.fontes || []).join(" | ") || "Dado em integração"}</p>
          </div>
          <button type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" /> Imprimir / Salvar PDF
          </button>
        </footer>
      </div>
    </section>
  );
}

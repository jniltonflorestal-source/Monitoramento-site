import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudRain,
  Download,
  Flame,
  Loader2,
  ShieldAlert,
  Sun,
  ThermometerSun,
  Waves
} from "lucide-react";
import { getBoletimAtual } from "../../services/boletim";
import { fetchMonitoringSnapshot } from "../../services/monitoringService";
import { getMeteorologiaTocantins } from "../../services/weather";

function formatDateTime(value) {
  if (!value) return "Não disponível no momento da geração";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function text(value, fallback = "Dado em integração") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function numberText(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "Não disponível";
  return `${value}${suffix}`;
}

function statusTone(value) {
  const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("emerg")) return "emergencia";
  if (normalized.includes("alert") || normalized.includes("perigo")) return "alerta";
  if (normalized.includes("aten") || normalized.includes("seca") || normalized.includes("foco")) return "atencao";
  if (normalized.includes("normal") || normalized.includes("sem alerta")) return "normal";
  return "sem_dados";
}

function InfoRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function BulletinBlock({ icon: Icon, title, value, description, source, updatedAt, tone = "sem_dados" }) {
  return (
    <article className={`generated-bulletin-card tone-${tone}`}>
      <header>
        <span><Icon aria-hidden="true" /></span>
        <div>
          <small>Monitoramento</small>
          <strong>{title}</strong>
        </div>
      </header>
      <b>{value}</b>
      <p>{description}</p>
      <footer>
        <small>Fonte: {source}</small>
        <small>Atualização: {updatedAt}</small>
      </footer>
    </article>
  );
}

function GeneratedBulletinTemplate({ payload }) {
  const boletim = payload?.boletim || {};
  const snapshot = payload?.snapshot || {};
  const weather = payload?.weather || [];
  const generatedAt = payload?.generatedAt || new Date().toISOString();
  const river = snapshot.rivers || {};
  const fire = snapshot.fire || {};
  const rain = snapshot.rain || {};
  const alerts = snapshot.alerts || {};
  const emergency = snapshot.emergency || {};
  const drought = snapshot.drought || {};
  const meteorologiaResumo = weather.slice(0, 8);
  const logoSrc = `${import.meta.env.BASE_URL}assets/logo-centro.png`;

  const blocks = [
    {
      icon: ShieldAlert,
      title: "Alertas vigentes",
      value: text(alerts.value || `${boletim.alertas?.quantidade ?? 0} registro(s)`),
      description: text(alerts.description || boletim.alertas?.descricao),
      source: text(alerts.source || boletim.alertas?.fonte || "IDAP / Defesa Civil Alerta / INMET / CEMADEN"),
      updatedAt: text(alerts.updatedAt || snapshot.updatedAt || boletim.dataEmissao, "Não disponível no momento da geração"),
      tone: statusTone(alerts.status || alerts.tone || boletim.alertas?.status)
    },
    {
      icon: AlertTriangle,
      title: "Emergência e calamidade",
      value: text(emergency.value || `${emergency.s2idFederal ?? 0} reconhecimento(s)`),
      description: text(emergency.description || "Reconhecimentos e registros administrativos consultados no S2ID."),
      source: text(emergency.source || "S2ID / SEDEC-MIDR"),
      updatedAt: text(emergency.updatedAt || snapshot.updatedAt, "Não disponível no momento da geração"),
      tone: statusTone(emergency.tone)
    },
    {
      icon: CloudRain,
      title: "Chuva observada",
      value: text(rain.value || boletim.chuva?.maiorAcumulado),
      description: text(rain.description || `${boletim.chuva?.estacoesConsultadas ?? 0} estações consultadas. Destaque: ${text(boletim.chuva?.municipioMaiorAcumulado)}.`),
      source: text(rain.source || boletim.chuva?.fonte || "CEMADEN / INMET / ANA / SEMARH"),
      updatedAt: text(rain.updatedAt || boletim.chuva?.atualizadoEm || snapshot.updatedAt, "Não disponível no momento da geração"),
      tone: statusTone(rain.tone || "normal")
    },
    {
      icon: Waves,
      title: "Rios monitorados",
      value: text(river.value || `${boletim.rios?.estacoesMonitoradas ?? 0} estação(ões)`),
      description: text(river.description || `Tendência predominante: ${text(boletim.rios?.tendenciaPredominante)}.`),
      source: text(river.source || boletim.rios?.fonte || "ANA / Telemetria"),
      updatedAt: text(river.updatedAt || boletim.rios?.atualizadoEm || snapshot.updatedAt, "Não disponível no momento da geração"),
      tone: statusTone(river.tone || "normal")
    },
    {
      icon: Flame,
      title: "Fogo e queimadas",
      value: text(fire.value || `${boletim.focosCalor?.quantidade24h ?? 0} foco(s)`),
      description: text(fire.description || `${text(boletim.focosCalor?.periodo)}. Área queimada: ${text(fire.burnedAreaLabel, "Não disponível no momento da geração")}.`),
      source: text(fire.source || boletim.focosCalor?.fonte || "INPE Queimadas / MapBiomas Fogo"),
      updatedAt: text(fire.updatedAt || boletim.focosCalor?.atualizadoEm || snapshot.updatedAt, "Não disponível no momento da geração"),
      tone: statusTone(fire.tone || "atencao")
    },
    {
      icon: Sun,
      title: "Seca",
      value: text(drought.value || boletim.seca?.situacao),
      description: text(drought.description || `${boletim.seca?.municipiosAfetados ?? 0} município(s) afetados ou em análise.`),
      source: text(drought.source || boletim.seca?.fonte || "Monitor de Secas / CEMADEN"),
      updatedAt: text(drought.updatedAt || boletim.seca?.atualizadoEm || snapshot.updatedAt, "Não disponível no momento da geração"),
      tone: statusTone(drought.tone || drought.value || boletim.seca?.situacao)
    }
  ];

  return (
    <section className="generated-bulletin-print" aria-label="Boletim Hidrometeorológico para impressão">
      <header className="generated-bulletin-cover">
        <div className="generated-bulletin-brand">
          <img src={logoSrc} alt="" />
          <div>
            <small>Governo do Tocantins | Defesa Civil Estadual</small>
            <strong>Centro de Monitoramento</strong>
          </div>
        </div>
        <div className="generated-bulletin-title">
          <p>Boletim Oficial</p>
          <h1>Boletim Hidrometeorológico</h1>
          <span>Monitoramento de chuva, rios, alertas, fogo, seca e meteorologia no Tocantins.</span>
        </div>
        <dl className="generated-bulletin-meta">
          <InfoRow label="Data e hora de geração" value={formatDateTime(generatedAt)} />
          <InfoRow label="Período de referência" value={text(boletim.periodoReferencia || snapshot.updatedAt)} />
          <InfoRow label="Número" value={text(boletim.numero, "Sob demanda")} />
          <InfoRow label="Emergência" value="Defesa Civil 199 | Bombeiros 193" />
        </dl>
      </header>

      <main className="generated-bulletin-body">
        <article className={`generated-bulletin-summary tone-${statusTone(snapshot.generalStatus?.tone || boletim.situacaoGeral?.status)}`}>
          <div>
            <small>Resumo executivo</small>
            <h2>Panorama atual do Tocantins</h2>
          </div>
          <p>{text(boletim.resumoExecutivo || snapshot.generalStatus?.note)}</p>
          <span>{text(boletim.situacaoGeral?.texto || snapshot.generalStatus?.label)}</span>
        </article>

        <section className="generated-bulletin-section">
          <div className="generated-section-heading">
            <small>Dados monitorados</small>
            <h2>Situação hidrometeorológica e ambiental</h2>
          </div>
          <div className="generated-bulletin-grid">
            {blocks.map((block) => <BulletinBlock key={block.title} {...block} />)}
          </div>
        </section>

        <section className="generated-bulletin-section page-break-before">
          <div className="generated-section-heading">
            <small>Condições meteorológicas</small>
            <h2>Meteorologia por municípios estratégicos</h2>
            <p>Resumo dos pontos acompanhados no painel. Dados indisponíveis são indicados como integração em andamento.</p>
          </div>
          <div className="generated-weather-list">
            {meteorologiaResumo.length ? meteorologiaResumo.map((item) => (
              <article key={item.municipio}>
                <ThermometerSun aria-hidden="true" />
                <div>
                  <strong>{item.municipio}</strong>
                  <span>
                    {text(item.regiao)} | Temperatura: {numberText(item.temperatura, " °C")} |
                    Umidade: {numberText(item.umidade, "%")} | Vento: {numberText(item.vento, " km/h")} |
                    Chuva: {numberText(item.chuva, " mm")}
                  </span>
                  <small>{text(item.condicao)} | Fonte: {text(item.fonte)} | Atualizado: {formatDateTime(item.atualizadoEm)}</small>
                </div>
              </article>
            )) : <p>Não disponível no momento da geração.</p>}
          </div>
        </section>

        <section className="generated-bulletin-section">
          <div className="generated-section-heading">
            <small>Orientações públicas</small>
            <h2>Recomendações à população</h2>
          </div>
          <div className="generated-recommendations">
            {(boletim.recomendacoes || []).length ? boletim.recomendacoes.map((item) => (
              <article key={item.tema}>
                <strong>{item.tema}</strong>
                <p>{item.texto}</p>
              </article>
            )) : (
              <>
                <article><strong>Chuva intensa</strong><p>Evite áreas alagadas e não atravesse enxurradas.</p></article>
                <article><strong>Baixa umidade</strong><p>Beba água e evite exposição prolongada ao sol.</p></article>
                <article><strong>Incêndios florestais</strong><p>Ao ver fumaça ou chamas, acione 193.</p></article>
              </>
            )}
            <article className="generated-emergency-box">
              <strong>Canais de emergência</strong>
              <p>Defesa Civil 199 | Corpo de Bombeiros 193.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="generated-bulletin-footer">
        <div>
          <strong>Fontes oficiais consultadas</strong>
          <p>{(boletim.fontes || []).join(" | ") || "IDAP | INMET | CEMADEN | ANA | INPE Queimadas | S2ID | Monitor de Secas"}</p>
        </div>
        <small>
          Boletim gerado em {formatDateTime(generatedAt)}. Fontes indisponíveis no momento da geração são indicadas como dado em integração ou não disponível.
        </small>
      </footer>
    </section>
  );
}

export function HydroBulletinPdfGenerator() {
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (status !== "ready") return;
    const timer = window.setTimeout(() => {
      window.print();
      setStatus("idle");
    }, 220);
    return () => window.clearTimeout(timer);
  }, [status]);

  const buttonLabel = useMemo(() => {
    if (status === "loading") return "Preparando boletim...";
    if (status === "error") return "Tentar gerar novamente";
    return "Gerar Boletim Hidrometeorológico em PDF";
  }, [status]);

  async function handleGenerate() {
    setStatus("loading");
    try {
      const [boletim, snapshot, weather] = await Promise.all([
        getBoletimAtual(),
        fetchMonitoringSnapshot(),
        getMeteorologiaTocantins().catch(() => [])
      ]);
      setPayload({ boletim, snapshot, weather, generatedAt: new Date().toISOString() });
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <div className="bulletin-generator-panel">
        <div>
          <span>Boletins da Defesa Civil</span>
          <h3>Gerar boletim sob demanda</h3>
          <p>O boletim é gerado com identidade institucional, usando os dados disponíveis no painel no momento da emissão.</p>
          {status === "error" && <small>Não foi possível gerar o boletim no momento.</small>}
        </div>
        <button type="button" onClick={handleGenerate} disabled={status === "loading"}>
          {status === "loading" ? <Loader2 aria-hidden="true" className="spin" /> : <Download aria-hidden="true" />}
          {buttonLabel}
        </button>
      </div>
      <div className="generated-bulletin-root" aria-hidden={status !== "ready"}>
        {payload && <GeneratedBulletinTemplate payload={payload} />}
      </div>
    </>
  );
}

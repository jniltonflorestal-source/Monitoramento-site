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

const MAP_WIDTH = 360;
const MAP_HEIGHT = 430;

function formatDateTime(value) {
  if (!value) return "Não disponível no momento da geração";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function text(value, fallback = "Dado em integração") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function numberText(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "Não disponível";
  return `${value}${suffix}`;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function statusTone(value) {
  const normalized = normalize(value);
  if (normalized.includes("emerg") || normalized.includes("severa") || normalized.includes("extrema")) return "emergencia";
  if (normalized.includes("alert") || normalized.includes("perigo") || normalized.includes("moderada")) return "alerta";
  if (normalized.includes("aten") || normalized.includes("seca") || normalized.includes("foco") || normalized.includes("fraca")) return "atencao";
  if (normalized.includes("normal") || normalized.includes("sem alerta") || normalized.includes("sem seca")) return "normal";
  return "sem_dados";
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCoordinates(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates.flat();
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}

function getBounds(features = []) {
  const coords = features.flatMap((feature) => getCoordinates(feature.geometry));
  if (!coords.length) return { minLon: -50.75, maxLon: -45.85, minLat: -13.55, maxLat: -5.05 };
  return coords.reduce(
    (bounds, [lon, lat]) => ({
      minLon: Math.min(bounds.minLon, lon),
      maxLon: Math.max(bounds.maxLon, lon),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat)
    }),
    { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }
  );
}

function project([lon, lat], bounds, width = MAP_WIDTH, height = MAP_HEIGHT) {
  const padding = 16;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const x = padding + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * usableWidth;
  const y = padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 1)) * usableHeight;
  return [x, y];
}

function featurePath(feature, bounds) {
  const drawRing = (ring) => ring.map((coord, index) => {
    const [x, y] = project(coord, bounds);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";

  if (feature.geometry?.type === "Polygon") return feature.geometry.coordinates.map(drawRing).join(" ");
  if (feature.geometry?.type === "MultiPolygon") {
    return feature.geometry.coordinates.flatMap((polygon) => polygon.map(drawRing)).join(" ");
  }
  return "";
}

function featureCentroid(feature) {
  const coords = getCoordinates(feature.geometry);
  if (!coords.length) return null;
  const sum = coords.reduce((acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat], [0, 0]);
  return [sum[0] / coords.length, sum[1] / coords.length];
}

function municipalityName(feature) {
  return feature?.properties?.nome || feature?.properties?.name || feature?.properties?.NM_MUN || "";
}

function rainColor(amount) {
  const value = safeNumber(amount) || 0;
  if (value > 50) return "#2563eb";
  if (value > 30) return "#38bdf8";
  if (value > 10) return "#22c55e";
  if (value > 0) return "#facc15";
  return "#94a3b8";
}

function riverColor(status) {
  const tone = statusTone(status);
  if (tone === "emergencia") return "#d73027";
  if (tone === "alerta") return "#f59a23";
  if (tone === "atencao") return "#d9a312";
  return "#16734c";
}

function droughtColor(level) {
  const normalized = normalize(level);
  if (normalized.includes("excepcional")) return "#5f0f40";
  if (normalized.includes("extrema")) return "#7f1d1d";
  if (normalized.includes("grave") || normalized.includes("severa")) return "#d73027";
  if (normalized.includes("moderada")) return "#f59a23";
  if (normalized.includes("fraca")) return "#facc15";
  if (normalized.includes("sem seca")) return "#c7f0cf";
  return "#e5e7eb";
}

async function loadMunicipalityGeoJson() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/tocantins_municipios.geojson`, { cache: "no-store" });
  if (!response.ok) throw new Error("Base municipal indisponível");
  return response.json();
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

function SectionHeader({ eyebrow, title, subtitle, tone = "navy" }) {
  return (
    <div className={`generated-section-heading theme-${tone}`}>
      <small>{eyebrow}</small>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

function BulletinPage({ eyebrow, title, subtitle, tone = "navy", children, className = "" }) {
  return (
    <section className={`generated-bulletin-section generated-editorial-page theme-${tone} ${className}`}>
      <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} tone={tone} />
      {children}
    </section>
  );
}

function EditorialCallout({ label, value, text: description, tone = "navy" }) {
  return (
    <aside className={`generated-editorial-callout theme-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{description}</p>
    </aside>
  );
}

function MapLegend({ items }) {
  return (
    <div className="generated-map-legend">
      {items.map((item) => (
        <span key={item.label}>
          <i style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TocantinsMiniMap({ geoJson, points = [], droughtMunicipalities = [] }) {
  const features = geoJson?.features || [];
  const bounds = getBounds(features);
  const droughtByName = new Map(droughtMunicipalities.map((item) => [normalize(item.nome || item.municipio || item.name), item]));

  return (
    <svg className="generated-mini-map" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label="Mapa temático do Tocantins">
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} rx="10" fill="#f8fafc" />
      <g>
        {features.map((feature) => {
          const name = normalize(municipalityName(feature));
          const drought = droughtByName.get(name);
          return (
            <path
              key={feature.properties?.codarea || name}
              d={featurePath(feature, bounds)}
              fill={drought ? droughtColor(drought.grauSeca || drought.grau || drought.situacao) : "#edf2f7"}
              stroke="#ffffff"
              strokeWidth="0.65"
            />
          );
        })}
      </g>
      <g>
        {points.slice(0, 180).map((point, index) => {
          const latitude = safeNumber(point.latitude ?? point.lat);
          const longitude = safeNumber(point.longitude ?? point.lon ?? point.lng);
          if (latitude === null || longitude === null) return null;
          const [x, y] = project([longitude, latitude], bounds);
          const color = point.color || "#f59a23";
          const radius = point.radius || 4.2;
          return (
            <circle
              key={`${point.id || point.nome || point.name || index}-${x}-${y}`}
              cx={x}
              cy={y}
              r={radius}
              fill={color}
              fillOpacity="0.88"
              stroke="#ffffff"
              strokeWidth="1.1"
            />
          );
        })}
      </g>
    </svg>
  );
}

function BulletinMapCard({ title, subtitle, geoJson, points, droughtMunicipalities, legend, footer, children }) {
  return (
    <article className="generated-map-card">
      <header>
        <div>
          <small>Mapa temático</small>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      {geoJson ? (
        <>
          <TocantinsMiniMap geoJson={geoJson} points={points} droughtMunicipalities={droughtMunicipalities} />
          <MapLegend items={legend} />
        </>
      ) : (
        <div className="generated-map-placeholder">Base cartográfica em integração no momento da geração.</div>
      )}
      {children}
      {footer && <small className="generated-map-note">{footer}</small>}
    </article>
  );
}

function CompactTable({ columns, rows, emptyMessage }) {
  if (!rows.length) return <p className="generated-empty-note">{emptyMessage}</p>;
  return (
    <table className="generated-table">
      <thead>
        <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id || `${row.nome || row.municipio}-${index}`}>
            {columns.map((column) => <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildGeneratedData({ snapshot, boletim, weather }) {
  const rainStations = snapshot.rain?.stations || [];
  const riverStations = snapshot.rivers?.stations || [];
  const firePoints = snapshot.fire?.points || [];
  const droughtMunicipalities = snapshot.drought?.municipalities || [];
  const topRain = [...rainStations]
    .sort((a, b) => (safeNumber(b.chuva24h ?? b.amount) || 0) - (safeNumber(a.chuva24h ?? a.amount) || 0))
    .slice(0, 5);

  const hydroCounts = riverStations.reduce(
    (acc, station) => {
      const tone = statusTone(station.status || station.situacao || station.condition);
      acc.total += 1;
      if (tone === "emergencia") acc.emergencia += 1;
      else if (tone === "alerta") acc.alerta += 1;
      else if (tone === "atencao") acc.atencao += 1;
      else acc.normal += 1;
      const trend = normalize(station.trend || station.tendencia);
      if (trend.includes("sub")) acc.subida += 1;
      if (trend.includes("desc")) acc.descida += 1;
      return acc;
    },
    {
      total: 0,
      normal: boletim.rios?.normal || 0,
      atencao: boletim.rios?.atencao || 0,
      alerta: boletim.rios?.alerta || 0,
      emergencia: boletim.rios?.emergencia || 0,
      subida: 0,
      descida: 0
    }
  );

  const fireByCity = firePoints.reduce((acc, point) => {
    const city = point.city || point.municipio || "Município não informado";
    acc.set(city, (acc.get(city) || 0) + 1);
    return acc;
  }, new Map());

  const severeDrought = droughtMunicipalities
    .filter((item) => ["emergencia", "alerta"].includes(statusTone(item.grauSeca || item.grau || item.situacao)))
    .slice(0, 8);

  return {
    rainStations,
    riverStations,
    firePoints,
    droughtMunicipalities,
    topRain,
    hydroCounts,
    fireByCity: [...fireByCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    severeDrought,
    weatherRows: (weather || []).slice(0, 8)
  };
}

function GeneratedBulletinTemplate({ payload }) {
  const boletim = payload?.boletim || {};
  const snapshot = payload?.snapshot || {};
  const weather = payload?.weather || [];
  const geoJson = payload?.geoJson || null;
  const generatedAt = payload?.generatedAt || new Date().toISOString();
  const river = snapshot.rivers || {};
  const fire = snapshot.fire || {};
  const rain = snapshot.rain || {};
  const alerts = snapshot.alerts || {};
  const emergency = snapshot.emergency || {};
  const drought = snapshot.drought || {};
  const data = buildGeneratedData({ snapshot, boletim, weather });
  const logoSrc = `${import.meta.env.BASE_URL}assets/logo-centro.png`;

  const rainPoints = data.rainStations.map((station) => ({
    ...station,
    color: rainColor(station.chuva24h ?? station.amount),
    radius: Math.min(7, 3.4 + ((safeNumber(station.chuva24h ?? station.amount) || 0) / 18))
  }));
  const riverPoints = data.riverStations.map((station) => ({
    ...station,
    color: riverColor(station.status || station.situacao),
    radius: ["alerta", "emergencia"].includes(statusTone(station.status || station.situacao)) ? 5.8 : 4.1
  }));
  const fireMapPoints = data.firePoints.map((point) => ({
    ...point,
    color: "#f97316",
    radius: 3.4
  }));

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
      icon: CloudRain,
      title: "Chuva observada 24h",
      value: text(rain.value || boletim.chuva?.maiorAcumulado),
      description: text(rain.description || `${boletim.chuva?.estacoesConsultadas ?? 0} estações consultadas.`),
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
      description: text(fire.description || `${text(boletim.focosCalor?.periodo)}. Área queimada: ${text(fire.burnedAreaLabel, "Não disponível")}.`),
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
    },
    {
      icon: AlertTriangle,
      title: "Emergência e calamidade",
      value: text(emergency.value || `${emergency.s2idFederal ?? emergency.federal ?? 0} reconhecimento(s)`),
      description: text(emergency.description || "Reconhecimentos e registros administrativos consultados no S2ID."),
      source: text(emergency.source || "S2ID / SEDEC-MIDR"),
      updatedAt: text(emergency.updatedAt || snapshot.updatedAt, "Não disponível no momento da geração"),
      tone: statusTone(emergency.tone)
    }
  ];
  const overviewTiles = blocks.map((block) => ({
    title: block.title,
    value: block.value,
    tone: block.tone
  }));

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
        <article className={`generated-bulletin-summary generated-cover-panorama tone-${statusTone(snapshot.generalStatus?.tone || boletim.situacaoGeral?.status)}`}>
          <div>
            <small>Panorama Atual | Resumo executivo</small>
            <h2>{text(boletim.situacaoGeral?.texto || snapshot.generalStatus?.label, "Monitoramento em andamento")}</h2>
          </div>
          <p>{text(boletim.resumoExecutivo || snapshot.generalStatus?.note)}</p>
        </article>
        <div className="generated-cover-indicators">
          {overviewTiles.map((item) => (
            <div key={item.title} className={`tone-${item.tone}`}>
              <span>{item.title}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <main className="generated-bulletin-body">
        <BulletinPage
          eyebrow="Situação monitorada"
          title="Indicadores principais"
          subtitle="Leitura integrada das condições acompanhadas pelo Centro de Monitoramento para orientar a população e apoiar decisões operacionais."
          tone="navy"
          className="page-break-before"
        >
          <div className="generated-bulletin-grid">
            {blocks.map((block) => <BulletinBlock key={block.title} {...block} />)}
          </div>
          <EditorialCallout
            label="Destaque operacional"
            value={text(snapshot.generalStatus?.label || boletim.situacaoGeral?.status, "Monitoramento ativo")}
            text="Os indicadores devem ser lidos em conjunto com os mapas temáticos das páginas seguintes e confirmados nas fontes oficiais."
            tone="navy"
          />
        </BulletinPage>

        <BulletinPage
          eyebrow="Chuva observada"
          title="Precipitação acumulada nas últimas 24h"
          subtitle="Mapa de chuva observada 24h com pontos de estações, maiores acumulados e leitura rápida da distribuição espacial no Estado."
          tone="rain"
          className="page-break-before"
        >
          <div className="generated-map-page">
            <BulletinMapCard
              title="Mapa de chuva observada 24h"
              subtitle={text(rain.description, "Pontos de pluviômetros e estações integradas quando disponíveis.")}
              geoJson={geoJson}
              points={rainPoints}
              legend={[
                { label: "0 mm", color: "#94a3b8" },
                { label: "1 a 10 mm", color: "#facc15" },
                { label: "10 a 30 mm", color: "#22c55e" },
                { label: "30 a 50 mm", color: "#38bdf8" },
                { label: "Acima de 50 mm", color: "#2563eb" }
              ]}
              footer={`Fonte: ${text(rain.source || boletim.chuva?.fonte || "CEMADEN / INMET / ANA / SEMARH")} | Atualização: ${text(rain.updatedAt || boletim.chuva?.atualizadoEm || snapshot.updatedAt)}`}
            >
              <div className="generated-map-summary">
                <strong>{text(rain.value || boletim.chuva?.maiorAcumulado)}</strong>
                <span>{text(rain.description, "Maior acumulado observado no período de referência.")}</span>
              </div>
            </BulletinMapCard>
            <article className="generated-map-detail">
              <h3>Maiores acumulados</h3>
              <CompactTable
                columns={[
                  { key: "pos", label: "#", render: (_, index) => index + 1 },
                  { key: "municipio", label: "Município/estação", render: (row) => row.municipio || row.city || row.nome },
                  { key: "fonte", label: "Fonte", render: (row) => row.fonte || row.source || "Rede integrada" },
                  { key: "chuva24h", label: "24h", render: (row) => `${(safeNumber(row.chuva24h ?? row.amount) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm` }
                ]}
                rows={data.topRain}
                emptyMessage="Sem estações com leitura disponível no momento da geração."
              />
              <EditorialCallout
                label="Comentário operacional"
                value={text(rain.value || boletim.chuva?.maiorAcumulado)}
                text="Valores baixos não eliminam a necessidade de acompanhamento de avisos meteorológicos, especialmente em eventos localizados."
                tone="rain"
              />
            </article>
          </div>
        </BulletinPage>

        <BulletinPage
          eyebrow="Rios monitorados"
          title="Situação hidrológica"
          subtitle="Estações fluviométricas monitoradas por status, resumo hidrológico e tendência predominante para leitura operacional."
          tone="river"
          className="page-break-before"
        >
          <div className="generated-map-page">
            <BulletinMapCard
              title="Mapa de rios monitorados"
              subtitle="Estações fluviométricas com simbologia por situação hidrológica."
              geoJson={geoJson}
              points={riverPoints}
              legend={[
                { label: "Normal", color: "#16734c" },
                { label: "Atenção", color: "#d9a312" },
                { label: "Alerta", color: "#f59a23" },
                { label: "Emergência", color: "#d73027" }
              ]}
              footer={`Fonte: ${text(river.source || boletim.rios?.fonte || "ANA / Telemetria")} | Atualização: ${text(river.updatedAt || boletim.rios?.atualizadoEm || snapshot.updatedAt)}`}
            >
              <dl className="generated-compact-summary">
                <InfoRow label="Estações" value={data.hydroCounts.total || boletim.rios?.estacoesMonitoradas || "Dado em integração"} />
                <InfoRow label="Normal" value={data.hydroCounts.normal} />
                <InfoRow label="Atenção" value={data.hydroCounts.atencao} />
                <InfoRow label="Alerta" value={data.hydroCounts.alerta} />
                <InfoRow label="Emergência" value={data.hydroCounts.emergencia} />
                <InfoRow label="Tendência" value={text(boletim.rios?.tendenciaPredominante || (data.hydroCounts.subida > data.hydroCounts.descida ? "Subida" : "Estável"))} />
              </dl>
            </BulletinMapCard>
            <article className="generated-map-detail">
              <h3>Destaque operacional</h3>
              <EditorialCallout
                label="Leitura rápida"
                value={text(river.value || `${boletim.rios?.estacoesMonitoradas ?? 0} estação(ões)`)}
                text={text(river.description || `Tendência predominante: ${text(boletim.rios?.tendenciaPredominante)}.`)}
                tone="river"
              />
              <h3>Meteorologia por regiões estratégicas</h3>
              <CompactTable
                columns={[
                  { key: "municipio", label: "Município" },
                  { key: "temperatura", label: "Temp.", render: (row) => numberText(row.temperatura, " °C") },
                  { key: "umidade", label: "Umidade", render: (row) => numberText(row.umidade, "%") },
                  { key: "vento", label: "Vento", render: (row) => numberText(row.vento, " km/h") },
                  { key: "chuva", label: "Chuva", render: (row) => numberText(row.chuva, " mm") },
                  { key: "condicao", label: "Condição", render: (row) => text(row.condicao) }
                ]}
                rows={data.weatherRows}
                emptyMessage="Meteorologia por municípios em integração."
              />
            </article>
          </div>
        </BulletinPage>

        <BulletinPage
          eyebrow="Fogo, queimadas e seca"
          title="Monitoramento ambiental"
          subtitle="Síntese espacial dos focos de calor e da condição de seca para apoiar prevenção, resposta e planejamento municipal."
          tone="fire"
          className="page-break-before"
        >
          <div className="generated-map-grid">
            <BulletinMapCard
              title="Mapa de focos de calor"
              subtitle={text(fire.description, "Pontos detectados por satélite no arquivo diário do INPE.")}
              geoJson={geoJson}
              points={fireMapPoints}
              legend={[
                { label: "Foco de calor", color: "#f97316" },
                { label: "Base municipal", color: "#edf2f7" }
              ]}
              footer={`Fonte: ${text(fire.source || "INPE Queimadas / MapBiomas Fogo")} | Atualização: ${text(fire.updatedAt || boletim.focosCalor?.atualizadoEm || snapshot.updatedAt)}`}
            >
              <div className="generated-map-summary">
                <strong>{text(fire.value || `${data.firePoints.length} foco(s)`)}</strong>
                <span>Área queimada: {text(fire.burnedAreaLabel || fire.burnedArea?.hectares, "MapBiomas Fogo em integração")}.</span>
              </div>
              {!!data.fireByCity.length && (
                <p className="generated-map-note">
                  Municípios com mais focos: {data.fireByCity.map(([city, count]) => `${city} (${count})`).join(", ")}.
                </p>
              )}
            </BulletinMapCard>
            <BulletinMapCard
              title="Mapa de seca"
              subtitle="Municípios coloridos por grau de seca quando a base municipal estiver disponível."
              geoJson={geoJson}
              droughtMunicipalities={data.droughtMunicipalities}
              legend={[
                { label: "Sem seca", color: "#c7f0cf" },
                { label: "Seca fraca", color: "#facc15" },
                { label: "Moderada", color: "#f59a23" },
                { label: "Severa/grave", color: "#d73027" },
                { label: "Extrema/excepcional", color: "#5f0f40" }
              ]}
              footer={`Fonte: ${text(drought.source || boletim.seca?.fonte || "Monitor de Secas / CEMADEN")} | Atualização: ${text(drought.updatedAt || boletim.seca?.atualizadoEm || snapshot.updatedAt)}`}
            >
              <div className="generated-map-summary">
                <strong>{text(drought.value || boletim.seca?.situacao)}</strong>
                <span>{text(drought.description || `${boletim.seca?.municipiosAfetados ?? 0} município(s) afetados ou em análise.`)}</span>
              </div>
              {!!data.severeDrought.length && (
                <p className="generated-map-note">
                  Municípios em condição mais severa: {data.severeDrought.map((item) => item.nome || item.municipio).filter(Boolean).join(", ")}.
                </p>
              )}
            </BulletinMapCard>
          </div>
        </BulletinPage>

        <BulletinPage
          eyebrow="Orientações públicas"
          title="Recomendações à população"
          subtitle="Medidas simples para reduzir risco em situações de chuva intensa, estiagem, baixa umidade, incêndios florestais e emergência."
          tone="guidance"
          className="page-break-before"
        >
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
        </BulletinPage>
      </main>

      <footer className="generated-bulletin-footer">
        <div>
          <strong>Fontes oficiais consultadas</strong>
          <p>{(boletim.fontes || []).join(" | ") || "IDAP | INMET | CEMADEN | ANA | INPE Queimadas | S2ID | Monitor de Secas"}</p>
        </div>
        <small>
          Boletim gerado em {formatDateTime(generatedAt)}. Este produto organiza informações públicas e dados disponíveis no painel; confirme alertas nos canais oficiais emissores.
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
    }, 260);
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
      const [boletim, snapshot, weather, geoJson] = await Promise.all([
        getBoletimAtual(),
        fetchMonitoringSnapshot(),
        getMeteorologiaTocantins().catch(() => []),
        loadMunicipalityGeoJson().catch(() => null)
      ]);
      setPayload({ boletim, snapshot, weather, geoJson, generatedAt: new Date().toISOString() });
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
          <p>O boletim é gerado com template institucional, mapas temáticos e dados disponíveis no painel no momento da emissão.</p>
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

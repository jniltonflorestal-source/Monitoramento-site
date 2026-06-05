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
import { getAnaStationReading } from "../../services/ana";
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

function formatNumberPt(value, options = {}) {
  const parsed = safeNumber(value);
  if (parsed === null) return "Não disponível";
  return parsed.toLocaleString("pt-BR", options);
}

function formatAreaHa(value) {
  const parsed = safeNumber(value);
  if (parsed === null) return "MapBiomas Fogo em integração";
  return `${parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
}

function updateLabel(value) {
  if (!value || value === "Fontes oficiais consultadas") return "Atualização não disponível";
  return value;
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

function droughtClass(item) {
  return item?.classe || item?.grauSeca || item?.grau || item?.situacao || item?.nivel || "";
}

function droughtName(item) {
  return item?.nome || item?.municipio || item?.name || "";
}

function operationalRainComment(maximum) {
  const value = safeNumber(maximum) || 0;
  if (value >= 50) return "Chuva expressiva observada. Recomenda-se acompanhar avisos oficiais e áreas sujeitas a alagamento.";
  if (value >= 30) return "Acumulado relevante observado. Manter atenção para chuva localmente forte.";
  if (value > 0) return "Sem acumulados expressivos no período, mas eventos localizados ainda devem ser acompanhados.";
  return "Sem acumulados expressivos nas estações consultadas no período.";
}

function operationalWeatherComment(rows = []) {
  const lowHumidity = rows.filter((row) => safeNumber(row.umidade) !== null && safeNumber(row.umidade) < 30).length;
  const rainPoints = rows.filter((row) => safeNumber(row.chuva) !== null && safeNumber(row.chuva) > 0).length;
  const hottest = rows
    .map((row) => ({ ...row, tempValue: safeNumber(row.temperatura) }))
    .filter((row) => row.tempValue !== null)
    .sort((a, b) => b.tempValue - a.tempValue)[0];

  if (lowHumidity) return `${lowHumidity} ponto(s) estratégico(s) indicam baixa umidade. Reforce hidratação e atenção a grupos vulneráveis.`;
  if (rainPoints) return `${rainPoints} ponto(s) estratégico(s) registram chuva ou previsão de chuva no período consultado.`;
  if (hottest) return `Maior temperatura no recorte: ${formatNumberPt(hottest.tempValue, { maximumFractionDigits: 1 })} °C em ${hottest.municipio || "ponto monitorado"}.`;
  return "Meteorologia por regiões estratégicas em acompanhamento, com atualização conforme as fontes integradas.";
}

function buildExecutiveSummary({ alerts, rain, river, fire, drought, emergency }) {
  const parts = ["O Tocantins apresenta monitoramento ativo de chuva, rios, focos de calor, seca e alertas oficiais."];
  if (statusTone(alerts?.tone || alerts?.status || alerts?.value) !== "normal") {
    parts.push(`Alertas oficiais: ${text(alerts?.value, "consulta em andamento")}.`);
  }
  const rainValue = safeNumber(String(rain?.value || "").replace(",", "."));
  if (rainValue !== null && rainValue >= 30) parts.push(`Chuva observada com maior acumulado de ${rain.value}.`);
  if (statusTone(river?.tone || river?.status) !== "normal") parts.push("Há condição hidrológica que merece acompanhamento.");
  if ((safeNumber(String(fire?.value || "").match(/\d+/)?.[0]) || 0) > 0) parts.push(`Focos de calor registrados no período: ${fire.value}.`);
  if (["alerta", "emergencia"].includes(statusTone(drought?.value || drought?.tone))) parts.push(`Condição de seca em destaque: ${drought.value}.`);
  if ((safeNumber(String(emergency?.value || "").match(/\d+/)?.[0]) || 0) > 0) parts.push(`Municípios com reconhecimento vigente: ${emergency.value}.`);
  parts.push("Recomenda-se acompanhar os canais oficiais da Defesa Civil e dos órgãos emissores.");
  return parts.join(" ");
}

async function loadMunicipalityGeoJson() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/tocantins_municipios.geojson`, { cache: "no-store" });
  if (!response.ok) throw new Error("Base municipal indisponível");
  return response.json();
}

async function loadRiverReadings(stations = []) {
  const sample = stations.slice(0, 15);
  const settled = await Promise.allSettled(sample.map(async (station) => {
    const reading = await getAnaStationReading(station.code);
    return [station.code, reading];
  }));
  return Object.fromEntries(
    settled
      .filter((item) => item.status === "fulfilled" && item.value?.[1])
      .map((item) => item.value)
  );
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
  const droughtByName = new Map(droughtMunicipalities.map((item) => [normalize(droughtName(item)), item]));

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
              fill={drought ? droughtColor(droughtClass(drought)) : "#edf2f7"}
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

function BulletinMapCard({ title, subtitle, geoJson, points, droughtMunicipalities, legend, footer, children, className = "" }) {
  return (
    <article className={`generated-map-card ${className}`}>
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

function PageFooter({ source, updatedAt }) {
  return (
    <footer className="generated-page-footer">
      <span>Centro de Monitoramento da Defesa Civil do Tocantins</span>
      <span>{source}</span>
      <span>{updatedAt}</span>
    </footer>
  );
}

function PageShell({ label, title, subtitle, tone = "navy", children, source = "Fontes oficiais", updatedAt = "Atualização no momento da geração", className = "" }) {
  return (
    <section className={`generated-page-shell theme-${tone} ${className}`}>
      <span className="generated-print-kicker">Boletim Hidrometeorológico</span>
      <SectionHeader eyebrow={label} title={title} subtitle={subtitle} tone={tone} />
      <div className="generated-page-content">{children}</div>
      <PageFooter source={source} updatedAt={updatedAt} />
    </section>
  );
}

function CoverKpi({ title, value, tone = "sem_dados" }) {
  return (
    <article className={`generated-cover-kpi tone-${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

function BigMetric({ title, value, description, tone = "navy" }) {
  return (
    <article className={`generated-big-metric theme-${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      {description && <p>{description}</p>}
    </article>
  );
}

function BarList({ rows, emptyMessage, tone = "navy" }) {
  const max = Math.max(1, ...rows.map((row) => safeNumber(row.value) || 0));
  if (!rows.length) return <p className="generated-empty-note">{emptyMessage}</p>;
  return (
    <div className={`generated-bar-list theme-${tone}`}>
      {rows.map((row) => {
        const value = safeNumber(row.value) || 0;
        return (
          <div key={row.label} className="generated-bar-row">
            <span>{row.label}</span>
            <strong>{value.toLocaleString("pt-BR")}</strong>
            <i style={{ width: `${Math.max(6, (value / max) * 100)}%` }} />
          </div>
        );
      })}
    </div>
  );
}

function WeatherCards({ rows }) {
  if (!rows.length) return <p className="generated-empty-note">Meteorologia regional indisponível no momento.</p>;
  return (
    <div className="generated-weather-cards">
      {rows.map((row) => {
        const unavailable = !row.temperatura && !row.umidade && !row.vento && !row.chuva;
        return (
          <article key={`${row.municipio}-${row.regiao}`} className={unavailable ? "is-unavailable" : ""}>
            <small>{row.regiao || "Região estratégica"}</small>
            <strong>{row.municipio || "Município estratégico"}</strong>
            {unavailable ? (
              <p>Dado não disponível no momento.</p>
            ) : (
              <dl>
                <InfoRow label="Temp." value={numberText(row.temperatura, " °C")} />
                <InfoRow label="Umidade" value={numberText(row.umidade, "%")} />
                <InfoRow label="Vento" value={numberText(row.vento, " km/h")} />
                <InfoRow label="Chuva" value={numberText(row.chuva, " mm")} />
              </dl>
            )}
            <span>{text(row.condicao, "Condição em integração")}</span>
          </article>
        );
      })}
    </div>
  );
}

function S2idCards({ emergency, snapshot }) {
  const points = snapshot.emergency?.points || [];
  if (!points.length) {
    return (
      <div className="generated-s2id-cards">
        <article>
          <small>S2ID / SEDEC-MIDR</small>
          <strong>{text(emergency.value || "Sem registros ativos no momento")}</strong>
          <p>{text(emergency.description || "Não há lista municipal publicada na base local para este boletim.")}</p>
        </article>
      </div>
    );
  }
  return (
    <div className="generated-s2id-cards">
      {points.slice(0, 10).map((item) => (
        <article key={`${item.municipio}-${item.situacao}`}>
          <small>{item.situacao || "Reconhecimento vigente"}</small>
          <strong>{item.municipio || "Município"}</strong>
          <p>{item.desastre || "Desastre não informado"} {item.cobrade ? `| COBRADE ${item.cobrade}` : ""}</p>
          <span>{updateLabel(item.data || item.reconhecimento || item.updatedAt)}</span>
        </article>
      ))}
    </div>
  );
}

function buildGeneratedData({ snapshot, boletim, weather, riverReadings = {} }) {
  const rainStations = snapshot.rain?.stations || [];
  const riverStations = snapshot.rivers?.stations || [];
  const firePoints = snapshot.fire?.points || [];
  const droughtMunicipalities = snapshot.drought?.municipalities || [];
  const rainByMunicipality = [...rainStations]
    .sort((a, b) => (safeNumber(b.chuva24h ?? b.amount) || 0) - (safeNumber(a.chuva24h ?? a.amount) || 0))
    .reduce((acc, station) => {
      const key = normalize(station.municipio || station.city || station.nome || station.name);
      if (!acc.has(key)) acc.set(key, station);
      return acc;
    }, new Map());
  const topRain = [...rainByMunicipality.values()]
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

  const riverRows = riverStations.slice(0, 15).map((station) => {
    const reading = riverReadings[station.code];
    const trendLabel = reading?.trend?.label || "Tendência em integração";
    const status = station.status || station.situacao || station.condition || "Normal";
    return {
      ...station,
      level: reading?.level ?? null,
      trendLabel,
      trendDirection: reading?.trend?.direction || "unknown",
      status,
      updatedAt: reading?.dateTime || null
    };
  }).sort((a, b) => {
    const rank = { emergencia: 4, alerta: 3, atencao: 2, normal: 1, sem_dados: 0 };
    return (rank[statusTone(b.status)] || 0) - (rank[statusTone(a.status)] || 0)
      || (safeNumber(b.level) || 0) - (safeNumber(a.level) || 0);
  });

  const fireByCity = firePoints.reduce((acc, point) => {
    const city = point.city || point.municipio || "Município não informado";
    acc.set(city, (acc.get(city) || 0) + 1);
    return acc;
  }, new Map());

  const severeDrought = droughtMunicipalities
    .filter((item) => ["emergencia", "alerta"].includes(statusTone(droughtClass(item))))
    .slice(0, 10);
  const droughtCounts = droughtMunicipalities.reduce((acc, item) => {
    const key = droughtClass(item) || "Sem informação";
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map());

  return {
    rainStations,
    riverStations,
    firePoints,
    droughtMunicipalities,
    topRain,
    hydroCounts,
    riverRows,
    fireByCity: [...fireByCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    severeDrought,
    droughtCounts: [...droughtCounts.entries()],
    weatherRows: (weather || []).slice(0, 8)
  };
}

function EditorialGeneratedBulletinTemplate({
  boletim,
  snapshot,
  generatedAt,
  geoJson,
  logoSrc,
  blocks,
  overviewTiles,
  data,
  rain,
  river,
  fire,
  drought,
  emergency,
  executiveSummary,
  rainPoints,
  riverPoints,
  fireMapPoints,
  maxRainValue,
  burnedAreaLabel,
  weatherComment
}) {
  const generatedLabel = formatDateTime(generatedAt);
  const updateSource = `Geração: ${generatedLabel}`;
  const methodologySources = boletim.fontes?.length
    ? boletim.fontes
    : ["CEMADEN", "INMET", "ANA", "INPE Queimadas", "MapBiomas Fogo", "CEMADEN Alerta-Secas", "S2ID / SEDEC-MIDR"];
  const droughtBarRows = data.droughtCounts.map(([label, value]) => ({ label, value }));
  const fireBarRows = data.fireByCity.map(([label, value]) => ({ label, value }));
  const s2idCount = emergency.s2idFederal ?? emergency.federal ?? 0;

  return (
    <section className="generated-bulletin-print generated-editorial-bulletin" aria-label="Boletim Hidrometeorológico para impressão">
      {/* Página 1 - Capa / Síntese Executiva */}
      <header className="generated-page-shell generated-cover-page theme-navy">
        <div className="generated-cover-accent" aria-hidden="true" />
        <div className="generated-cover-topline">
          <img src={logoSrc} alt="" />
          <div>
            <small>Governo do Tocantins | Defesa Civil Estadual</small>
            <strong>Centro de Monitoramento da Defesa Civil do Tocantins</strong>
          </div>
        </div>
        <div className="generated-cover-title">
          <span>Publicação oficial de monitoramento</span>
          <h1>Boletim Hidrometeorológico</h1>
          <p>Centro de Monitoramento da Defesa Civil do Tocantins</p>
        </div>
        <dl className="generated-cover-meta">
          <InfoRow label="Número" value={text(boletim.numero, "Sob demanda")} />
          <InfoRow label="Data e hora de geração" value={generatedLabel} />
          <InfoRow label="Período de referência" value={text(boletim.periodoReferencia || snapshot.updatedAt)} />
        </dl>
        <div className="generated-cover-kpis">
          <CoverKpi title="Alertas vigentes" value={text(snapshot.alerts?.value || `${boletim.alertas?.quantidade ?? 0}`)} tone={statusTone(snapshot.alerts?.tone || snapshot.alerts?.status)} />
          <CoverKpi title="Maior chuva 24h" value={text(rain.value || boletim.chuva?.maiorAcumulado)} tone={statusTone(rain.tone || "normal")} />
          <CoverKpi title="Focos de calor" value={text(fire.value || `${data.firePoints.length}`)} tone={statusTone(fire.tone || "atencao")} />
          <CoverKpi title="Situação de seca" value={text(drought.value || boletim.seca?.situacao)} tone={statusTone(drought.tone || drought.value)} />
        </div>
        <article className="generated-cover-summary">
          <small>Síntese executiva</small>
          <p>{executiveSummary}</p>
        </article>
        <PageFooter source="Defesa Civil do Tocantins" updatedAt={updateSource} />
      </header>

      <main className="generated-bulletin-body">
        {/* Página 2 - Panorama Geral */}
        <PageShell
          label="Página 2"
          title="Panorama Geral do Monitoramento"
          subtitle="Síntese dos principais indicadores acompanhados pelo Centro de Monitoramento."
          tone="navy"
          source="IDAP | INMET | CEMADEN | ANA | INPE | S2ID"
          updatedAt={updateSource}
          className="page-break-before"
        >
          <div className="generated-panorama-grid">
            {blocks.map((block) => (
              <BigMetric key={block.title} title={block.title} value={block.value} description={block.description} tone={block.tone} />
            ))}
          </div>
          <EditorialCallout
            label="Destaque operacional"
            value={text(snapshot.generalStatus?.label || boletim.situacaoGeral?.status, "Monitoramento ativo")}
            text="Os dados deste boletim devem ser lidos em conjunto com os mapas temáticos e confirmados nas fontes oficiais emissoras."
            tone="navy"
          />
        </PageShell>

        {/* Página 3 - Chuva Observada 24h */}
        <PageShell
          label="Página 3"
          title="Chuva Observada 24h"
          subtitle="Mapa amplo com leituras válidas, maior acumulado e ranking curto das estações com maior precipitação."
          tone="rain"
          source={text(rain.source || boletim.chuva?.fonte || "CEMADEN / INMET / ANA / SEMARH")}
          updatedAt={text(rain.updatedAt || boletim.chuva?.atualizadoEm || snapshot.updatedAt, updateSource)}
          className="page-break-before"
        >
          <div className="generated-hero-map-layout">
            <BulletinMapCard
              className="generated-full-map-card"
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
              footer={`Fonte: ${text(rain.source || boletim.chuva?.fonte || "CEMADEN / INMET / ANA / SEMARH")}`}
            >
              <p className="generated-map-insight">Leitura pública: observe a distribuição das estações e confirme situações de risco nos avisos oficiais.</p>
              <div className="generated-map-summary">
                <strong>{text(rain.value || boletim.chuva?.maiorAcumulado)}</strong>
                <span>{operationalRainComment(maxRainValue)}</span>
              </div>
            </BulletinMapCard>
            <aside className="generated-side-panel">
              <BigMetric title="Maior acumulado" value={text(rain.value || boletim.chuva?.maiorAcumulado)} description={text(rain.description, "Maior leitura disponível no período.")} tone="rain" />
              <h3>Maiores acumulados</h3>
              <CompactTable
                columns={[
                  { key: "pos", label: "#", render: (_, index) => index + 1 },
                  { key: "municipio", label: "Município / estação", render: (row) => row.municipio || row.city || row.nome },
                  { key: "chuva24h", label: "24h", render: (row) => `${(safeNumber(row.chuva24h ?? row.amount) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm` }
                ]}
                rows={data.topRain.slice(0, 5)}
                emptyMessage="Sem estações com leitura disponível no momento da geração."
              />
            </aside>
          </div>
        </PageShell>

        {/* Página 4 - Rios Monitorados / Situação Geral */}
        <PageShell
          label="Página 4"
          title="Rios Monitorados / Situação Geral"
          subtitle="Mapa amplo das estações fluviométricas e resumo hidrológico sem tabela extensa."
          tone="river"
          source={text(river.source || boletim.rios?.fonte || "ANA / Telemetria")}
          updatedAt={text(river.updatedAt || boletim.rios?.atualizadoEm || snapshot.updatedAt, updateSource)}
          className="page-break-before"
        >
          <div className="generated-hero-map-layout">
            <BulletinMapCard
              className="generated-full-map-card"
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
              footer={`Fonte: ${text(river.source || boletim.rios?.fonte || "ANA / Telemetria")}`}
            />
            <aside className="generated-side-panel">
              <div className="generated-hydro-kpis">
                <BigMetric title="Total de estações" value={data.hydroCounts.total || boletim.rios?.estacoesMonitoradas || "Dado em integração"} tone="river" />
                <BigMetric title="Normal" value={data.hydroCounts.normal} tone="normal" />
                <BigMetric title="Atenção" value={data.hydroCounts.atencao} tone="atencao" />
                <BigMetric title="Alerta" value={data.hydroCounts.alerta} tone="alerta" />
                <BigMetric title="Emergência" value={data.hydroCounts.emergencia} tone="emergencia" />
              </div>
              <EditorialCallout
                label="Comentário operacional"
                value={text(river.value || `${boletim.rios?.estacoesMonitoradas ?? 0} estação(ões)`)}
                text={text(river.description || `Tendência predominante: ${text(boletim.rios?.tendenciaPredominante)}.`)}
                tone="river"
              />
            </aside>
          </div>
        </PageShell>

        {/* Página 5 - Principais Rios Estratégicos */}
        <PageShell
          label="Página 5"
          title="Principais Rios Estratégicos"
          subtitle="Tabela limpa e limitada aos pontos prioritários, com menos colunas para evitar quebra de texto."
          tone="river"
          source={text(river.source || boletim.rios?.fonte || "ANA / Telemetria")}
          updatedAt={text(river.updatedAt || boletim.rios?.atualizadoEm || snapshot.updatedAt, updateSource)}
          className="page-break-before"
        >
          <div className="generated-river-priority-table">
            <CompactTable
              columns={[
                { key: "river", label: "Rio", render: (row) => row.river || row.rio || "Não informado" },
                { key: "name", label: "Estação", render: (row) => row.name || row.nome || "Estação ANA" },
                { key: "city", label: "Município", render: (row) => row.city || row.municipio || "Não informado" },
                { key: "level", label: "Cota atual", render: (row) => row.level !== null && row.level !== undefined ? `${formatNumberPt(row.level, { maximumFractionDigits: 0 })} cm` : "sem leitura" },
                { key: "trendLabel", label: "Tendência", render: (row) => row.trendLabel || "em integração" }
              ]}
              rows={data.riverRows.slice(0, 10)}
              emptyMessage="Tabela dos principais rios em integração."
            />
          </div>
          <div className="generated-line-placeholder">
            <strong>Série semanal</strong>
            <span>Gráfico de linha semanal preparado para integração quando a série histórica estiver disponível.</span>
          </div>
        </PageShell>

        {/* Página 6 - Fogo e Queimadas */}
        <PageShell
          label="Página 6"
          title="Fogo e Queimadas"
          subtitle="Mapa de focos de calor, área queimada e ranking curto por município."
          tone="fire"
          source={text(fire.source || "INPE Queimadas / MapBiomas Fogo")}
          updatedAt={text(fire.updatedAt || boletim.focosCalor?.atualizadoEm || snapshot.updatedAt, updateSource)}
          className="page-break-before"
        >
          <div className="generated-hero-map-layout">
            <BulletinMapCard
              className="generated-full-map-card"
              title="Mapa de focos de calor"
              subtitle={text(fire.description, "Pontos detectados por satélite no arquivo diário do INPE.")}
              geoJson={geoJson}
              points={fireMapPoints}
              legend={[
                { label: "Foco de calor", color: "#f97316" },
                { label: "Base municipal", color: "#edf2f7" }
              ]}
              footer="Foco de calor não confirma incêndio isoladamente."
            />
            <aside className="generated-side-panel">
              <BigMetric title="Total de focos" value={text(fire.value || `${data.firePoints.length}`)} description="Pontos localizados no mapa temático." tone="fire" />
              <BigMetric title="Área queimada" value={text(burnedAreaLabel, "Em integração")} description="Referência complementar do MapBiomas Fogo." tone="fire" />
              <h3>Municípios com mais focos</h3>
              <BarList rows={fireBarRows} emptyMessage="Sem focos por município no momento da geração." tone="fire" />
            </aside>
          </div>
        </PageShell>

        {/* Página 7 - Seca */}
        <PageShell
          label="Página 7"
          title="Seca"
          subtitle="Mapa municipal de seca, resumo por categoria e municípios em condição mais severa."
          tone="drought"
          source={text(drought.source || boletim.seca?.fonte || "Monitor de Secas / CEMADEN")}
          updatedAt={text(drought.updatedAt || boletim.seca?.atualizadoEm || snapshot.updatedAt, updateSource)}
          className="page-break-before"
        >
          <div className="generated-hero-map-layout">
            <BulletinMapCard
              className="generated-full-map-card"
              title="Mapa de seca por município"
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
              footer={`Fonte: ${text(drought.source || boletim.seca?.fonte || "Monitor de Secas / CEMADEN")}`}
            />
            <aside className="generated-side-panel">
              <BigMetric title="Situação predominante" value={text(drought.value || boletim.seca?.situacao)} description={text(drought.description || `${boletim.seca?.municipiosAfetados ?? 0} município(s) afetados ou em análise.`)} tone="drought" />
              <h3>Resumo por categoria</h3>
              <BarList rows={droughtBarRows} emptyMessage="Dados municipais de seca ainda não disponíveis." tone="drought" />
              {!!data.severeDrought.length && <p className="generated-map-note">Mais severos: {data.severeDrought.map((item) => droughtName(item)).filter(Boolean).join(", ")}.</p>}
            </aside>
          </div>
        </PageShell>

        {/* Página 8 - Meteorologia Regional */}
        <PageShell
          label="Página 8"
          title="Meteorologia Regional"
          subtitle="Cards por município estratégico, com leitura compacta de temperatura, umidade, vento, chuva e condição do tempo."
          tone="rain"
          source="INMET / CPTEC / Open-Meteo / redes integradas"
          updatedAt={updateSource}
          className="page-break-before"
        >
          <WeatherCards rows={data.weatherRows} />
          <EditorialCallout label="Comentário meteorológico" value="Condição em acompanhamento" text={weatherComment} tone="rain" />
        </PageShell>

        {/* Página 9 - Emergência e Calamidade / S2ID */}
        <PageShell
          label="Página 9"
          title="Emergência e Calamidade / S2ID"
          subtitle="Reconhecimentos vigentes e registros administrativos consultados para acompanhamento institucional."
          tone="fire"
          source={text(emergency.source || "S2ID / SEDEC-MIDR")}
          updatedAt={text(emergency.updatedAt || snapshot.updatedAt, updateSource)}
          className="page-break-before"
        >
          <div className="generated-s2id-summary">
            <BigMetric title="Reconhecimentos vigentes" value={text(emergency.value || `${s2idCount}`)} description={text(emergency.description || "Situação administrativa consultada no S2ID.")} tone={statusTone(emergency.tone)} />
            <BigMetric title="Situação de Emergência" value={emergency.se ?? emergency.s2idSe ?? 0} tone="alerta" />
            <BigMetric title="Estado de Calamidade" value={emergency.ecp ?? emergency.s2idEcp ?? 0} tone="emergencia" />
          </div>
          <S2idCards emergency={emergency} snapshot={snapshot} />
        </PageShell>

        {/* Página 10 - Fontes e Metodologia */}
        <PageShell
          label="Página 10"
          title="Fontes e Metodologia"
          subtitle="Fontes oficiais consultadas e observações metodológicas para leitura correta do boletim."
          tone="guidance"
          source="Defesa Civil do Tocantins"
          updatedAt={updateSource}
          className="page-break-before"
        >
          <div className="generated-methodology-grid">
            <article>
              <h3>Fontes oficiais utilizadas</h3>
              <ul>
                {methodologySources.map((source) => <li key={source}>{source}</li>)}
              </ul>
            </article>
            <article>
              <h3>Observações metodológicas</h3>
              <p>Este boletim organiza informações públicas e dados disponíveis no painel do Centro de Monitoramento. Alertas oficiais, reconhecimentos administrativos e classificações técnicas devem ser confirmados nos canais emissores.</p>
              <p>A seca monitorada por índices técnicos e a situação registrada no S2ID são informações complementares.</p>
              <p>Focos de calor são detecções por satélite e não confirmam incêndio isoladamente.</p>
            </article>
            <article className="generated-emergency-box">
              <h3>Canais de emergência</h3>
              <p>Defesa Civil 199 | Corpo de Bombeiros 193.</p>
            </article>
          </div>
        </PageShell>
      </main>
    </section>
  );
}

function GeneratedBulletinTemplate({ payload }) {
  const boletim = payload?.boletim || {};
  const snapshot = payload?.snapshot || {};
  const weather = payload?.weather || [];
  const geoJson = payload?.geoJson || null;
  const riverReadings = payload?.riverReadings || {};
  const generatedAt = payload?.generatedAt || new Date().toISOString();
  const river = snapshot.rivers || {};
  const fire = snapshot.fire || {};
  const rain = snapshot.rain || {};
  const alerts = snapshot.alerts || {};
  const emergency = snapshot.emergency || {};
  const drought = snapshot.drought || {};
  const data = buildGeneratedData({ snapshot, boletim, weather, riverReadings });
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
  const executiveSummary = buildExecutiveSummary({ alerts, rain, river, fire, drought, emergency });
  const maxRainValue = safeNumber(String(rain.value || "").replace(",", ".")) ?? safeNumber(data.topRain[0]?.chuva24h ?? data.topRain[0]?.amount) ?? 0;
  const burnedAreaLabel = formatAreaHa(fire.burnedAreaLabel || fire.burnedArea?.hectares);
  const weatherComment = operationalWeatherComment(data.weatherRows);

  return (
    <EditorialGeneratedBulletinTemplate
      boletim={boletim}
      snapshot={snapshot}
      generatedAt={generatedAt}
      geoJson={geoJson}
      logoSrc={logoSrc}
      blocks={blocks}
      overviewTiles={overviewTiles}
      data={data}
      rain={rain}
      river={river}
      fire={fire}
      drought={drought}
      emergency={emergency}
      executiveSummary={executiveSummary}
      rainPoints={rainPoints}
      riverPoints={riverPoints}
      fireMapPoints={fireMapPoints}
      maxRainValue={maxRainValue}
      burnedAreaLabel={burnedAreaLabel}
      weatherComment={weatherComment}
    />
  );

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
            <small>Resumo do Panorama Atual</small>
            <h2>{text(snapshot.generalStatus?.label || boletim.situacaoGeral?.status, "Monitoramento em andamento")}</h2>
          </div>
          <p>{executiveSummary}</p>
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
              <p className="generated-map-insight">Leitura pública: pontos em atenção, alerta ou emergência devem ser acompanhados com prioridade operacional.</p>
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
                  { key: "chuva24h", label: "24h", render: (row) => `${(safeNumber(row.chuva24h ?? row.amount) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm` },
                  { key: "atualizadoEm", label: "Atualização", render: (row) => updateLabel(row.atualizadoEm || row.updatedAt) }
                ]}
                rows={data.topRain}
                emptyMessage="Sem estações com leitura disponível no momento da geração."
              />
              <EditorialCallout
                label="Comentário operacional"
                value={text(rain.value || boletim.chuva?.maiorAcumulado)}
                text={operationalRainComment(maxRainValue)}
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
              <h3>Principais rios monitorados</h3>
              <CompactTable
                columns={[
                  { key: "pos", label: "#", render: (_, index) => index + 1 },
                  { key: "name", label: "Estação", render: (row) => row.name || row.nome || "Estação ANA" },
                  { key: "river", label: "Rio", render: (row) => row.river || row.rio || "Rio não informado" },
                  { key: "city", label: "Município", render: (row) => row.city || row.municipio || "Não informado" },
                  { key: "level", label: "Cota atual", render: (row) => row.level !== null && row.level !== undefined ? `${formatNumberPt(row.level, { maximumFractionDigits: 0 })} cm` : "sem leitura" },
                  { key: "trendLabel", label: "Tendência", render: (row) => row.trendLabel || "tendência em integração" },
                  { key: "status", label: "Status", render: (row) => row.status || "Normal" },
                  { key: "updatedAt", label: "Atualização", render: (row) => updateLabel(row.updatedAt) }
                ]}
                rows={data.riverRows}
                emptyMessage="Tabela dos principais rios em integração."
              />
              <EditorialCallout
                label="Resumo hidrológico"
                value={text(river.value || `${boletim.rios?.estacoesMonitoradas ?? 0} estação(ões)`)}
                text={text(river.description || `Tendência predominante: ${text(boletim.rios?.tendenciaPredominante)}.`)}
                tone="river"
              />
            </article>
          </div>
        </BulletinPage>

        <BulletinPage
          eyebrow="Fogo e queimadas"
          title="Mapa de focos de calor"
          subtitle="Pontos detectados por satélite, ranking municipal e referência de área queimada para apoiar prevenção e resposta operacional."
          tone="fire"
          className="page-break-before"
        >
          <div className="generated-map-page generated-map-page-wide">
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
              <p className="generated-map-insight">Leitura pública: a concentração de pontos orienta o monitoramento, mas não confirma incêndio isoladamente.</p>
              <div className="generated-map-summary">
                <strong>{text(fire.value || `${data.firePoints.length} foco(s)`)}</strong>
                <span>Área queimada: {text(burnedAreaLabel, "MapBiomas Fogo em integração")}.</span>
              </div>
            </BulletinMapCard>
            <article className="generated-map-detail">
              <h3>Municípios com mais focos</h3>
              <CompactTable
                columns={[
                  { key: "pos", label: "#", render: (_, index) => index + 1 },
                  { key: "municipio", label: "Município", render: (row) => row[0] },
                  { key: "focos", label: "Focos", render: (row) => row[1] },
                  { key: "observacao", label: "Observação", render: () => "Ponto detectado por satélite; não confirma incêndio isoladamente." }
                ]}
                rows={data.fireByCity}
                emptyMessage="Sem focos localizados por município no momento da geração."
              />
              <EditorialCallout
                label="Área queimada"
                value={text(burnedAreaLabel, "Em integração")}
                text="A área queimada é referência complementar do MapBiomas Fogo e deve ser lida em conjunto com os focos de calor do INPE."
                tone="fire"
              />
            </article>
          </div>
        </BulletinPage>

        <BulletinPage
          eyebrow="Seca"
          title="Mapa de seca por município"
          subtitle="Camada municipal de seca com classificação por grau, resumo por categoria e municípios em condição mais severa."
          tone="drought"
          className="page-break-before"
        >
          <div className="generated-map-page generated-map-page-wide">
            <BulletinMapCard
              title="Mapa de seca por município"
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
              <p className="generated-map-insight">Leitura pública: a seca monitorada por índices técnicos complementa registros administrativos e decretos.</p>
              <div className="generated-map-summary">
                <strong>{text(drought.value || boletim.seca?.situacao)}</strong>
                <span>{text(drought.description || `${boletim.seca?.municipiosAfetados ?? 0} município(s) afetados ou em análise.`)}</span>
              </div>
              {!!data.severeDrought.length && (
                <p className="generated-map-note">
                  Municípios em condição mais severa: {data.severeDrought.map((item) => droughtName(item)).filter(Boolean).join(", ")}.
                </p>
              )}
            </BulletinMapCard>
            <article className="generated-map-detail">
              <h3>Resumo por categoria</h3>
              <CompactTable
                columns={[
                  { key: "categoria", label: "Categoria", render: (row) => row[0] },
                  { key: "municipios", label: "Municípios", render: (row) => row[1] }
                ]}
                rows={data.droughtCounts}
                emptyMessage="Dados municipais de seca ainda não disponíveis."
              />
              <h3>Municípios em condição mais severa</h3>
              <CompactTable
                columns={[
                  { key: "municipio", label: "Município", render: (row) => droughtName(row) },
                  { key: "grau", label: "Grau de seca", render: (row) => droughtClass(row) },
                  { key: "tendencia", label: "Tendência", render: (row) => text(row.tendencia || row.trend) },
                  { key: "referencia", label: "Referência", render: (row) => updateLabel(row.referencia || row.updatedAt || row.atualizadoEm) }
                ]}
                rows={data.severeDrought}
                emptyMessage="Sem municípios em condição severa na base disponível."
              />
            </article>
          </div>
        </BulletinPage>

        <BulletinPage
          eyebrow="Meteorologia"
          title="Meteorologia por regiões estratégicas"
          subtitle="Tabela compacta com municípios de referência para apoiar leitura regional das condições meteorológicas no Tocantins."
          tone="rain"
          className="page-break-before"
        >
          <div className="generated-map-page generated-map-page-wide">
            <article className="generated-map-detail generated-weather-panel">
              <h3>Painel por município estratégico</h3>
              <CompactTable
                columns={[
                  { key: "municipio", label: "Município" },
                  { key: "regiao", label: "Região" },
                  { key: "temperatura", label: "Temp.", render: (row) => numberText(row.temperatura, " °C") },
                  { key: "umidade", label: "Umidade", render: (row) => numberText(row.umidade, "%") },
                  { key: "vento", label: "Vento", render: (row) => numberText(row.vento, " km/h") },
                  { key: "chuva", label: "Chuva", render: (row) => numberText(row.chuva, " mm") },
                  { key: "condicao", label: "Condição", render: (row) => text(row.condicao) },
                  { key: "atualizadoEm", label: "Atualização", render: (row) => updateLabel(row.atualizadoEm || row.updatedAt) }
                ]}
                rows={data.weatherRows}
                emptyMessage="Meteorologia por municípios em integração."
              />
            </article>
            <article className="generated-map-detail">
              <h3>Leitura regional</h3>
              <EditorialCallout
                label="Comentário meteorológico"
                value="Condição em acompanhamento"
                text={weatherComment}
                tone="rain"
              />
              <p className="generated-map-note">
                A meteorologia por municípios estratégicos é uma leitura de apoio. Avisos de risco devem ser confirmados nos canais oficiais do INMET, Defesa Civil e demais órgãos emissores.
              </p>
            </article>
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
            <article className="generated-method-note">
              <strong>Observação metodológica</strong>
              <p>Este boletim organiza informações públicas e dados disponíveis no painel do Centro de Monitoramento. A seca monitorada por índices técnicos, os alertas oficiais e os reconhecimentos administrativos devem ser confirmados nas fontes emissoras.</p>
            </article>
            <article className="generated-source-list">
              <strong>Fontes oficiais consultadas</strong>
              <p>{(boletim.fontes || []).join(" | ") || "IDAP | INMET | CEMADEN | ANA | INPE Queimadas | S2ID | Monitor de Secas"}</p>
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
      const riverReadings = await loadRiverReadings(snapshot?.rivers?.stations || []).catch(() => ({}));
      setPayload({ boletim, snapshot, weather, geoJson, riverReadings, generatedAt: new Date().toISOString() });
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

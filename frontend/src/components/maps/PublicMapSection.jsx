import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Layers3, MapPinned, Waves } from "lucide-react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from "react-leaflet";
import { getAnaStationReading } from "../../services/ana";
import { buildMapSearchResults } from "../../services/mapSearch";
import { getRainForecastPoints } from "../../services/rainForecast";
import { FloatingMapLegend } from "./FloatingMapLegend";
import { LayerSelector } from "./LayerSelector";
import { MapBiomasFireOverlay } from "./MapBiomasFireOverlay";
import { MapInfoPanel } from "./MapInfoPanel";
import { MapSearchBox } from "./MapSearchBox";
import { MapViewportController } from "./MapViewportController";
import { RainModeTabs } from "./RainModeTabs";

const priorityLayers = [
  { id: "drought", label: "Seca" },
  { id: "rain", label: "Chuva" },
  { id: "rivers", label: "Rios" },
  { id: "fire", label: "Focos de calor" },
  { id: "emergency", label: "SE / ECP" }
];
const priorityLayerAnchors = {
  drought: "seca",
  rain: "chuva",
  rivers: "rios",
  fire: "fogo",
  emergency: "emergencia-calamidade"
};
const priorityLayersByHash = Object.fromEntries(
  Object.entries(priorityLayerAnchors).map(([layer, anchor]) => [`#${anchor}`, layer])
);
const droughtLayers = ["Severidade da seca", "SE/ECP - S2ID", "Focos de calor"];

function formatNumber(value, suffix = "") {
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix}`;
}

function rainTone(amount) {
  if (amount >= 50) return "danger";
  if (amount >= 30) return "rain-heavy";
  if (amount >= 10) return "rain-medium";
  if (amount > 0) return "rain-light";
  return "zero";
}

function rainColor(amount) {
  if (amount >= 50) return "#d73027";
  if (amount >= 30) return "#f59a23";
  if (amount >= 10) return "#1e5a8a";
  if (amount > 0) return "#77b6d8";
  return "#ffffff";
}

function rainSituation(maximum) {
  if (!Number.isFinite(maximum)) return "Dados em integração";
  if (maximum >= 50) return "Chuva intensa";
  if (maximum >= 30) return "Atenção para chuva";
  if (maximum >= 10) return "Chuva moderada";
  if (maximum > 0) return "Chuva fraca";
  return "Sem chuva relevante";
}

function buildRainStats(stations, summary) {
  const sorted = [...stations].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
  const maxStation = sorted[0];
  const maximum = Number(maxStation?.amount ?? 0);
  return {
    total: stations.length,
    maximum,
    maxLabel: maxStation ? `${maxStation.city} | ${maxStation.name}` : "Sem estação de destaque",
    sourceBreakdown: summary?.sourceBreakdown || {},
    topSource: Object.entries(summary?.sourceBreakdown || {})
      .sort((first, second) => ((second[1].count || 0) || (second[1].registeredCount || 0)) - ((first[1].count || 0) || (first[1].registeredCount || 0)))[0]?.[0] || "Fonte em integração",
    withRain: stations.filter((station) => Number(station.amount || 0) > 0).length,
    above10: stations.filter((station) => Number(station.amount || 0) >= 10).length,
    above30: stations.filter((station) => Number(station.amount || 0) >= 30).length,
    above50: stations.filter((station) => Number(station.amount || 0) >= 50).length,
    situation: rainSituation(maximum),
    value: summary?.value || formatNumber(maximum, " mm")
  };
}

function trendText(readingState, riverReading) {
  if (readingState === "ready" && riverReading?.trend?.label) return riverReading.trend.label;
  if (readingState === "loading") return "Atualizando estação";
  return "Classificação oficial em integração";
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

const droughtColors = {
  "Sem seca": "#dceee4",
  Fraca: "#ffe66d",
  Moderada: "#f59a23",
  Severa: "#d73027",
  Extrema: "#7a1d45",
  Excepcional: "#4d1630"
};

function droughtTone(classe) {
  return droughtColors[classe] || "#c8d4df";
}

function buildDroughtCounts(municipalities = []) {
  return municipalities.reduce((counts, city) => {
    const key = city.classe || "Sem informação";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function formatDate(value) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short" });
}

const satelliteTime = "default";
const satelliteUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_GeoColor/default/${satelliteTime}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;

function SelectedSearchMarker({ result }) {
  const markerRef = useRef(null);

  useEffect(() => {
    markerRef.current?.openPopup();
  }, [result]);

  if (!result) return null;

  return (
    <CircleMarker
      ref={markerRef}
      center={[result.latitude, result.longitude]}
      radius={12}
      pathOptions={{ color: "#071b3a", fillColor: "#f59a23", fillOpacity: 0.28, weight: 3 }}
    >
      <Popup>
        <strong>{result.label}</strong><br />
        {result.description}
      </Popup>
    </CircleMarker>
  );
}

export function PublicMapSection({
  id = "mapa-prioritario",
  variant = "priority",
  eyebrow = "Mapa prioritário",
  title = "Visualização territorial do Tocantins",
  description = "Mapa preparado para chuva, rios e focos de calor.",
  rainStations = [],
  rainSummary = null,
  riverStations = [],
  firePoints = [],
  fireSummary = null,
  emergencyPoints = [],
  emergencySummary = null,
  droughtSummary = null
}) {
  const [tocantinsBoundary, setTocantinsBoundary] = useState(null);
  const [municipalBoundary, setMunicipalBoundary] = useState(null);
  const [activeLayer, setActiveLayer] = useState("drought");
  const [selectedRiver, setSelectedRiver] = useState(null);
  const [readingState, setReadingState] = useState("idle");
  const [riverReading, setRiverReading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [centerRequest, setCenterRequest] = useState(0);
  const [showBurnedArea, setShowBurnedArea] = useState(false);
  const [rainMode, setRainMode] = useState("observed");
  const [forecastState, setForecastState] = useState({ state: "idle", points: [] });

  const searchResults = useMemo(() => buildMapSearchResults(activeLayer, {
    rainStations,
    riverStations,
    firePoints,
    emergencyPoints,
    droughtMunicipalities: droughtSummary?.municipalities || []
  }, searchQuery), [activeLayer, droughtSummary, emergencyPoints, firePoints, rainStations, riverStations, searchQuery]);
  const rainStats = useMemo(() => buildRainStats(rainStations, rainSummary), [rainStations, rainSummary]);
  const forecastPoints = forecastState.points || [];
  const droughtByName = useMemo(() => {
    const entries = droughtSummary?.municipalities || [];
    return new Map(entries.map((city) => [normalizeName(city.nome), city]));
  }, [droughtSummary]);
  const droughtCounts = useMemo(
    () => buildDroughtCounts(droughtSummary?.municipalities || []),
    [droughtSummary]
  );

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/tocantins_ibge.geojson`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setTocantinsBoundary)
      .catch(() => setTocantinsBoundary(null));
  }, []);

  useEffect(() => {
    if (variant !== "priority") return;
    fetch(`${import.meta.env.BASE_URL}data/tocantins_municipios.geojson`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setMunicipalBoundary)
      .catch(() => setMunicipalBoundary(null));
  }, [variant]);

  useEffect(() => {
    if (activeLayer !== "rain" || !["forecast24", "forecast48"].includes(rainMode)) return undefined;
    let active = true;
    setForecastState({ state: "loading", points: [] });
    getRainForecastPoints(rainMode)
      .then((result) => {
        if (active) setForecastState(result);
      })
      .catch(() => {
        if (active) setForecastState({
          state: "error",
          points: [],
          message: "Não foi possível carregar a previsão no momento.",
          updatedAt: new Date().toISOString()
        });
      });
    return () => {
      active = false;
    };
  }, [activeLayer, rainMode]);

  useEffect(() => {
    if (variant !== "priority") return undefined;
    const selectLayerFromHash = () => {
      const layer = priorityLayersByHash[window.location.hash];
      if (layer) changeLayer(layer);
    };
    selectLayerFromHash();
    window.addEventListener("hashchange", selectLayerFromHash);
    return () => window.removeEventListener("hashchange", selectLayerFromHash);
  // This effect responds only to external navigation anchors.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  function changeLayer(layer) {
    setActiveLayer(layer);
    setSearchQuery("");
    setSelectedResult(null);
    if (layer !== "fire") setShowBurnedArea(false);
  }

  function clearSearch() {
    setSearchQuery("");
    setSelectedResult(null);
  }

  async function inspectRiver(station) {
    setSelectedRiver(station);
    setRiverReading(null);
    setReadingState("loading");
    try {
      const reading = await getAnaStationReading(station.code);
      setRiverReading(reading);
      setReadingState(reading ? "ready" : "empty");
    } catch (error) {
      setReadingState("error");
    }
  }

  function selectSearchResult(result) {
    setSelectedResult(result);
    if (result.layer === "rivers" && result.item) inspectRiver(result.item);
  }

  const panelSummary = variant === "priority" && (
    <>
      {activeLayer === "rain" && (
        <div className="map-summary-card rain-summary-card">
          <p className="eyebrow">Resumo da chuva</p>
          {rainMode === "observed" ? (
            <>
              <h4>{rainStats.situation}</h4>
              <dl>
                <div><dt>Estações consultadas</dt><dd>{rainStats.total}</dd></div>
                <div><dt>Maior acumulado</dt><dd>{rainStats.value}</dd></div>
                <div><dt>Destaque</dt><dd>{rainStats.maxLabel}</dd></div>
                <div><dt>Maior fonte integrada</dt><dd>{rainStats.topSource}</dd></div>
                <div><dt>Com chuva</dt><dd>{rainStats.withRain}</dd></div>
                <div><dt>Acima de 10 mm</dt><dd>{rainStats.above10}</dd></div>
                <div><dt>Acima de 30 mm</dt><dd>{rainStats.above30}</dd></div>
                <div><dt>Acima de 50 mm</dt><dd>{rainStats.above50}</dd></div>
              </dl>
              {rainSummary?.updatedAt && <small>Atualização: {rainSummary.updatedAt}</small>}
              <small>Fonte integrada: CEMADEN, INMET e ANA quando houver leitura 24h disponível. Heatmap observacional baseado nos pontos consultados. SEMARH em estrutura de integração.</small>
              <div className="rain-source-breakdown" aria-label="Estações por fonte">
                <strong>Por fonte</strong>
                {["CEMADEN", "INMET", "ANA", "SEMARH"].map((source) => {
                  const item = rainStats.sourceBreakdown[source];
                  const count = item?.count || 0;
                  const registered = item?.registeredCount || 0;
                  const label = item?.status === "ready"
                    ? `${count} estação${count === 1 ? "" : "ões"} com leitura`
                    : item?.status === "catalog"
                      ? `${registered} estação${registered === 1 ? "" : "ões"} cadastradas; leitura indisponível`
                      : item?.status === "error"
                        ? "Consulta indisponível"
                        : item?.message || "Fonte em integração";
                  return (
                    <span key={source}>
                      <b>{source}</b>
                      {label}
                    </span>
                  );
                })}
              </div>
            </>
          ) : ["forecast24", "forecast48"].includes(rainMode) ? (
            <>
              <h4>{rainMode === "forecast24" ? "Previsão 24h" : "Previsão 48h"}</h4>
              <span className="forecast-status">{forecastState.state === "ready" ? "Camada ativa" : "Atualizando"}</span>
              {forecastState.state === "loading" && <p>Carregando previsão...</p>}
              {forecastState.state === "error" && <p>Não foi possível carregar a previsão no momento.</p>}
              {forecastState.state === "ready" && (
                <dl>
                  <div><dt>Maior previsão</dt><dd>{formatNumber(forecastState.maximum?.amount || 0, " mm")}</dd></div>
                  <div><dt>Ponto de destaque</dt><dd>{forecastState.maximum?.city || "Sem destaque"}</dd></div>
                  <div><dt>Acima de 10 mm</dt><dd>{forecastState.above10}</dd></div>
                  <div><dt>Acima de 30 mm</dt><dd>{forecastState.above30}</dd></div>
                  <div><dt>Acima de 50 mm</dt><dd>{forecastState.above50}</dd></div>
                  <div><dt>Período</dt><dd>{forecastState.period}</dd></div>
                </dl>
              )}
              <small>Fonte: Open-Meteo. Confirme alertas e avisos nos canais oficiais.</small>
            </>
          ) : (
            <>
              <h4>Satélite GOES-East</h4>
              <p>Camada visual de apoio para nebulosidade/condição atmosférica. Não substitui aviso oficial.</p>
              <small className="satellite-credit">Fonte: NASA GIBS / GOES-East ABI GeoColor.</small>
            </>
          )}
        </div>
      )}
      {activeLayer === "drought" && (
        <div className="map-summary-card drought-map-summary">
          <p className="eyebrow">Resumo da seca</p>
          <h4>{droughtSummary?.value || "Camada municipal de seca em integração"}</h4>
          {droughtSummary?.state === "ready" ? (
            <>
              <dl>
                <div><dt>Total analisado</dt><dd>{droughtSummary.municipalities?.length || 0}</dd></div>
                <div><dt>Sem seca</dt><dd>{droughtCounts["Sem seca"] || 0}</dd></div>
                <div><dt>Seca fraca</dt><dd>{droughtCounts.Fraca || 0}</dd></div>
                <div><dt>Seca moderada</dt><dd>{droughtCounts.Moderada || 0}</dd></div>
                <div><dt>Seca grave</dt><dd>{droughtCounts.Severa || 0}</dd></div>
                <div><dt>Seca extrema</dt><dd>{droughtCounts.Extrema || 0}</dd></div>
              </dl>
              <small>Mais severos: {droughtSummary.summary?.municipios_criticos?.join(", ") || "Sem destaque"}</small>
              <small>Fonte: {droughtSummary.source} | referência {formatDate(droughtSummary.reference)}</small>
            </>
          ) : (
            <p>Dados municipais de seca ainda não disponíveis.</p>
          )}
        </div>
      )}
      {activeLayer === "rivers" && (
        <div className="map-summary-card hydro-summary-card">
          <p className="eyebrow">Situação hidrológica</p>
          <h4>Rede telemétrica consultável</h4>
          <dl>
            <div><dt>Estações no mapa</dt><dd>{riverStations.length}</dd></div>
            <div><dt>Normalidade</dt><dd>Em integração</dd></div>
            <div><dt>Atenção</dt><dd>--</dd></div>
            <div><dt>Alerta</dt><dd>--</dd></div>
            <div><dt>Emergência</dt><dd>--</dd></div>
            <div><dt>Tendência predominante</dt><dd>{trendText(readingState, riverReading)}</dd></div>
          </dl>
          <small>Fonte: ANA / Telemetria. Classificação oficial em integração; a tendência aparece por estação selecionada.</small>
        </div>
      )}
    </>
  );

  const layerInformation = variant === "priority" && (
    <>
      {activeLayer === "rain" && rainStations.length > 0 && (
        <>
          <p>Chuva acumulada nas últimas 24h em pluviômetros automáticos do Tocantins.</p>
          <dl className="map-summary">
            <div><dt>Estações consultadas</dt><dd>{rainStations.length}</dd></div>
            <div><dt>Maior acumulado</dt><dd>{rainSummary?.value || "Sem dados"}</dd></div>
          </dl>
          <strong>Fonte integrada: CEMADEN</strong>
          {rainSummary?.updatedAt && <small>Atualização da fonte: {rainSummary.updatedAt}</small>}
        </>
      )}
      {activeLayer === "rain" && rainStations.length === 0 && (
        <p className="map-message">Sem registros disponíveis no momento.</p>
      )}
      {activeLayer === "rivers" && (
        <>
          <p>Estações telemétricas consultáveis. A tendência informa a variação observada da cota.</p>
          <dl className="map-summary">
            <div><dt>Estações no mapa</dt><dd>{riverStations.length}</dd></div>
            {selectedRiver && <div><dt>Estação selecionada</dt><dd>{selectedRiver.name}</dd></div>}
          </dl>
          {readingState === "loading" && <p className="map-message">Atualizando cota observada...</p>}
          {readingState === "error" && <p className="map-message">Não foi possível atualizar esta cota no momento.</p>}
          {readingState === "empty" && <p className="map-message">Sem leitura recente disponível para a estação.</p>}
          {readingState === "ready" && riverReading && (
            <div className={`river-reading trend-${riverReading.trend.direction}`}>
              <Waves aria-hidden="true" />
              <strong>Cota: {formatNumber(riverReading.level, " cm")}</strong>
              <span className="river-trend">
                <b aria-hidden="true">{riverReading.trend.arrow}</b>
                Tendência observada: {riverReading.trend.label}
              </span>
              <small>{riverReading.dateTime}</small>
            </div>
          )}
          <strong>Fonte integrada: ANA / Telemetria</strong>
        </>
      )}
      {activeLayer === "fire" && (
        <>
          <p>Pontos detectados por satélite no arquivo diário oficial do INPE Queimadas.</p>
          <dl className="map-summary">
            <div><dt>Focos localizados</dt><dd>{firePoints.length}</dd></div>
            <div><dt>Situação</dt><dd>{fireSummary?.value || "Sem dados"}</dd></div>
            {fireSummary?.burnedArea && (
              <div><dt>Área queimada</dt><dd>{formatNumber(fireSummary.burnedArea.hectares, " ha")}</dd></div>
            )}
          </dl>
          <strong><Flame aria-hidden="true" /> Fonte integrada: INPE Queimadas</strong>
          {fireSummary?.burnedArea && (
            <small>Área e raster: MapBiomas Monitor do Fogo | {fireSummary.burnedArea.period}</small>
          )}
          {fireSummary?.updatedAt && <small>Atualização: {fireSummary.updatedAt}</small>}
        </>
      )}
      {activeLayer === "emergency" && (
        <>
          <p>Municípios com reconhecimento federal vigente na consulta pública do S2ID.</p>
          <dl className="map-summary">
            <div><dt>Reconhecimentos vigentes</dt><dd>{emergencySummary?.federal ?? 0}</dd></div>
            <div><dt>Situação de Emergência</dt><dd>{emergencySummary?.se ?? 0}</dd></div>
            <div><dt>Calamidade Pública</dt><dd>{emergencySummary?.ecp ?? 0}</dd></div>
          </dl>
          <strong>Fonte integrada: S2ID / SEDEC-MIDR</strong>
          {emergencySummary?.updatedAt && <small>Atualização: {emergencySummary.updatedAt}</small>}
        </>
      )}
    </>
  );

  return (
    <section className={`map-section ${variant}`} id={id}>
      <div className="map-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="integration-tag">
          <Layers3 aria-hidden="true" /> {variant === "priority" ? "Fontes oficiais integradas" : "Painel técnico"}
        </span>
      </div>
      {variant === "priority" && (
        <LayerSelector
          layers={priorityLayers}
          anchors={priorityLayerAnchors}
          activeLayer={activeLayer}
          onSelect={changeLayer}
          onCenter={() => setCenterRequest((request) => request + 1)}
          onClear={clearSearch}
          canClear={Boolean(searchQuery || selectedResult)}
        />
      )}
      {variant === "priority" && activeLayer === "rain" && (
        <RainModeTabs activeMode={rainMode} onChange={setRainMode} />
      )}
      {variant === "priority" && (
        <div className="mobile-map-search">
          <MapSearchBox
            activeLayer={activeLayer}
            query={searchQuery}
            results={searchResults}
            onQueryChange={setSearchQuery}
            onSelect={selectSearchResult}
          />
        </div>
      )}
      <div className="map-layout">
        <div className="map-shell">
        <MapContainer center={[-10.18, -48.33]} zoom={6} scrollWheelZoom={false} className="public-map">
          {variant === "priority" && (
            <MapViewportController
              boundary={tocantinsBoundary}
              focus={selectedResult}
              centerRequest={centerRequest}
            />
          )}
          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {variant === "priority" && activeLayer === "rain" && rainMode === "satellite" && (
            <TileLayer
              attribution="NASA GIBS / GOES-East"
              url={satelliteUrl}
              opacity={0.72}
              maxZoom={7}
            />
          )}
          {tocantinsBoundary && activeLayer !== "drought" && (
            <GeoJSON
              data={tocantinsBoundary}
              style={{
                color: variant === "drought" ? "#d45b3b" : "#f59a23",
                fillColor: variant === "drought" ? "#f59a23" : "#1e5a8a",
                fillOpacity: 0.16,
                weight: 2.4
              }}
            />
          )}
          {variant === "priority" && activeLayer === "drought" && municipalBoundary && (
            <GeoJSON
              key={`drought-${droughtSummary?.reference || "fallback"}`}
              data={municipalBoundary}
              style={(feature) => {
                const city = droughtByName.get(normalizeName(feature?.properties?.nome || feature?.properties?.name));
                return {
                  color: "#ffffff",
                  fillColor: droughtTone(city?.classe),
                  fillOpacity: city ? 0.72 : 0.2,
                  weight: 0.8
                };
              }}
              onEachFeature={(feature, layer) => {
                const city = droughtByName.get(normalizeName(feature?.properties?.nome || feature?.properties?.name));
                const code = feature?.properties?.codarea;
                const title = city?.nome || `Município IBGE ${code}`;
                layer.bindPopup(`
                  <strong>${title}</strong><br/>
                  Grau de seca: ${city?.classe || "Dados municipais de seca ainda não disponíveis"}<br/>
                  Tendência: ${droughtSummary?.summary?.agravaram ? "Consultar resumo estadual" : "Não informada"}<br/>
                  Referência: ${city?.referencia ? formatDate(city.referencia) : formatDate(droughtSummary?.reference)}<br/>
                  Fonte: ${droughtSummary?.source || "Monitor de Secas / CEMADEN"}
                `);
              }}
            />
          )}
          {variant === "priority" && activeLayer === "drought" && !municipalBoundary && (
            <div className="map-mode-placeholder">
              <strong>Camada municipal de seca em integração</strong>
              <span>Não foi possível carregar a malha municipal neste momento.</span>
            </div>
          )}
          {variant === "priority" && activeLayer === "rain" && rainMode === "observed" && rainStations.map((station) => (
            <CircleMarker
              key={`heat-${station.code}`}
              center={[station.latitude, station.longitude]}
              radius={station.amount >= 50 ? 44 : station.amount >= 30 ? 34 : station.amount >= 10 ? 25 : station.amount > 0 ? 16 : 8}
              pathOptions={{ color: "transparent", fillColor: rainColor(station.amount), fillOpacity: station.amount > 0 ? 0.2 : 0.05, weight: 0 }}
              interactive={false}
              className="rain-heat-point"
            />
          ))}
          {variant === "priority" && activeLayer === "rain" && rainMode === "observed" && rainStations.map((station) => (
            <CircleMarker key={station.code} center={[station.latitude, station.longitude]} radius={station.amount >= 30 ? 9 : station.amount >= 10 ? 7 : 5} pathOptions={{ color: station.amount >= 30 ? "#d73027" : station.amount >= 10 ? "#f59a23" : "#1e5a8a", fillOpacity: 0.84, weight: 2 }}>
              <Popup><strong>{station.city}</strong><br />{station.name}<br />Acumulado 24h: {formatNumber(station.amount, " mm")}<br />Fonte: {station.fonte || station.source || "CEMADEN"}<br />Faixa: {rainTone(station.amount)}</Popup>
            </CircleMarker>
          ))}
          {variant === "priority" && activeLayer === "rain" && ["forecast24", "forecast48"].includes(rainMode) && forecastPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={point.amount >= 30 ? 10 : point.amount >= 10 ? 8 : 6}
              pathOptions={{ color: rainColor(point.amount), fillColor: rainColor(point.amount), fillOpacity: 0.86, weight: 2 }}
            >
              <Popup>
                <strong>{point.city}</strong><br />
                {point.region}<br />
                Previsão: {formatNumber(point.amount, " mm")}<br />
                Período: {point.period}<br />
                Fonte: {point.source}
              </Popup>
            </CircleMarker>
          ))}
          {variant === "priority" && activeLayer === "rivers" && riverStations.map((station) => (
            <CircleMarker key={station.code} center={[station.latitude, station.longitude]} radius={selectedRiver?.code === station.code ? 8 : 6} pathOptions={{ color: selectedRiver?.code === station.code ? "#f59a23" : "#125f8f", fillColor: "#24a8d8", fillOpacity: 0.82, weight: selectedRiver?.code === station.code ? 4 : 2 }} eventHandlers={{ click: () => inspectRiver(station) }}>
              <Popup>
                <div className="river-popup-grid">
                  <strong>{station.name}</strong>
                  <span>Rio: {station.river}</span>
                  <span>Município: {station.city}</span>
                  {selectedRiver?.code === station.code && readingState === "ready" && riverReading ? (
                    <>
                      <span>Cota atual: {formatNumber(riverReading.level, " cm")}</span>
                      <span>Tendência: {riverReading.trend.arrow} {riverReading.trend.label}</span>
                      <span>Última atualização: {riverReading.dateTime}</span>
                      <span>Situação: Classificação oficial em integração</span>
                    </>
                  ) : selectedRiver?.code === station.code && readingState === "loading" ? (
                    <span>Atualizando cota observada...</span>
                  ) : (
                    <span>Clique para consultar cota e tendência observada.</span>
                  )}
                  <span>Fonte: ANA / Telemetria</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {variant === "priority" && activeLayer === "fire" && firePoints.map((point, index) => (
            <CircleMarker key={`${point.latitude}-${point.longitude}-${index}`} center={[point.latitude, point.longitude]} radius={5} pathOptions={{ color: "#ba3e24", fillColor: "#f25922", fillOpacity: 0.88, weight: 2 }}>
              <Popup><strong>{point.city}</strong><br />Foco detectado por satélite<br />{point.satellite || "INPE Queimadas"} {point.detectedAt ? `| ${point.detectedAt}` : ""}</Popup>
            </CircleMarker>
          ))}
          <MapBiomasFireOverlay active={variant === "priority" && activeLayer === "fire"} enabled={showBurnedArea} burnedArea={fireSummary?.burnedArea} />
          {variant === "priority" && activeLayer === "emergency" && emergencyPoints.map((point, index) => (
            <CircleMarker key={`${point.municipio}-${index}`} center={[point.latitude, point.longitude]} radius={7} pathOptions={{ color: "#a7211b", fillColor: "#d73027", fillOpacity: 0.9, weight: 2 }}>
              <Popup><strong>{point.municipio}</strong><br />{point.situacao}<br />{point.desastre || "Desastre não informado"}<br />{point.cobrade ? `COBRADE: ${point.cobrade}` : ""}</Popup>
            </CircleMarker>
          ))}
          {variant === "priority" && selectedResult && selectedResult.layer === activeLayer && (
            <SelectedSearchMarker result={selectedResult} />
          )}
        </MapContainer>
          <FloatingMapLegend activeLayer={activeLayer} rainMode={rainMode} />
          {activeLayer === "rain" && ["forecast24", "forecast48"].includes(rainMode) && forecastState.state !== "ready" && (
            <div className="map-mode-placeholder">
              <strong>{rainMode === "forecast24" ? "Previsão 24h" : "Previsão 48h"}</strong>
              <span>{forecastState.state === "loading" ? "Carregando previsão..." : "Não foi possível carregar a previsão no momento."}</span>
            </div>
          )}
        </div>
        {variant === "priority" ? (
          <MapInfoPanel
            activeLayer={activeLayer}
            query={searchQuery}
            results={searchResults}
            onQueryChange={setSearchQuery}
            onSelect={selectSearchResult}
            mapBiomasAvailable={Boolean(fireSummary?.burnedArea?.rasterUrl)}
            mapBiomasEnabled={showBurnedArea}
            onMapBiomasChange={setShowBurnedArea}
            summary={panelSummary}
          >
            {layerInformation}
          </MapInfoPanel>
        ) : (
          <aside className="map-readiness">
            <MapPinned aria-hidden="true" />
            <h3>Camadas técnicas</h3>
            <div className="layer-list" aria-label="Camadas previstas">
              {droughtLayers.map((label) => <span key={label}>{label}</span>)}
            </div>
            {droughtSummary?.state === "ready" ? (
              <>
                <p>Condição de seca monitorada por índice técnico no Tocantins.</p>
                <dl className="map-summary">
                  <div><dt>Situação geral</dt><dd>{droughtSummary.value}</dd></div>
                  <div><dt>Municípios com seca</dt><dd>{droughtSummary.summary.com_seca}</dd></div>
                  <div><dt>Severa ou extrema</dt><dd>{droughtSummary.summary.severa_ou_extrema}</dd></div>
                </dl>
                <strong>Fonte integrada: {droughtSummary.source}</strong>
                <small>Referência: {droughtSummary.reference}</small>
              </>
            ) : (
              <strong>Consulta automática em desenvolvimento</strong>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

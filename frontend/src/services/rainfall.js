import { parseCemadenStations } from "./cemadenParser";
import { fetchPublishedData } from "./publishedData";

const CEMADEN_24H_RESOURCE = "https://resources.cemaden.gov.br/dados/311_24.json";
const INMET_STATIONS_URL = "https://apitempo.inmet.gov.br/estacoes/T";
const ANA_RAIN_INVENTORY_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroInventario?codEstDE=&codEstATE=&tpEst=2&nmEst=&nmRio=&codSubBacia=&codBacia=&nmMunicipio=&nmEstado=Tocantins&sgResp=&sgOper=&telemetrica=1";
const ANA_READINGS_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos";

function classifyRain(amount) {
  if (amount >= 50) return "intensa";
  if (amount >= 30) return "forte";
  if (amount >= 10) return "moderada";
  if (amount > 0) return "fraca";
  return "sem_chuva";
}

function formatMillimeters(value) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm`;
}

function normalizeRainStation(station, source, updatedAt) {
  const amount = Number(station.amount ?? station.chuva24h ?? 0);
  const latitude = Number(station.latitude);
  const longitude = Number(station.longitude);
  return {
    id: `${source}-${station.code || station.id || station.name || station.nome}`,
    code: String(station.code || station.id || ""),
    nome: String(station.nome || station.name || "Estação de chuva"),
    name: String(station.name || station.nome || "Estação de chuva"),
    municipio: String(station.municipio || station.city || "Município não informado"),
    city: String(station.city || station.municipio || "Município não informado"),
    fonte: source,
    source,
    latitude,
    longitude,
    chuva24h: Number.isFinite(amount) ? amount : 0,
    amount: Number.isFinite(amount) ? amount : 0,
    atualizadoEm: station.atualizadoEm || updatedAt || null,
    updatedAt: station.updatedAt || updatedAt || null,
    status: station.status || classifyRain(Number.isFinite(amount) ? amount : 0),
    observacao: station.observacao || ""
  };
}

function statusLabel(status) {
  if (status === "ready") return "Operando";
  if (status === "catalog") return "Sem leitura válida";
  if (status === "error") return "Erro de consulta";
  if (status === "integration") return "Fonte em integração";
  return "Fonte indisponível no momento";
}

function withTimeout(promise, message, timeoutMs = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => reject(new Error(message)), timeoutMs))
  ]);
}

function jsonp(url, callbackName = "estacoes", timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite ao consultar CEMADEN"));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timeoutId);
      script.remove();
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("CEMADEN indisponível"));
    };
    script.src = `${url}?v=${Date.now()}`;
    document.head.appendChild(script);
  });
}

async function fetchJson(url) {
  const response = await withTimeout(
    fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, { cache: "no-store" }),
    "Tempo limite ao consultar a fonte"
  );
  if (!response.ok) throw new Error(`Fonte indisponível: ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await withTimeout(
    fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, { cache: "no-store" }),
    "Tempo limite ao consultar a fonte"
  );
  if (!response.ok) throw new Error(`Fonte indisponível: ${response.status}`);
  return response.text();
}

function recentIsoDates(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return date.toISOString().slice(0, 10);
  });
}

function formatAnaDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function recentAnaPeriod() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 1);
  return { start: formatAnaDate(start), end: formatAnaDate(end) };
}

async function fetchCemadenRain() {
  const parsed = parseCemadenStations(await jsonp(CEMADEN_24H_RESOURCE));
  const stations = parsed.stations.map((station) => normalizeRainStation(station, "CEMADEN", parsed.updatedAt));
  return {
    source: "CEMADEN",
    status: "ready",
    label: "Operando",
    message: "Fonte operacional principal para chuva observada 24h.",
    updatedAt: parsed.updatedAt,
    registeredCount: parsed.stations.length,
    queriedCount: parsed.stations.length,
    validCount: stations.length,
    stations
  };
}

async function fetchInmetStationReadings(code) {
  for (const date of recentIsoDates(10)) {
    try {
      const readings = await fetchJson(`https://apitempo.inmet.gov.br/estacao/dados/${date}/${code}`);
      const rows = Array.isArray(readings) ? readings : [];
      if (!rows.length) continue;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recentRows = rows.filter((row) => {
        const hour = String(row.HR_MEDICAO || "0000").padStart(4, "0");
        const stamp = new Date(`${row.DT_MEDICAO}T${hour.slice(0, 2)}:${hour.slice(2, 4)}:00Z`).getTime();
        return Number.isFinite(stamp) && stamp >= cutoff;
      });
      const validRows = recentRows.length ? recentRows : rows;
      const amount = validRows.reduce(
        (sum, row) => sum + Number(String(row.CHUVA ?? row.chuva ?? 0).replace(",", ".") || 0),
        0
      );
      const latest = validRows[validRows.length - 1];
      return {
        amount: Number.isFinite(amount) ? amount : 0,
        updatedAt: [latest.DT_MEDICAO, latest.HR_MEDICAO].filter(Boolean).join(" "),
        observacao: recentRows.length ? "Somatório das últimas 24h." : "Somatório do dia mais recente disponível."
      };
    } catch {
      // Tenta datas recentes antes de declarar fonte sem leitura.
    }
  }
  return null;
}

async function fetchInmetRain() {
  const stations = (await fetchJson(INMET_STATIONS_URL))
    .filter((station) => station.SG_ESTADO === "TO" && station.CD_ESTACAO)
    .map((station) => ({
      code: station.CD_ESTACAO,
      name: station.DC_NOME,
      city: station.DC_NOME,
      latitude: Number(station.VL_LATITUDE),
      longitude: Number(station.VL_LONGITUDE)
    }))
    .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude));

  const settled = await Promise.allSettled(stations.map(async (station) => {
    const reading = await fetchInmetStationReadings(station.code);
    if (!reading) return null;
    return normalizeRainStation({ ...station, amount: reading.amount, atualizadoEm: reading.updatedAt, observacao: reading.observacao }, "INMET", reading.updatedAt);
  }));
  const observed = settled.map((item) => item.value).filter(Boolean);

  return {
    source: "INMET",
    status: observed.length ? "ready" : "catalog",
    label: observed.length ? "Operando" : "Sem leitura válida",
    message: observed.length
      ? "Leituras automáticas integradas quando a API permite consulta."
      : "Fonte sem leituras válidas nas últimas 24h ou bloqueada por CORS no navegador.",
    registeredCount: stations.length,
    queriedCount: stations.length,
    validCount: observed.length,
    updatedAt: observed[0]?.updatedAt || null,
    stations: observed
  };
}

function text(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() || "";
}

function parseAnaRainInventory(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  return [...xml.querySelectorAll("Table")]
    .map((node) => ({
      code: text(node, "Codigo"),
      name: text(node, "Nome") || "Estação ANA",
      city: text(node, "nmMunicipio") || "Município não informado",
      latitude: Number(String(text(node, "Latitude")).replace(",", ".")),
      longitude: Number(String(text(node, "Longitude")).replace(",", ".")),
      operator: text(node, "OperadoraSigla") || text(node, "ResponsavelSigla")
    }))
    .filter((station) => station.code && Number.isFinite(station.latitude) && Number.isFinite(station.longitude));
}

function parseAnaRainAmount(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const rows = [...xml.querySelectorAll("DadosHidrometereologicos, DadosHidrometeorologicos, Table")];
  const amounts = rows
    .map((node) => Number(String(text(node, "Chuva") || text(node, "Precipitacao") || text(node, "PrecipitacaoTotal") || "0").replace(",", ".")))
    .filter((value) => Number.isFinite(value));
  if (!amounts.length) return null;
  return amounts.reduce((sum, value) => sum + value, 0);
}

async function fetchAnaRain() {
  const stations = parseAnaRainInventory(await fetchText(ANA_RAIN_INVENTORY_URL));
  const { start, end } = recentAnaPeriod();
  const sample = stations.slice(0, 60);
  const settled = await Promise.allSettled(sample.map(async (station) => {
    const params = new URLSearchParams({ codEstacao: station.code, dataInicio: start, dataFim: end });
    const amount = parseAnaRainAmount(await fetchText(`${ANA_READINGS_URL}?${params}`));
    if (amount === null) return null;
    return normalizeRainStation({ ...station, amount, atualizadoEm: `${start} a ${end}` }, "ANA", `${start} a ${end}`);
  }));
  const observed = settled.map((item) => item.value).filter(Boolean);

  return {
    source: "ANA",
    status: observed.length ? "ready" : "catalog",
    label: observed.length ? "Operando" : "Sem leitura válida",
    message: observed.length
      ? `Leitura 24h obtida em ${observed.length} estação(ões); consulta direta limitada para preservar desempenho.`
      : "Estações cadastradas, mas sem leitura operacional de precipitação na consulta direta.",
    registeredCount: stations.length,
    queriedCount: sample.length,
    validCount: observed.length,
    updatedAt: observed[0]?.updatedAt || null,
    stations: observed
  };
}

async function sourceInIntegration(source) {
  return {
    source,
    status: "integration",
    label: "Fonte em integração",
    message: "Acesso/API não configurado para consulta automática pública.",
    registeredCount: 0,
    queriedCount: 0,
    validCount: 0,
    updatedAt: null,
    stations: []
  };
}

function sourceError(source, error, registeredCount = 0) {
  const corsHint = /failed to fetch|load failed|networkerror|cors/i.test(error?.message || "");
  return {
    source,
    status: "error",
    label: corsHint ? "Fonte indisponível no navegador" : "Erro de consulta",
    message: corsHint
      ? "Falha ao consultar a fonte no navegador. Quando disponível, usar a base consolidada publicada pelo workflow."
      : error?.message || "Falha ao consultar a fonte no momento.",
    registeredCount,
    queriedCount: 0,
    validCount: 0,
    updatedAt: null,
    stations: []
  };
}

function normalizePublishedRainStation(station, source, updatedAt) {
  return normalizeRainStation({
    ...station,
    code: station.codigo || station.code || station.id,
    name: station.nome || station.name,
    city: station.municipio || station.city,
    amount: station.chuva24h ?? station.amount,
    atualizadoEm: station.atualizadoEm || updatedAt,
    observacao: station.observacao
  }, source, station.atualizadoEm || updatedAt);
}

async function fetchPublishedRainSources() {
  try {
    const data = await fetchPublishedData();
    const sourceData = data?.chuva_observada?.fontes;
    if (!sourceData) return {};
    return Object.fromEntries(Object.entries(sourceData).map(([source, item]) => {
      const stations = (item.estacoes || item.stations || [])
        .map((station) => normalizePublishedRainStation(station, source, item.atualizadoEm || data.chuva_observada?.atualizadoEm))
        .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude));
      return [source, {
        source,
        status: item.status || (stations.length ? "ready" : "catalog"),
        label: item.label || (stations.length ? "Operando" : statusLabel(item.status || "catalog")),
        message: item.observacao || item.message || null,
        registeredCount: item.estacoesCadastradas ?? item.registeredCount ?? stations.length,
        queriedCount: item.estacoesConsultadas ?? item.queriedCount ?? item.registeredCount ?? stations.length,
        validCount: item.estacoesComLeitura ?? item.validCount ?? stations.length,
        updatedAt: item.atualizadoEm || data.chuva_observada?.atualizadoEm || null,
        stations
      }];
    }));
  } catch {
    return {};
  }
}

export function deduplicateRainStations(stations) {
  const seen = new Set();
  return stations.filter((station) => {
    const key = [
      station.fonte,
      station.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
      Math.round(station.latitude * 1000),
      Math.round(station.longitude * 1000)
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildRainfallIndicator(results, fallback) {
  const stations = deduplicateRainStations(results.flatMap((result) => result.stations));
  const bySource = results.reduce((summary, result) => {
    summary[result.source] = {
      status: result.status,
      label: result.label || statusLabel(result.status),
      count: result.validCount ?? result.stations.length,
      registeredCount: result.registeredCount ?? result.stations.length,
      queriedCount: result.queriedCount ?? null,
      validCount: result.validCount ?? result.stations.length,
      message: result.message || null,
      updatedAt: result.updatedAt
    };
    return summary;
  }, {});
  const sorted = [...stations].sort((a, b) => b.chuva24h - a.chuva24h);
  const mostRain = sorted[0];
  const maximum = mostRain?.chuva24h ?? 0;
  const integratedSources = results.filter((result) => ["ready", "catalog"].includes(result.status));
  const readySources = results.filter((result) => result.status === "ready" && result.stations.length > 0);

  if (!stations.length) {
    return {
      ...fallback,
      state: "empty",
      tone: "normal",
      value: "Sem registros ativos no momento",
      description: "Nenhuma fonte integrada retornou chuva observada para o Tocantins.",
      source: "CEMADEN / INMET / ANA / SEMARH",
      stations: [],
      sourceBreakdown: bySource,
      updatedAt: null
    };
  }

  return {
    ...fallback,
    state: "ready",
    tone: maximum >= 30 ? "alert" : maximum >= 10 ? "attention" : "normal",
    value: formatMillimeters(maximum),
    description: `Maior acumulado: ${mostRain.municipio} | ${stations.length} estações com leitura 24h.`,
    source: (readySources.length ? readySources : integratedSources).map((result) => result.source).join(" / "),
    stations,
    sourceBreakdown: bySource,
    updatedAt: mostRain.atualizadoEm || readySources[0]?.updatedAt || null
  };
}

function mergeSourceResult(live, published) {
  if (live?.status === "ready" && live.stations?.length) return live;
  if (published?.stations?.length || published?.registeredCount) {
    return {
      ...published,
      message: published.message || live?.message || "Base consolidada publicada pelo workflow.",
      status: published.stations?.length ? "ready" : published.status || live?.status || "catalog",
      label: published.stations?.length ? "Operando" : published.label || live?.label || statusLabel(published.status)
    };
  }
  return live;
}

export async function getChuvaObservada24h(fallback) {
  const published = await fetchPublishedRainSources();
  const liveResults = await Promise.all([
    fetchCemadenRain().catch((error) => sourceError("CEMADEN", error)),
    fetchInmetRain().catch((error) => sourceError("INMET", error, published.INMET?.registeredCount || 0)),
    fetchAnaRain().catch((error) => sourceError("ANA", error, published.ANA?.registeredCount || 0)),
    sourceInIntegration("SEMARH")
  ]);
  const results = liveResults.map((result) => mergeSourceResult(result, published[result.source]));

  return buildRainfallIndicator(results, fallback);
}

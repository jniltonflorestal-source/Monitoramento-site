import { parseCemadenStations } from "./cemadenParser";

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
    status: classifyRain(Number.isFinite(amount) ? amount : 0)
  };
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
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Fonte indisponível: ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`, { cache: "no-store" });
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
  return {
    source: "CEMADEN",
    status: "ready",
    updatedAt: parsed.updatedAt,
    registeredCount: parsed.stations.length,
    stations: parsed.stations.map((station) => normalizeRainStation(station, "CEMADEN", parsed.updatedAt))
  };
}

async function fetchInmetStationReadings(code) {
  for (const date of recentIsoDates(10)) {
    try {
      const readings = await fetchJson(`https://apitempo.inmet.gov.br/estacao/dados/${date}/${code}`);
      const rows = Array.isArray(readings) ? readings : [];
      if (!rows.length) continue;
      const amount = rows.reduce((sum, row) => sum + Number(String(row.CHUVA ?? row.chuva ?? 0).replace(",", ".") || 0), 0);
      const latest = rows[rows.length - 1];
      return {
        amount: Number.isFinite(amount) ? amount : 0,
        updatedAt: [latest.DT_MEDICAO, latest.HR_MEDICAO].filter(Boolean).join(" ")
      };
    } catch {
      // Try the next recent date before declaring the source unavailable.
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
    }));

  const settled = await Promise.allSettled(stations.map(async (station) => {
    const reading = await fetchInmetStationReadings(station.code);
    if (!reading) return null;
    return normalizeRainStation({ ...station, amount: reading.amount, atualizadoEm: reading.updatedAt }, "INMET", reading.updatedAt);
  }));
  const observed = settled.map((item) => item.value).filter(Boolean);

  return {
    source: "INMET",
    status: observed.length ? "ready" : "catalog",
    message: observed.length ? null : "Estações cadastradas; leitura 24h indisponível no momento",
    registeredCount: stations.length,
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
  const sample = stations.slice(0, 30);
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
    message: observed.length ? null : "Estações cadastradas; leitura 24h indisponível no momento",
    registeredCount: stations.length,
    updatedAt: observed[0]?.updatedAt || null,
    stations: observed
  };
}

async function sourceInIntegration(source) {
  return {
    source,
    status: "integration",
    message: "Rede estadual em integração",
    registeredCount: 0,
    updatedAt: null,
    stations: []
  };
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
      count: result.stations.length,
      registeredCount: result.registeredCount ?? result.stations.length,
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

export async function getChuvaObservada24h(fallback) {
  const results = await Promise.all([
    fetchCemadenRain().catch((error) => ({ source: "CEMADEN", status: "error", message: error.message, registeredCount: 0, stations: [] })),
    fetchInmetRain().catch((error) => ({ source: "INMET", status: "error", message: error.message, registeredCount: 0, stations: [] })),
    fetchAnaRain().catch((error) => ({ source: "ANA", status: "error", message: error.message, registeredCount: 0, stations: [] })),
    sourceInIntegration("SEMARH")
  ]);

  return buildRainfallIndicator(results, fallback);
}

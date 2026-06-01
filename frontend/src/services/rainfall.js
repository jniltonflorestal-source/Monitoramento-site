import { parseCemadenStations } from "./cemadenParser";

const CEMADEN_24H_RESOURCE = "https://resources.cemaden.gov.br/dados/311_24.json";

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

async function fetchCemadenRain() {
  const parsed = parseCemadenStations(await jsonp(CEMADEN_24H_RESOURCE));
  return {
    source: "CEMADEN",
    status: "ready",
    updatedAt: parsed.updatedAt,
    stations: parsed.stations.map((station) => normalizeRainStation(station, "CEMADEN", parsed.updatedAt))
  };
}

async function sourceInIntegration(source) {
  return {
    source,
    status: "integration",
    message: "Fonte em integração",
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
      message: result.message || null,
      updatedAt: result.updatedAt
    };
    return summary;
  }, {});
  const sorted = [...stations].sort((a, b) => b.chuva24h - a.chuva24h);
  const mostRain = sorted[0];
  const maximum = mostRain?.chuva24h ?? 0;
  const integratedSources = results.filter((result) => result.status === "ready" && result.stations.length > 0);

  if (!stations.length) {
    return {
      ...fallback,
      state: "empty",
      tone: "normal",
      value: "Sem registros ativos no momento",
      description: "Nenhuma estação integrada retornou chuva observada para o Tocantins.",
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
    description: `Maior acumulado: ${mostRain.municipio} | ${stations.length} estações consultadas.`,
    source: integratedSources.map((result) => result.source).join(" / "),
    stations,
    sourceBreakdown: bySource,
    updatedAt: mostRain.atualizadoEm || integratedSources[0]?.updatedAt || null
  };
}

export async function getChuvaObservada24h(fallback) {
  const results = await Promise.all([
    fetchCemadenRain().catch((error) => ({ source: "CEMADEN", status: "error", message: error.message, stations: [] })),
    sourceInIntegration("INMET"),
    sourceInIntegration("ANA"),
    sourceInIntegration("SEMARH")
  ]);

  return buildRainfallIndicator(results, fallback);
}

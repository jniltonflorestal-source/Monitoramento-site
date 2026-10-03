import { parseCemadenStations } from "./cemadenParser";
import { fetchPublishedData } from "./publishedData";
import { assessFreshness, nonNegativeValue, finiteValue, fetchWithDeadline, sumHourlyRain24h, FRESHNESS_HOURS } from './dataQuality.js';

const CEMADEN_24H_RESOURCE = "https://resources.cemaden.gov.br/dados/311_24.json";
const INMET_STATIONS_URL = "https://apitempo.inmet.gov.br/estacoes/T";
const ANA_RAIN_INVENTORY_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroInventario?codEstDE=&codEstATE=&tpEst=2&nmEst=&nmRio=&codSubBacia=&codBacia=&nmMunicipio=&nmEstado=Tocantins&sgResp=&sgOper=&telemetrica=1";

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

function readingStatusLabel(status) {
  if (status === "valida") return "Leitura válida";
  if (status === "desatualizada") return "Leitura desatualizada";
  if (status === "sem_leitura") return "Sem leitura 24h";
  if (status === "erro") return "Erro de consulta";
  if (status === "integracao") return "Fonte em integração";
  return "Status não informado";
}

function normalizeRainStation(station, source, updatedAt, options = {}) {
  const rawAmount = station.amount ?? station.chuva24h;
  const amount = nonNegativeValue(rawAmount);
  const latitude = finiteValue(station.latitude);
  const longitude = finiteValue(station.longitude);
  const observedAt = station.atualizadoEm || station.updatedAt || updatedAt || null;
  const quality = assessFreshness(observedAt, FRESHNESS_HOURS.rain);
  let statusLeitura = options.statusLeitura || station.statusLeitura || (Number.isFinite(amount) ? "valida" : "sem_leitura");
  if (statusLeitura === 'valida' && (amount === null || quality.status !== 'current')) statusLeitura = quality.status === 'stale' ? 'desatualizada' : 'sem_leitura';
  const validAmount = statusLeitura === "valida" && Number.isFinite(amount);
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
    chuva24h: validAmount ? amount : null,
    amount: validAmount ? amount : null,
    atualizadoEm: observedAt,
    updatedAt: observedAt,
    quality,
    status: validAmount ? classifyRain(amount) : statusLeitura,
    statusLeitura,
    statusLeituraLabel: readingStatusLabel(statusLeitura),
    motivoIndisponibilidade: station.motivoIndisponibilidade || options.motivoIndisponibilidade || (statusLeitura !== "valida" ? quality.message : ""),
    ultimaTentativa: station.ultimaTentativa || options.ultimaTentativa || updatedAt || new Date().toISOString(),
    consultada: station.consultada ?? options.consultada ?? true,
    observacao: quality.status !== 'current' ? quality.message : station.observacao || ""
  };
}

function normalizeUnavailableRainStation(station, source, statusLeitura = "sem_leitura", motivoIndisponibilidade = "Sem leitura válida nas últimas 24h", updatedAt = null, consultada = true) {
  return normalizeRainStation({
    ...station,
    amount: null,
    chuva24h: null,
    atualizadoEm: null,
    updatedAt: null,
    motivoIndisponibilidade,
    ultimaTentativa: updatedAt || new Date().toISOString(),
    consultada
  }, source, null, { statusLeitura, motivoIndisponibilidade, consultada });
}

function statusLabel(status) {
  if (status === "ready") return "Operando";
  if (status === "catalog") return "Sem leitura válida";
  if (status === "error") return "Erro de consulta";
  if (status === "integration") return "Fonte em integração";
  return "Fonte indisponível no momento";
}

function jsonp(url, callbackName = "estacoes", timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    // Isolate the fixed JSONP callback: late scripts cannot reach a newer query.
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(frame);
    const context = frame.contentWindow;
    const script = frame.contentDocument.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tempo limite ao consultar CEMADEN"));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timeoutId);
      context[callbackName] = () => {};
      frame.remove();
    }

    context[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("CEMADEN indisponível"));
    };
    script.src = `${url}?v=${Date.now()}`;
    frame.contentDocument.head.appendChild(script);
  });
}

async function fetchJson(url) {
  return fetchWithDeadline(url);
}

async function fetchText(url) {
  return fetchWithDeadline(url, 'text');
}

function recentIsoDates(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return date.toISOString().slice(0, 10);
  });
}

async function fetchCemadenRain() {
  const parsed = parseCemadenStations(await jsonp(CEMADEN_24H_RESOURCE));
  const allStations = parsed.stations.map((station) => normalizeRainStation(station, "CEMADEN", parsed.updatedAt));
  const stations = allStations.filter(station => station.statusLeitura === 'valida');
  return {
    source: "CEMADEN",
    status: stations.length ? "ready" : "catalog",
    label: stations.length ? "Operando" : "Sem leitura válida recente",
    message: "Fonte operacional principal para chuva observada 24h.",
    updatedAt: parsed.updatedAt,
    registeredCount: parsed.stations.length,
    queriedCount: parsed.stations.length,
    validCount: stations.length,
    stations,
    allStations
  };
}

async function fetchInmetStationReadings(code) {
  const days = await Promise.allSettled(recentIsoDates(2).map(date => fetchJson(`https://apitempo.inmet.gov.br/estacao/dados/${date}/${code}`)));
  const rows = days.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []);
  const result = sumHourlyRain24h(rows.map(row => {
    const hour = String(row.HR_MEDICAO ?? '').padStart(4, '0');
    return { time: `${String(row.DT_MEDICAO).slice(0,10)}T${hour.slice(0,2)}:${hour.slice(2,4)}:00Z`, amount: row.CHUVA ?? row.chuva };
  }));
  return result.amount === null ? null : { ...result, observacao: '24 leituras horárias válidas, sem duplicidades.' };
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

  const attemptAt = new Date().toISOString();
  const settled = await Promise.allSettled(stations.map(async (station) => {
    const reading = await fetchInmetStationReadings(station.code);
    if (!reading) return normalizeUnavailableRainStation(
      station,
      "INMET",
      "sem_leitura",
      "Sem 24 leituras horárias válidas, ou consulta indisponível no navegador.",
      attemptAt,
      true
    );
    return normalizeRainStation({ ...station, amount: reading.amount, atualizadoEm: reading.updatedAt, observacao: reading.observacao }, "INMET", reading.updatedAt);
  }));
  const allStations = settled.map((item, index) => (
    item.status === "fulfilled" && item.value
      ? item.value
      : normalizeUnavailableRainStation(stations[index], "INMET", "erro", "Falha ao consultar a estação no navegador.", attemptAt, true)
  )).filter(Boolean);
  const observed = allStations.filter((station) => station.statusLeitura === "valida");

  return {
    source: "INMET",
    status: observed.length ? "ready" : "catalog",
    label: observed.length ? "Operando" : "Sem leitura válida",
    message: observed.length
      ? "Leituras automáticas integradas quando a API permite consulta."
      : "Sem janela completa de 24h ou consulta indisponível no navegador.",
    registeredCount: stations.length,
    queriedCount: stations.length,
    validCount: observed.length,
    semLeituraCount: allStations.filter((station) => station.statusLeitura === "sem_leitura").length,
    errorCount: allStations.filter((station) => station.statusLeitura === "erro").length,
    integrationCount: allStations.filter((station) => station.statusLeitura === "integracao").length,
    updatedAt: observed[0]?.updatedAt || null,
    stations: observed,
    allStations
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

async function fetchAnaRain() {
  const stations = parseAnaRainInventory(await fetchText(ANA_RAIN_INVENTORY_URL));
  const attemptAt = new Date().toISOString();
  const message = 'Cadastro disponível. Acumulado ANA não usado sem confirmação da janela de 24h e do horário das leituras.';
  const allStations = stations.map(station => normalizeUnavailableRainStation(station, 'ANA', 'sem_leitura', message, null, false));
  return {
    source: 'ANA', status: 'catalog', label: 'Sem acumulado 24h validado', message,
    registeredCount: stations.length, queriedCount: 0, validCount: 0,
    semLeituraCount: stations.length, updatedAt: null, attemptedAt: attemptAt,
    stations: [], allStations
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
    semLeituraCount: 0,
    errorCount: 0,
    integrationCount: 0,
    updatedAt: null,
    stations: [],
    allStations: []
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
    semLeituraCount: 0,
    errorCount: registeredCount || 0,
    integrationCount: 0,
    updatedAt: null,
    stations: [],
    allStations: []
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
    observacao: station.observacao,
    statusLeitura: station.statusLeitura,
    motivoIndisponibilidade: station.motivoIndisponibilidade,
    ultimaTentativa: station.ultimaTentativa,
    consultada: station.consultada
  }, source, station.atualizadoEm || updatedAt, {
    statusLeitura: station.statusLeitura,
    motivoIndisponibilidade: station.motivoIndisponibilidade,
    consultada: station.consultada
  });
}

async function fetchPublishedRainSources() {
  try {
    const data = await fetchPublishedData();
    const sourceData = data?.chuva_observada?.fontes;
    if (!sourceData) return {};
    return Object.fromEntries(Object.entries(sourceData).map(([source, item]) => {
      const failed = data.chuva_observada?.status === 'erro' || item.status === 'error' || Boolean(data.erros_atualizacao?.chuva_observada);
      const normalize = station => normalizePublishedRainStation(failed ? {...station, statusLeitura:'erro'} : station, source, item.atualizadoEm);
      const stations = (item.estacoes || item.stations || [])
        .map(normalize)
        .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude) && station.statusLeitura === "valida");
      const allStations = (item.todasEstacoes || item.allStations || item.estacoes || item.stations || [])
        .map(normalize)
        .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude));
      return [source, {
        source,
        status: failed ? 'error' : stations.length ? 'ready' : item.status === 'ready' ? 'catalog' : item.status || 'catalog',
        label: failed ? 'Erro de consulta' : stations.length ? 'Operando' : statusLabel(item.status === 'ready' ? 'catalog' : item.status || 'catalog'),
        message: failed ? 'Falha na atualização publicada; valores anteriores não confirmados.' : !stations.length && (item.estacoesComLeitura || item.validCount) ? 'Leituras publicadas antigas ou sem horário válido; não usadas no acumulado 24h.' : item.observacao || item.message || null,
        registeredCount: item.estacoesCadastradas ?? item.registeredCount ?? allStations.length,
        queriedCount: item.estacoesConsultadas ?? item.queriedCount ?? item.registeredCount ?? allStations.length,
        validCount: stations.length,
        staleCount: allStations.filter(station => station.quality?.status === 'stale').length,
        attemptedAt: data.qualidade_fontes?.chuva_observada?.ultimaTentativa || data.chuva_observada?.atualizadoEm || null,
        semLeituraCount: item.estacoesSemLeitura ?? item.semLeituraCount ?? allStations.filter((station) => station.statusLeitura === "sem_leitura").length,
        errorCount: item.estacoesComErro ?? item.errorCount ?? allStations.filter((station) => station.statusLeitura === "erro").length,
        integrationCount: item.estacoesEmIntegracao ?? item.integrationCount ?? allStations.filter((station) => station.statusLeitura === "integracao").length,
        updatedAt: item.atualizadoEm || null,
        stations,
        allStations
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
  const allStations = deduplicateRainStations(results.flatMap((result) => result.allStations || result.stations));
  const visibleStations = allStations;
  const bySource = results.reduce((summary, result) => {
    summary[result.source] = {
      status: result.status,
      label: result.label || statusLabel(result.status),
      count: result.validCount ?? result.stations.length,
      registeredCount: result.registeredCount ?? result.stations.length,
      queriedCount: result.queriedCount ?? null,
      validCount: result.validCount ?? result.stations.length,
      semLeituraCount: result.semLeituraCount ?? (result.allStations || []).filter((station) => station.statusLeitura === "sem_leitura").length,
      errorCount: result.errorCount ?? (result.allStations || []).filter((station) => station.statusLeitura === "erro").length,
      integrationCount: result.integrationCount ?? (result.allStations || []).filter((station) => station.statusLeitura === "integracao").length,
      message: result.message || null,
      staleCount: result.staleCount ?? (result.allStations || []).filter(station => station.quality?.status === 'stale').length,
      attemptedAt: result.attemptedAt || new Date().toISOString(),
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
      tone: "empty",
      value: "Sem leitura válida",
      description: "Não há medição recente confirmada. Isso não significa ausência de chuva.",
      source: "CEMADEN / INMET / ANA / SEMARH",
      stations: [],
      allStations,
      visibleStations,
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
    allStations,
    visibleStations,
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

export async function getChuvaObservada24h(fallback, options = {}) {
  const incluirSemLeitura = options.incluirSemLeitura ?? true;
  const published = await fetchPublishedRainSources();
  const liveResults = await Promise.all([
    fetchCemadenRain().catch((error) => sourceError("CEMADEN", error)),
    published.INMET?.stations?.length ? Promise.resolve(published.INMET) : fetchInmetRain().catch((error) => sourceError("INMET", error, published.INMET?.registeredCount || 0)),
    published.ANA?.stations?.length ? Promise.resolve(published.ANA) : fetchAnaRain().catch((error) => sourceError("ANA", error, published.ANA?.registeredCount || 0)),
    sourceInIntegration("SEMARH")
  ]);
  const results = liveResults.map((result) => mergeSourceResult(result, published[result.source]));

  const indicator = buildRainfallIndicator(results, fallback);
  if (!incluirSemLeitura) return { ...indicator, allStations: indicator.stations, visibleStations: indicator.stations };
  return indicator;
}

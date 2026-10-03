import { parseAnaInventory, parseAnaReadings } from "./anaParser";
import { fetchWithDeadline, assessFreshness } from './dataQuality.js';

const INVENTORY_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/HidroInventario?codEstDE=&codEstATE=&tpEst=1&nmEst=&nmRio=&codSubBacia=&codBacia=&nmMunicipio=&nmEstado=Tocantins&sgResp=&sgOper=&telemetrica=1";
const READINGS_URL = "https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos";

function todayForAna() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${today.getFullYear()}`;
}

export async function getSituacaoRios(fallback) {
  try {
    const stations = parseAnaInventory(await fetchWithDeadline(INVENTORY_URL, 'text'));
    return {
      ...fallback,
      state: "ready",
      tone: "empty",
      value: `${stations.length} estações`,
      description: "Estações cadastradas. O cadastro não confirma nível normal; consulte as leituras no mapa.",
      quality: { status: 'catalog', message: 'Catálogo consultado; níveis e tendências são verificados por estação.' },
      attemptedAt: new Date().toISOString(),
      source: "ANA / Telemetria",
      stations
    };
  } catch (error) {
    return { ...fallback, state: "error", tone: 'empty', value: "Dados indisponíveis", description: 'Não foi possível consultar o catálogo ANA neste momento.', stations: [] };
  }
}

const readingCache = new Map();
const readingRequests = new Map();
export async function getAnaStationReading(code, days = 1) {
  const key = `${code}:${days}`;
  const cached = readingCache.get(key);
  if (cached && Date.now() - cached.time < 300000) return cached.value;
  if (readingRequests.has(key)) return readingRequests.get(key);
  const request = loadAnaStationReading(code, days).then(value => {
    readingCache.set(key, { time: Date.now(), value });
    return value;
  }).finally(() => readingRequests.delete(key));
  readingRequests.set(key, request);
  return request;
}

async function loadAnaStationReading(code, days) {
  const date = todayForAna();
  const start = new Date(Date.now() - days * 86400000);
  const startDate = `${String(start.getDate()).padStart(2,'0')}/${String(start.getMonth()+1).padStart(2,'0')}/${start.getFullYear()}`;
  const params = new URLSearchParams({ codEstacao: code, dataInicio: startDate, dataFim: date });
  const value = parseAnaReadings(await fetchWithDeadline(`${READINGS_URL}?${params}`, 'text'));
  return value ? { ...value, quality: assessFreshness(value.dateTime, 24) } : null;
}

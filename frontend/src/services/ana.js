import { parseAnaInventory, parseAnaReadings } from "./anaParser";
import { fetchWithDeadline, assessFreshness } from './dataQuality.js';
import { summarizeRiverStations } from './hydrologyMetrics.js';

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
    const [inventory, collected] = await Promise.allSettled([
      fetchWithDeadline(INVENTORY_URL, 'text').then(parseAnaInventory),
      fetchWithDeadline(`${import.meta.env.BASE_URL}data/river-summary.json`)
    ]);
    const summaryFile = collected.status === 'fulfilled' ? collected.value : null;
    const collectionCurrent=assessFreshness(summaryFile?.attemptedAt, 3).status==='current';
    const summaryRows=(Array.isArray(summaryFile?.stations)?summaryFile.stations:[]).map(row=>({...row,status:collectionCurrent && summaryFile.status!=='error'?row.status:'error'}));
    const hydrology=summarizeRiverStations(summaryRows);
    const stations=inventory.status==='fulfilled'&&inventory.value.length?inventory.value:summaryRows.filter(row=>row.code&&Number.isFinite(row.latitude)&&Number.isFinite(row.longitude));
    if (!stations.length) throw new Error('Catálogo indisponível');
    const byCode=new Map(summaryRows.map(row=>[String(row.code),row]));
    const merged=stations.map(station=>({...station,collected:byCode.get(String(station.code))||null}));
    const observedAt=hydrology.rows.filter(row=>row.status==='ok'&&row.analysis.quality==='current').map(row=>row.analysis.latest.dateTime).sort((a,b)=>Date.parse(a)-Date.parse(b)).at(-1);
    return {
      ...fallback,
      state: "ready",
      tone: "empty",
      value: `${stations.length} estações`,
      description: "Estações cadastradas. O cadastro não confirma nível normal; consulte as leituras no mapa.",
      quality: { status: hydrology.valid?'current':'catalog', message: hydrology.valid?'Leituras disponíveis; cobertura informada no resumo.':'Catálogo consultado; níveis e tendências são verificados por estação.' },
      attemptedAt: new Date().toISOString(),
      source: "ANA / Telemetria",
      stations:merged, hydrology, observedAt, collectionAttemptedAt:summaryFile?.attemptedAt,
      collectionStatus:collectionCurrent?summaryFile.status:'unavailable'
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

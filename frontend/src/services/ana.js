import { parseAnaInventory, parseAnaReadings } from "./anaParser";

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
    const response = await fetch(INVENTORY_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Rede ANA indisponível");
    const stations = parseAnaInventory(await response.text());
    return {
      ...fallback,
      state: "ready",
      tone: "normal",
      value: `${stations.length} estações`,
      description: "Rede telemétrica disponível. Clique no mapa para consultar cota e tendência observada.",
      source: "ANA / Telemetria",
      stations
    };
  } catch (error) {
    return { ...fallback, state: "error", value: "Dados indisponíveis", stations: [] };
  }
}

const readingCache = new Map();
export async function getAnaStationReading(code, days = 1) {
  const key = `${code}:${days}`;
  const cached = readingCache.get(key);
  if (cached && Date.now() - cached.time < 300000) return cached.value;
  const date = todayForAna();
  const start = new Date(Date.now() - days * 86400000);
  const startDate = `${String(start.getDate()).padStart(2,'0')}/${String(start.getMonth()+1).padStart(2,'0')}/${start.getFullYear()}`;
  const params = new URLSearchParams({ codEstacao: code, dataInicio: startDate, dataFim: date });
  const response = await fetch(`${READINGS_URL}?${params}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Leitura ANA indisponível");
  const value = parseAnaReadings(await response.text());
  readingCache.set(key, {time:Date.now(),value});
  return value;
}

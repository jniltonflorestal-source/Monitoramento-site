const INMET_PREVISAO_URL = "https://apiprevmet3.inmet.gov.br/previsao/";
const CACHE_PREFIX = "inmet-previsao-to:";
const CACHE_TTL_MS = 60 * 60 * 1000;

export const MUNICIPIOS_ESTRATEGICOS_TO = [
  { nome: "Palmas", codigoIbge: "1721000", regiao: "Central", latitude: -10.184, longitude: -48.333 },
  { nome: "Araguaína", codigoIbge: "1702109", regiao: "Norte", latitude: -7.19, longitude: -48.207 },
  { nome: "Gurupi", codigoIbge: "1709500", regiao: "Sul", latitude: -11.729, longitude: -49.068 },
  { nome: "Dianópolis", codigoIbge: "1707009", regiao: "Sudeste", latitude: -11.626, longitude: -46.82 },
  { nome: "Mateiros", codigoIbge: "1712702", regiao: "Jalapão", latitude: -10.546, longitude: -46.416 },
  { nome: "Lagoa da Confusão", codigoIbge: "1711902", regiao: "Ilha do Bananal / Araguaia", latitude: -10.79, longitude: -49.62 },
  { nome: "Porto Nacional", codigoIbge: "1718204", regiao: "Central", latitude: -10.708, longitude: -48.417 },
  { nome: "Tocantinópolis", codigoIbge: "1721208", regiao: "Bico do Papagaio", latitude: -6.324, longitude: -47.422 },
  { nome: "Pedro Afonso", codigoIbge: "1716505", regiao: "Centro-Norte", latitude: -8.97, longitude: -48.172 },
  { nome: "Formoso do Araguaia", codigoIbge: "1708205", regiao: "Sudoeste / Ilha do Bananal", latitude: -11.797, longitude: -49.531 }
];

function getCache(key) {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

function setCache(key, payload) {
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ savedAt: Date.now(), payload }));
  } catch {
    // Cache é apenas otimização; não bloqueia a consulta.
  }
}

function clean(value, fallback = "Não informado") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function hasPrevisaoChuva(previsao) {
  const text = [
    previsao?.resumo,
    previsao?.tempo,
    previsao?.condicao,
    previsao?.descricao
  ].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /chuva|pancada|tempestade|trovoada|precipitacao|instabilidade/.test(text);
}

function flattenForecast(payload, place, mode) {
  const cityData = payload?.[place.codigoIbge] || payload || {};
  const dates = Object.keys(cityData).sort((a, b) => {
    const [da, ma, ya] = a.split("/").map(Number);
    const [db, mb, yb] = b.split("/").map(Number);
    return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
  });
  const dateKey = mode === "forecast48" ? dates[1] || dates[0] : dates[0];
  const day = cityData?.[dateKey] || {};
  const shifts = Object.values(day).filter((item) => item && typeof item === "object");
  const selected = shifts.find((item) => hasPrevisaoChuva(item)) || shifts[0] || {};
  const minValues = shifts.map((item) => Number(item.temp_min)).filter(Number.isFinite);
  const maxValues = shifts.map((item) => Number(item.temp_max)).filter(Number.isFinite);
  const hasRain = shifts.some(hasPrevisaoChuva);
  const condition = clean(selected.resumo || selected.tempo || selected.condicao);

  return {
    id: `${mode}-${place.codigoIbge}`,
    city: place.nome,
    municipio: place.nome,
    codigoIbge: place.codigoIbge,
    region: place.regiao,
    regiao: place.regiao,
    latitude: place.latitude,
    longitude: place.longitude,
    condition,
    condicao: condition,
    hasRain,
    tempMin: minValues.length ? Math.min(...minValues) : null,
    tempMax: maxValues.length ? Math.max(...maxValues) : null,
    wind: clean(selected.int_vento || selected.dir_vento),
    vento: clean([selected.dir_vento, selected.int_vento].filter(Boolean).join(" / ")),
    period: mode === "forecast48" ? "Previsão INMET 48h" : "Previsão INMET 24h",
    dataPrevisao: dateKey || "Não informado",
    source: "INMET",
    updatedAt: new Date().toISOString(),
    raw: selected
  };
}

export async function getPrevisaoMunicipioInmet(codigoIbge, options = {}) {
  const cacheKey = codigoIbge;
  if (!options.forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }
  const response = await fetch(`${INMET_PREVISAO_URL}${codigoIbge}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Previsão INMET indisponível no momento");
  const payload = await response.json();
  setCache(cacheKey, payload);
  return payload;
}

export async function getPrevisaoTocantinsInmet(mode = "forecast24", options = {}) {
  const settled = await Promise.allSettled(MUNICIPIOS_ESTRATEGICOS_TO.map(async (place) => {
    const payload = await getPrevisaoMunicipioInmet(place.codigoIbge, options);
    return flattenForecast(payload, place, mode);
  }));
  const points = settled
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value);
  const errors = settled.filter((item) => item.status === "rejected").length;
  if (!points.length) throw new Error("Previsão INMET indisponível no momento");
  const conditionCounts = points.reduce((acc, point) => {
    acc[point.condition] = (acc[point.condition] || 0) + 1;
    return acc;
  }, {});
  const condicaoPredominante = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Não informado";
  const rainy = points.filter((point) => point.hasRain);

  return {
    state: "ready",
    source: "INMET",
    updatedAt: new Date().toISOString(),
    period: mode === "forecast48" ? "Previsão INMET 48h" : "Previsão INMET 24h",
    points,
    municipiosConsultados: points.length,
    condicaoPredominante,
    comPossibilidadeChuva: rainy.length,
    rainyCities: rainy.map((point) => point.city),
    errors,
    maximum: rainy[0] || points[0] || null,
    above10: rainy.length,
    above30: 0,
    above50: 0,
    note: rainy.length
      ? "Há município(s) estratégico(s) com condição relacionada à chuva na previsão do INMET."
      : "Não há indicação textual de chuva nos municípios estratégicos consultados."
  };
}

export function getPrevisao24hTocantins(options = {}) {
  return getPrevisaoTocantinsInmet("forecast24", options);
}

export function getPrevisao48hTocantins(options = {}) {
  return getPrevisaoTocantinsInmet("forecast48", options);
}

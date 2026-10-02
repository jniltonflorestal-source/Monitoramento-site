import { booleanPointInPolygon, point, pointOnFeature } from "@turf/turf";
import { cachedJson } from "./operationalMap.js";

export function finiteReading(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function inMunicipality(row, feature) {
  const lat = finiteReading(row.latitude),
    lon = finiteReading(row.longitude);
  return (
    lat !== null &&
    lon !== null &&
    booleanPointInPolygon(point([lon, lat]), feature)
  );
}
export function municipalObservations(feature, rain = [], rivers = []) {
  const local = rain.filter((r) => inMunicipality(r, feature));
  const valid = local.filter(
    (r) =>
      finiteReading(r.amount ?? r.chuva24h) !== null &&
      (!r.statusLeitura || r.statusLeitura === "valida"),
  );
  return {
    rain: local,
    validRain: valid,
    maxRain24: valid.length
      ? Math.max(...valid.map((r) => Number(r.amount ?? r.chuva24h)))
      : null,
    rivers: rivers.filter((r) => inMunicipality(r, feature)),
  };
}
export async function municipalWeather(feature) {
  const [longitude, latitude] = pointOnFeature(feature).geometry.coordinates;
  const query = new URLSearchParams({
    latitude,
    longitude,
    models: "gfs_seamless",
    hourly:
      "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation",
    forecast_days: "3",
    timeformat: "unixtime",
    timezone: "UTC",
  });
  const data = await cachedJson(
    `https://api.open-meteo.com/v1/forecast?${query}`,
    3600000,
  );
  if (!data.hourly?.time?.length) throw new Error("Previsão indisponível");
  return { ...data, queriedAt: new Date().toISOString(), latitude, longitude };
}
export async function municipalBurnedArea(feature) {
  const api = "https://plataforma.monitorfogo.mapbiomas.org/api";
  const years = await cachedJson(`${api}/statistics/years`);
  const year = Math.max(...years),
    months = await cachedJson(`${api}/statistics/${year}/months`),
    month = Math.max(...months);
  if (!Number.isFinite(year) || !Number.isFinite(month))
    throw new Error("Período indisponível");
  const code = feature.properties.codarea;
  const query = `year=${year}&monthStart=${month}&monthEnd=${month}`;
  const area = await cachedJson(
    `${api}/statistics/area/city/${code}/city?${query}`,
  );
  if (finiteReading(area.areaHa) === null) throw new Error("Área indisponível");
  return {
    hectares: Number(area.areaHa),
    period: `${String(month).padStart(2, "0")}/${year}`,
    source: "MapBiomas Monitor do Fogo",
    territory: feature.properties.nome,
    updatedAt: new Date().toISOString(),
    rasterEndpoint: `${api}/maps/fire/monthly?territoryType=city&territoryCode=${code}&${query}`,
  };
}

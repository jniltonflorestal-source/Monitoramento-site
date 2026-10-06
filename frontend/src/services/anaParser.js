import { analyzeRiverSeries } from './hydrologyMetrics.js';

function asNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeAnaStations(records) {
  return records
    .map((record) => ({
      code: String(record.code || "").trim(),
      name: String(record.name || "").trim() || "Estação ANA",
      river: String(record.river || "").trim() || "Rio não informado",
      city: String(record.city || "").trim() || "Município não informado",
      latitude: asNumber(record.latitude),
      longitude: asNumber(record.longitude)
    }))
    .filter((station) => station.code && station.latitude !== null && station.longitude !== null);
}

export function computeRiverTrend(current, previous) {
  const currentLevel = asNumber(current);
  const previousLevel = asNumber(previous);
  if (currentLevel === null || previousLevel === null) return { label: "Sem tendência", direction: "unknown", arrow: "-" };
  if (currentLevel > previousLevel) return { label: "Subindo", direction: "up", arrow: "↑" };
  if (currentLevel < previousLevel) return { label: "Descendo", direction: "down", arrow: "↓" };
  return { label: "Estável", direction: "stable", arrow: "→" };
}

function text(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() || "";
}

export function parseAnaInventory(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  return normalizeAnaStations([...xml.querySelectorAll("Table")].map((node) => ({
    code: text(node, "Codigo"),
    name: text(node, "Nome"),
    river: text(node, "RioNome"),
    city: text(node, "nmMunicipio"),
    latitude: text(node, "Latitude"),
    longitude: text(node, "Longitude")
  })));
}

export function parseAnaReadings(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const readings = [...xml.querySelectorAll("DadosHidrometereologicos, DadosHidrometeorologicos")]
    .map((node) => ({
      level: asNumber(text(node, "Nivel")),
      flow: asNumber(text(node, "Vazao")),
      dateTime: text(node, "DataHora")
    }));

  const analysis = analyzeRiverSeries(readings);
  const latest = analysis.latest;
  if (!latest) return null;
  return {
    ...latest,
    readings: analysis.readings,
    unit: "cm",
    trend: analysis.quality === 'current' ? computeRiverTrend(latest.level, analysis.readings.at(-2)?.level) : computeRiverTrend(null, null)
  };
}

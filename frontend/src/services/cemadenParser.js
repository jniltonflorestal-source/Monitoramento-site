import { nonNegativeValue, finiteValue } from './dataQuality.js';

function normalizeStation(station) {
  const amount = nonNegativeValue(station.acumulado);
  return {
    city: String(station.cidade || "Estação sem município"),
    name: String(station.nomeestacao || "Pluviômetro CEMADEN"),
    code: String(station.codestacao || ""),
    amount,
    latitude: finiteValue(station.latitude),
    longitude: finiteValue(station.longitude)
  };
}

export function parseCemadenStations(payload) {
  const record = Array.isArray(payload) ? payload[0] : null;
  const stations = (record?.estacao || [])
    .filter((station) =>
      station.uf === "TO"
      && station.status === 0
      && station.idtipoestacao === 1
      && finiteValue(station.latitude) !== null
      && finiteValue(station.longitude) !== null
    )
    .map(normalizeStation)
    .sort((first, second) => second.amount - first.amount || first.city.localeCompare(second.city));

  return {
    updatedAt: record?.atualizado || "",
    stations,
    maximum: stations[0]?.amount ?? null
  };
}

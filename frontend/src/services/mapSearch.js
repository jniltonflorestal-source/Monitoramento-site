const searchPlaceholders = {
  rain: "Buscar município ou estação de chuva",
  rivers: "Buscar rio, município ou estação",
  fire: "Buscar município com focos",
  emergency: "Buscar município",
  drought: "Buscar município no mapa de seca"
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function includesTerm(value, term) {
  return normalizeText(value).includes(term);
}

export function getMapSearchPlaceholder(layer) {
  return searchPlaceholders[layer] || "Buscar no mapa";
}

export function buildMapSearchResults(layer, datasets = {}, query = "") {
  const term = normalizeText(query).trim();
  if (!term) return [];

  if (layer === "rain") {
    return (datasets.rainStations || [])
      .filter((station) => includesTerm(station.city, term) || includesTerm(station.name, term))
      .slice(0, 8)
      .map((station) => ({
        id: `rain-${station.code}`,
        layer,
        label: station.city,
        description: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        zoom: 10,
        item: station
      }));
  }

  if (layer === "rivers") {
    return (datasets.riverStations || [])
      .filter((station) => (
        includesTerm(station.city, term)
        || includesTerm(station.name, term)
        || includesTerm(station.river, term)
      ))
      .slice(0, 8)
      .map((station) => ({
        id: `rivers-${station.code}`,
        layer,
        label: station.name,
        description: `${station.river} | ${station.city}`,
        latitude: station.latitude,
        longitude: station.longitude,
        zoom: 10,
        item: station
      }));
  }

  if (layer === "fire") {
    const matchingPoints = (datasets.firePoints || []).filter((point) => includesTerm(point.city, term));
    const cityGroups = new Map();
    matchingPoints.forEach((point) => {
      const key = normalizeText(point.city);
      const group = cityGroups.get(key) || { city: point.city, points: [] };
      group.points.push(point);
      cityGroups.set(key, group);
    });

    return Array.from(cityGroups.values()).slice(0, 8).map((group) => ({
      id: `fire-${normalizeText(group.city).replace(/\s+/g, "-")}`,
      layer,
      label: group.city,
      description: `${group.points.length} foco${group.points.length === 1 ? "" : "s"} localizado${group.points.length === 1 ? "" : "s"}`,
      count: group.points.length,
      latitude: group.points[0].latitude,
      longitude: group.points[0].longitude,
      zoom: 9,
      points: group.points
    }));
  }

  if (layer === "emergency") {
    return (datasets.emergencyPoints || [])
      .filter((point) => includesTerm(point.municipio, term) || includesTerm(point.situacao, term))
      .slice(0, 8)
      .map((point, index) => ({
        id: `emergency-${normalizeText(point.municipio).replace(/\s+/g, "-")}-${index}`,
        layer,
        label: point.municipio,
        description: point.situacao,
        latitude: point.latitude,
        longitude: point.longitude,
        zoom: 9,
        item: point
      }));
  }

  if (layer === "drought") {
    return (datasets.droughtMunicipalities || [])
      .filter((city) => includesTerm(city.nome, term) || includesTerm(city.classe, term))
      .slice(0, 8)
      .map((city) => ({
        id: `drought-${normalizeText(city.nome).replace(/\s+/g, "-")}`,
        layer,
        label: city.nome,
        description: city.classe || "Dados de seca",
        latitude: city.latitude,
        longitude: city.longitude,
        zoom: 8,
        item: city
      }))
      .filter((city) => Number.isFinite(city.latitude) && Number.isFinite(city.longitude));
  }

  return [];
}

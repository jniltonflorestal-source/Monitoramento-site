import { fetchOpenMeteoForecast } from "./openMeteo";

function sumNextHours(hourly, hours) {
  const precipitation = hourly?.precipitation || [];
  const times = hourly?.time || [];
  const now = Date.now();
  const limit = now + hours * 60 * 60 * 1000;
  const timedSum = precipitation.reduce((total, value, index) => {
    const time = new Date(times[index]).getTime();
    if (!Number.isFinite(time) || time < now || time >= limit) return total;
    return total + (Number(value) || 0);
  }, 0);
  if (timedSum > 0 || times.length) return timedSum;
  return precipitation.slice(0, hours).reduce((total, value) => total + (Number(value) || 0), 0);
}

function forecastStatus(amount) {
  if (amount >= 50) return "emergency";
  if (amount >= 30) return "alert";
  if (amount >= 10) return "attention";
  return "normal";
}

export async function getRainForecastPoints(mode) {
  const baseUrl = import.meta.env?.BASE_URL || "/";
  const response = await fetch(`${baseUrl}data/meteorologia-tocantins.json`, { cache: "no-store" });
  if (!response.ok) throw new Error("Lista de pontos de previsão indisponível");
  const places = await response.json();
  const hours = mode === "forecast48" ? 48 : 24;
  const now = new Date().toISOString();

  const points = await Promise.all(places.map(async (place) => {
    const data = await fetchOpenMeteoForecast(place, 3);
    const amount = sumNextHours(data.hourly, hours);
    return {
      id: `${mode}-${place.municipio}`,
      city: place.municipio,
      region: place.regiao,
      latitude: place.latitude,
      longitude: place.longitude,
      amount,
      status: forecastStatus(amount),
      period: mode === "forecast48" ? "Próximas 48h" : "Próximas 24h",
      source: "Open-Meteo",
      updatedAt: data.generationtime_ms ? now : now
    };
  }));

  const sorted = [...points].sort((a, b) => b.amount - a.amount);
  return {
    state: "ready",
    source: "Open-Meteo",
    updatedAt: now,
    period: mode === "forecast48" ? "Próximas 48h" : "Próximas 24h",
    points,
    maximum: sorted[0] || null,
    above10: points.filter((point) => point.amount >= 10).length,
    above30: points.filter((point) => point.amount >= 30).length,
    above50: points.filter((point) => point.amount >= 50).length
  };
}

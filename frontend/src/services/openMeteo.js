const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchOpenMeteoCurrent(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
      "precipitation"
    ].join(","),
    timezone: "America/Sao_Paulo",
    forecast_days: "1"
  });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${FORECAST_URL}?${params}`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Open-Meteo indisponível");
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchOpenMeteoForecast(place, forecastDays = 3) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    hourly: "precipitation",
    timezone: "America/Sao_Paulo",
    forecast_days: String(forecastDays)
  });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${FORECAST_URL}?${params}`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Open-Meteo indisponível");
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

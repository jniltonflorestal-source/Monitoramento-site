import { booleanPointInPolygon, point } from "@turf/turf";

export function utcTime(value) {
  if (!value) return NaN;
  const iso = String(value).trim().replace(" ", "T");
  return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function filterDetections(
  points,
  {
    hours = 24,
    satellite = "",
    city = "",
    boundary = null,
    now = Date.now(),
  } = {},
) {
  const seen = new Set();
  return points.filter((p) => {
    const time = utcTime(p.detectedAt || p.data_hora_gmt);
    const lat = Number(p.latitude),
      lon = Number(p.longitude);
    if (
      !Number.isFinite(time) ||
      time > now ||
      time < now - hours * 3600000 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    )
      return false;
    if (satellite && (p.satellite || p.satelite) !== satellite) return false;
    if (city && (p.city || p.municipio) !== city) return false;
    if (boundary) {
      const features = boundary.features || [boundary];
      if (!features.some((f) => booleanPointInPolygon(point([lon, lat]), f)))
        return false;
    }
    const key = `${lat}|${lon}|${time}|${p.satellite || p.satelite}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const cache = new Map();
export async function cachedJson(url, ttl = 900000) {
  const previous = cache.get(url);
  if (previous && Date.now() - previous.time < ttl) return previous.promise;
  const promise = fetch(url, { signal: AbortSignal.timeout(15000) })
    .then((r) => {
      if (!r.ok) throw new Error(`Fonte indisponível (HTTP ${r.status})`);
      return r.json();
    })
    .catch((error) => {
      cache.delete(url);
      throw error;
    });
  cache.set(url, { time: Date.now(), promise });
  return promise;
}

export async function getWeatherGrid() {
  const positions = [];
  for (let lat = -13; lat <= -5.5; lat += 1.5)
    for (let lon = -50; lon <= -46; lon += 1) positions.push([lat, lon]);
  const hourly =
    "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation,cloud_cover";
  const list = [];
  // Two batches at a time avoid a burst of requests and allow partial coverage.
  for (let start = 0; start < positions.length; start += 10) {
    const results = await Promise.allSettled([0, 5].map(async offset => {
      const batch = positions.slice(start + offset, start + offset + 5);
      const query = new URLSearchParams({latitude:batch.map(p=>p[0]).join(','),longitude:batch.map(p=>p[1]).join(','),hourly,forecast_days:'3',timeformat:'unixtime',timezone:'UTC',models:'gfs_seamless'});
      const response = await cachedJson(`https://api.open-meteo.com/v1/forecast?${query}`,3600000);
      const values = Array.isArray(response) ? response : [response];
      if(values.length!==batch.length || values.some(p=>!p.hourly?.time?.length))throw new Error('Previsão incompleta');
      return values.map((p,i)=>({...p,requested:batch[i]}));
    }));
    for(const result of results)if(result.status==='fulfilled')list.push(...result.value);
  }
  if (!list.length) throw new Error("Previsão indisponível");
  return {
    updatedAt: new Date().toISOString(),
    source: `Open-Meteo / GFS • CC BY 4.0 • ${list.length}/30 pontos${list.length<30?' • cobertura parcial':''}`,
    points: list,
  };
}

export function weatherAt(grid, index) {
  return grid.points.map((p) => ({
    latitude: p.requested[0],
    longitude: p.requested[1],
    time: p.hourly.time[index],
    ...Object.fromEntries(
      Object.entries(p.hourly)
        .filter(([key]) => key !== "time")
        .map(([key, values]) => [key, values[index]]),
    ),
  }));
}

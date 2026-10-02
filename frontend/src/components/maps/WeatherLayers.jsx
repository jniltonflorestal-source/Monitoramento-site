import { useEffect, useMemo, useRef, useState } from "react";
import { useMap, useMapEvents, CircleMarker, Popup } from "react-leaflet";
import { Play, Pause, RefreshCw } from "lucide-react";
import { booleanPointInPolygon, point } from "@turf/turf";
import {
  cachedJson,
  getWeatherGrid,
  weatherAt,
} from "../../services/operationalMap";

export const weatherVariables = {
  wind_speed_10m: ["Vento", "km/h"],
  wind_gusts_10m: ["Rajadas", "km/h"],
  temperature_2m: ["Temperatura", "°C"],
  precipitation: ["Precipitação", "mm/h"],
  cloud_cover: ["Nebulosidade", "%"],
};
export function useWeatherLayers() {
  const [grid, setGrid] = useState(null),
    [state, setState] = useState("idle"),
    [hour, setHour] = useState(0),
    [playing, setPlaying] = useState(false),
    [variables, setVariables] = useState([]),
    [wind, setWind] = useState(false);
  const load = async () => {
    setState("loading");
    try {
      const value = await getWeatherGrid();
      setGrid(value);
      setHour(
        Math.max(
          0,
          value.points[0].hourly.time.findIndex((t) => t * 1000 >= Date.now()),
        ),
      );
      setState("ready");
      setWind(true);
      setVariables(["wind_speed_10m"]);
    } catch {
      setState("error");
    }
  };
  useEffect(() => {
    if (!playing || !grid) return;
    const timer = setInterval(() => {
      if (!document.hidden)
        setHour((h) => (h + 1) % grid.points[0].hourly.time.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [playing, grid]);
  return {
    grid,
    state,
    hour,
    setHour,
    playing,
    setPlaying,
    variables,
    setVariables,
    wind,
    setWind,
    load,
  };
}
export function WeatherControls({ model: m }) {
  return (
    <details className="operational-weather-controls">
      <summary>Meteorologia • previsão e vento animado</summary>
      <div className="operational-controls">
        <button type="button" disabled={m.state === "loading"} onClick={m.load}>
          <RefreshCw size={16} />
          {m.state === "loading"
            ? "Consultando..."
            : "Carregar / atualizar previsão"}
        </button>
        {m.state === "error" && (
          <p>Previsão indisponível no momento. Tente novamente.</p>
        )}
        {m.grid && (
          <>
            <label>
              <input
                type="checkbox"
                checked={m.wind}
                onChange={(e) => m.setWind(e.target.checked)}
              />{" "}
              Partículas de vento
            </label>
            {Object.entries(weatherVariables).map(([key, [label]]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={m.variables.includes(key)}
                  onChange={(e) =>
                    m.setVariables((v) =>
                      e.target.checked
                        ? [...v, key]
                        : v.filter((x) => x !== key),
                    )
                  }
                />
                {label}
              </label>
            ))}
            <div className="weather-timeline">
              <button
                type="button"
                aria-label={
                  m.playing ? "Pausar previsão" : "Reproduzir previsão"
                }
                onClick={() => m.setPlaying((v) => !v)}
              >
                {m.playing ? <Pause /> : <Play />}
              </button>
              <input
                aria-label="Hora da previsão"
                type="range"
                min="0"
                max={m.grid.points[0].hourly.time.length - 1}
                value={m.hour}
                onChange={(e) => m.setHour(Number(e.target.value))}
              />
              <time>
                {new Date(
                  m.grid.points[0].hourly.time[m.hour] * 1000,
                ).toLocaleString("pt-BR")}
              </time>
            </div>
            <small>
              {m.grid.source} • Consulta:{" "}
              {new Date(m.grid.updatedAt).toLocaleString("pt-BR")}. Previsão em
              grade amostrada, não observação. Partículas ilustram a direção do
              vento; a animação não representa deslocamento em escala real.
            </small>
          </>
        )}
      </div>
    </details>
  );
}
function inside(lat, lon, boundary) {
  return (
    boundary &&
    (boundary.features || [boundary]).some((f) =>
      booleanPointInPolygon(point([lon, lat]), f),
    )
  );
}
function color(key, value) {
  if (key === "temperature_2m")
    return value >= 35 ? "#d73027" : value >= 28 ? "#e99024" : "#3984bf";
  if (key === "cloud_cover") return "#7b8794";
  if (key === "precipitation")
    return value > 10 ? "#b91c1c" : value > 2 ? "#2563eb" : "#75b8c5";
  return value >= 50 ? "#d73027" : value >= 25 ? "#e99024" : "#138a83";
}

function WindParticles({ rows, boundary }) {
  const map = useMap();
  useEffect(() => {
    if (
      !rows.length ||
      !boundary ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const canvas = document.createElement("canvas");
    canvas.className = "weather-particles";
    canvas.style.pointerEvents = "none";
    map.getContainer().appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let frame,
      last = 0,
      particles = [];
    const reset = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      particles = Array.from(
        { length: Math.min(160, Math.round(size.x / 6)) },
        () => ({
          x: Math.random() * size.x,
          y: Math.random() * size.y,
          age: Math.random() * 80,
        }),
      );
      ctx.clearRect(0, 0, size.x, size.y);
    };
    const draw = (time) => {
      frame = requestAnimationFrame(draw);
      if (time - last < 40 || document.hidden) return;
      last = time;
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "rgba(0,0,0,.88)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#0d666f";
      ctx.lineWidth = 1.7;
      for (const p of particles) {
        const ll = map.containerPointToLatLng([p.x, p.y]);
        if (p.age++ > 65 || !inside(ll.lat, ll.lng, boundary)) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.age = 0;
          continue;
        }
        const node = rows.reduce((a, b) =>
          (a.latitude - ll.lat) ** 2 + (a.longitude - ll.lng) ** 2 <
          (b.latitude - ll.lat) ** 2 + (b.longitude - ll.lng) ** 2
            ? a
            : b,
        );
        if (
          !Number.isFinite(node.wind_speed_10m) ||
          !Number.isFinite(node.wind_direction_10m)
        )
          continue;
        const angle = (node.wind_direction_10m * Math.PI) / 180;
        const speed = Math.min(4, node.wind_speed_10m / 12);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        p.x -= Math.sin(angle) * speed;
        p.y += Math.cos(angle) * speed;
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    };
    reset();
    map.on("moveend resize zoomend", reset);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      map.off("moveend resize zoomend", reset);
      canvas.remove();
    };
  }, [map, rows, boundary]);
  return null;
}
export function WeatherLayers({ model: m, boundary, municipalMode = false }) {
  const [clicked, setClicked] = useState(null);
  const request = useRef(0);
  const rows = useMemo(
    () => (m.grid ? weatherAt(m.grid, m.hour) : []),
    [m.grid, m.hour],
  );
  useMapEvents({
    click: async (e) => {
      if (municipalMode || !m.grid || !inside(e.latlng.lat, e.latlng.lng, boundary)) return;
      const id = ++request.current;
      setClicked({ position: e.latlng, state: "loading" });
      try {
        const params = new URLSearchParams({
          latitude: e.latlng.lat.toFixed(3),
          longitude: e.latlng.lng.toFixed(3),
          hourly: [...Object.keys(weatherVariables), "wind_direction_10m"].join(
            ",",
          ),
          forecast_days: "3",
          models: "gfs_seamless",
          timeformat: "unixtime",
          timezone: "UTC",
        });
        const data = await cachedJson(
          `https://api.open-meteo.com/v1/forecast?${params}`,
          3600000,
        );
        if (id === request.current)
          setClicked({ position: e.latlng, state: "ready", data });
      } catch {
        if (id === request.current)
          setClicked({ position: e.latlng, state: "error" });
      }
    },
  });
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  return (
    <>
      {m.wind && <WindParticles rows={rows} boundary={boundary} />}{" "}
      {m.variables.map((key, layer) =>
        rows
          .filter(
            (r) =>
              inside(r.latitude, r.longitude, boundary) &&
              Number.isFinite(r[key]),
          )
          .map((r, index) => (
            <CircleMarker
              key={`${key}-${index}`}
              center={[r.latitude, r.longitude]}
              radius={12 + layer * 5}
              pathOptions={{
                color: color(key, r[key]),
                fillColor: color(key, r[key]),
                fillOpacity: 0.2,
                weight: 2,
              }}
            >
              <Popup>
                <strong>
                  {weatherVariables[key][0]}: {r[key]}{" "}
                  {weatherVariables[key][1]}
                </strong>
                <br />
                Direção: {r.wind_direction_10m}° (origem do vento)
                <br />
                {new Date(r.time * 1000).toLocaleString("pt-BR")}
                <br />
                Open-Meteo • previsão de modelo
              </Popup>
            </CircleMarker>
          )),
      )}
      {m.grid && m.variables.length > 0 && (
        <div className="weather-map-legend">
          {m.variables.map((key) => (
            <span key={key}>
              {weatherVariables[key][0]}:{" "}
              {key === "temperature_2m"
                ? "azul <28; laranja 28–35; vermelho ≥35 °C"
                : key === "cloud_cover"
                  ? "cinza: cobertura em %"
                  : key === "precipitation"
                    ? "azul claro ≤2; azul 2–10; vermelho >10 mm/h"
                    : "verde <25; laranja 25–50; vermelho ≥50 km/h"}
            </span>
          ))}
        </div>
      )}
      {clicked && (
        <Popup position={clicked.position}>
          <strong>Previsão no ponto selecionado</strong>
          <br />
          {clicked.state === "loading" ? (
            "Consultando previsão..."
          ) : clicked.state === "error" ? (
            "Previsão indisponível"
          ) : (
            <>
              {Object.entries(weatherVariables).map(([key, [label, unit]]) => (
                <div key={key}>
                  {label}:{" "}
                  {clicked.data.hourly?.[key]?.[m.hour] ?? "Indisponível"}{" "}
                  {unit}
                </div>
              ))}
              <div>
                Direção:{" "}
                {clicked.data.hourly?.wind_direction_10m?.[m.hour] ??
                  "Indisponível"}
                °
              </div>
              <small>
                Open-Meteo •{" "}
                {new Date(
                  clicked.data.hourly.time[m.hour] * 1000,
                ).toLocaleString("pt-BR")}
              </small>
            </>
          )}
        </Popup>
      )}
    </>
  );
}

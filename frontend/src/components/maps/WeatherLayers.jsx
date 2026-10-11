import { useEffect, useMemo, useRef, useState } from "react";
import { useMap, useMapEvents, CircleMarker, Popup } from "react-leaflet";
import { RefreshCw } from "lucide-react";
import { booleanPointInPolygon, point } from "@turf/turf";
import {
  cachedJson,
  getWeatherGrid,
} from "../../services/operationalMap";
import {buildWeatherTimeline,weatherRowsAtTime} from '../../services/weatherTimeline.js';
import {TimelineControl} from './TimelineControl';

export const weatherVariables = {
  wind_speed_10m: ["Vento", "km/h"],
  wind_gusts_10m: ["Rajadas", "km/h"],
  temperature_2m: ["Temperatura", "°C"],
  precipitation: ["Precipitação", "mm/h"],
  cloud_cover: ["Nebulosidade", "%"],
};
export function useWeatherLayers(boundary) {
  const [grid, setGrid] = useState(null),
    [state, setState] = useState("idle"),
    [hour, setHour] = useState(0),
    [playing, setPlaying] = useState(false),
    [variables, setVariables] = useState([]),
    [wind, setWind] = useState(false);
  const load = async () => {
    setState("loading");
    setPlaying(false);
    try {
      const value = await getWeatherGrid({forceRefresh:Boolean(grid)});
      setGrid(value);
      setHour(0);
      setState("ready");
      setWind(true);
      setVariables(["wind_speed_10m"]);
    } catch {
      setState("error");
      setGrid(null);setWind(false);setVariables([]);
    }
  };
  const primary=variables[0]||'wind_speed_10m';
  const frames=useMemo(()=>grid&&boundary?buildWeatherTimeline(grid,primary,Date.now(),boundary):[],[grid,primary,boundary]);
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
    frames,primary,
  };
}
export function WeatherControls({ model: m }) {
  return (
    <details className="operational-weather-controls" onToggle={event=>{if(!event.currentTarget.open)m.setPlaying(false);}}>
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
            <TimelineControl frames={m.frames} title={`Previsão horária · ${weatherVariables[m.primary][0]}`} source={m.grid.source} updatedAt={new Date(m.grid.updatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} updatedAtLabel="Consulta" unit={weatherVariables[m.primary][1]} initialIndex={0} playing={m.playing} onPlayingChange={m.setPlaying} onFrame={frame=>m.setHour(frame?.index||0)} note={`${m.frames[m.hour]?`Maior valor entre ${m.frames[m.hour].coverage} de ${m.frames[m.hour].total} pontos da grade no Tocantins neste horário.`:'Sem horários futuros com dados válidos para esta variável.'} Previsão de modelo, não medição de estação nem média municipal. Pontos sem valor não são convertidos em zero.`}/>
            <small>
              Partículas ilustram a direção do
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
    () => m.frames[m.hour]?.rows||[],
    [m.frames, m.hour],
  );
  const clickedRow=useMemo(()=>clicked?.state==='ready'?weatherRowsAtTime({points:[{...clicked.data,requested:[clicked.position.lat,clicked.position.lng]}]},m.frames[m.hour]?.time/1000)[0]:null,[clicked,m.frames,m.hour]);
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
                  {clickedRow?.[key] ?? "Indisponível"}{" "}
                  {unit}
                </div>
              ))}
              <div>
                Direção:{" "}
                {clickedRow?.wind_direction_10m ??
                  "Indisponível"}
                °
              </div>
              <small>
                Open-Meteo •{" "}
                {clickedRow?new Date(clickedRow.time*1000).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Horário não disponível'}
              </small>
            </>
          )}
        </Popup>
      )}
    </>
  );
}

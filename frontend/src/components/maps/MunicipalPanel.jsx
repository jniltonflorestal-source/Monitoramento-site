import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { CloudRain, Flame, Waves, Wind, X, Layers } from "lucide-react";
import {
  municipalObservations,
  municipalWeather,
  municipalBurnedArea,
  finiteReading,
} from "../../services/municipalMonitoring";
import { filterDetections, cachedJson } from "../../services/operationalMap";
const HydrologyPanel = lazy(() =>
  import("./HydrologyPanel").then((m) => ({ default: m.HydrologyPanel })),
);
const fmt = (v, unit = "") =>
  finiteReading(v) === null
    ? "Dado indisponível"
    : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${unit}`;
const date = (v) =>
  v && Number.isFinite(Date.parse(v))
    ? new Date(v).toLocaleString("pt-BR")
    : "Atualização não informada";
function useMunicipalQuery(feature, loader) {
  const [result, setResult] = useState({ state: "loading" });
  useEffect(() => {
    let alive = true;
    setResult({ state: "loading" });
    loader(feature)
      .then((data) => {
        if (alive) setResult({ state: "ready", data });
      })
      .catch(() => {
        if (alive) setResult({ state: "error" });
      });
    return () => {
      alive = false;
    };
  }, [feature, loader]);
  return result;
}
export function MunicipalPanel({
  feature,
  rain,
  rivers,
  fireHistory,
  firePoints,
  onClose,
  onLayer,
  onBurned,
}) {
  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches)
      document
        .querySelector(".municipal-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [feature]);
  const [hours, setHours] = useState(24),
    [station, setStation] = useState(null),
    [overlayState, setOverlayState] = useState("idle");
  const local = useMemo(
    () => municipalObservations(feature, rain, rivers),
    [feature, rain, rivers],
  );
  const weather = useMunicipalQuery(feature, municipalWeather),
    burned = useMunicipalQuery(feature, municipalBurnedArea);
  useEffect(() => {
    setStation(local.rivers[0] || null);
  }, [local.rivers]);
  const fires = useMemo(
    () =>
      [24, 48, 168].map(
        (h) =>
          filterDetections(firePoints, { hours: h, boundary: feature }).length,
      ),
    [firePoints, feature],
  );
  const hasFire =
    fireHistory?.status === "ready" || fireHistory?.status === "partial";
  const selectedFireCount = fires[[24, 48, 168].indexOf(hours)];
  const staleFire =
    fireHistory?.updatedAt &&
    Date.now() - Date.parse(fireHistory.updatedAt) > 86400000;
  const hourly = weather.data?.hourly,
    index = hourly?.time.findIndex((t) => t * 1000 >= Date.now()) ?? -1;
  const forecast =
    hourly && index >= 0
      ? hourly.precipitation.slice(index, index + Math.min(hours, 48))
      : [];
  const validForecast =
    hours <= 48 &&
    forecast.length === hours &&
    forecast.every((v) => finiteReading(v) !== null);
  const forecastTotal = validForecast
    ? forecast.reduce((a, b) => a + b, 0)
    : null;
  const uncertainRain = local.validRain.some((s) => {
    const t = Date.parse(s.updatedAt || s.atualizadoEm);
    return !Number.isFinite(t) || Date.now() - t > 86400000;
  });
  async function viewBurned() {
    setOverlayState("loading");
    try {
      const raster = await cachedJson(burned.data.rasterEndpoint, 300000);
      if (!raster.url) throw new Error();
      onBurned({ ...burned.data, rasterUrl: raster.url });
      setOverlayState("ready");
    } catch {
      setOverlayState("error");
    }
  }
  return (
    <aside className="municipal-panel" aria-label="Monitoramento municipal">
      <header>
        <div>
          <span className="eyebrow">Panorama municipal</span>
          <h3>{feature.properties.nome}</h3>
          <small>IBGE {feature.properties.codarea}</small>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel municipal"
          title="Fechar painel municipal"
        >
          <X />
        </button>
      </header>
      <label className="municipal-period">
        Período de análise
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          <option value={24}>24 horas</option>
          <option value={48}>48 horas</option>
          <option value={168}>7 dias</option>
        </select>
      </label>
      <section>
        <h4>
          <CloudRain />
          Chuva observada
        </h4>
        <strong className="municipal-value">
          {hours === 24
            ? fmt(local.maxRain24, " mm")
            : "Histórico indisponível"}
        </strong>
        <p>
          {hours === 24
            ? "Maior acumulado entre as estações com leitura válida no município."
            : "A base atual não permite calcular este acumulado observado."}
        </p>
        <small>
          {local.validRain.length} com leitura • {local.rain.length} cadastradas
          no território
        </small>
        {local.validRain
          .slice()
          .sort((a, b) => (b.amount ?? b.chuva24h) - (a.amount ?? a.chuva24h))
          .slice(0, 3)
          .map((s, i) => (
            <p className="municipal-row" key={s.id || i}>
              <span>
                {s.name || s.nome}
                <small>
                  {s.fonte || s.source} • {date(s.updatedAt || s.atualizadoEm)}
                </small>
              </span>
              <b>{fmt(s.amount ?? s.chuva24h, " mm")}</b>
            </p>
          ))}
        {uncertainRain && (
          <p role="status">
            Há leituras sem data confirmada ou desatualizadas. Confirme a
            atualidade na fonte antes de usar estes valores.
          </p>
        )}
        <button onClick={() => onLayer("rain")}>Ver chuva no mapa</button>
      </section>
      <section>
        <h4>
          <Waves />
          Rios monitorados
        </h4>
        {local.rivers.length ? (
          <Suspense fallback={<p>Carregando gráfico...</p>}>
            <HydrologyPanel
              stations={local.rivers}
              station={station}
              onSelect={setStation}
            />
          </Suspense>
        ) : (
          <p>
            Estações indisponíveis para este município na base carregada. Isso
            não indica ausência de risco.
          </p>
        )}
        <button onClick={() => onLayer("rivers")}>Ver estações no mapa</button>
      </section>
      <section>
        <h4>
          <Flame />
          Focos de calor
        </h4>
        <strong className="municipal-value">
          {hasFire
            ? fmt(
                selectedFireCount,
                selectedFireCount === 1 ? " detecção" : " detecções",
              )
            : "Histórico indisponível"}
        </strong>
        {hasFire && (
          <div
            className="municipal-bars"
            aria-label="Detecções nas janelas de 24h, 48h e 7 dias"
          >
            {fires.map((n, i) => (
              <div key={i}>
                <span>{["24h", "48h", "7 dias"][i]}</span>
                <meter min="0" max={Math.max(1, ...fires)} value={n} />
                <b>{n}</b>
              </div>
            ))}
          </div>
        )}
        <p>
          {staleFire ? "Base desatualizada. " : ""}
          {fireHistory?.status === "partial" ? "Cobertura parcial. " : ""}
          Contagem dos registros disponíveis, não de incêndios distintos.
        </p>
        <small>INPE • consulta: {date(fireHistory?.updatedAt)}</small>
        <button onClick={() => onLayer("fire", hours)}>
          Localizar focos no mapa
        </button>
      </section>
      <section>
        <h4>
          <Layers />
          Área queimada
        </h4>
        <strong className="municipal-value">
          {burned.state === "ready"
            ? fmt(burned.data.hectares, " ha")
            : burned.state === "loading"
              ? "Consultando MapBiomas..."
              : "Consulta indisponível"}
        </strong>
        <p>
          {burned.data?.period
            ? "Área mensal • " + burned.data.period
            : "Referência mensal, independente da janela de análise."}
        </p>
        <small>
          MapBiomas Monitor do Fogo • consulta: {date(burned.data?.updatedAt)}
        </small>
        <p>
          Raster territorial; polígonos de cicatrizes individuais não
          integrados.
        </p>
        <button
          disabled={burned.state !== "ready" || overlayState === "loading"}
          onClick={viewBurned}
        >
          {overlayState === "loading"
            ? "Carregando raster..."
            : "Ver área queimada no mapa"}
        </button>
        {overlayState === "error" && (
          <p role="status">Não foi possível carregar o raster no momento.</p>
        )}
      </section>
      <section>
        <h4>
          <Wind />
          Meteorologia e previsão
        </h4>
        {weather.state === "ready" && index >= 0 ? (
          <>
            <dl className="municipal-weather">
              <div>
                <dt>Temperatura</dt>
                <dd>{fmt(hourly.temperature_2m[index], " °C")}</dd>
              </div>
              <div>
                <dt>Vento</dt>
                <dd>{fmt(hourly.wind_speed_10m[index], " km/h")}</dd>
              </div>
              <div>
                <dt>Direção de origem</dt>
                <dd>{fmt(hourly.wind_direction_10m[index], "°")}</dd>
              </div>
              <div>
                <dt>Rajadas</dt>
                <dd>{fmt(hourly.wind_gusts_10m[index], " km/h")}</dd>
              </div>
              <div>
                <dt>Chuva prevista {hours === 168 ? "7 dias" : hours + "h"}</dt>
                <dd>{fmt(forecastTotal, " mm")}</dd>
              </div>
            </dl>
            <p>
              Previsão de modelo para um ponto representativo, não medição nem
              média municipal.
            </p>
            <small>
              Open-Meteo / GFS • válido a partir de{" "}
              {new Date(hourly.time[index] * 1000).toLocaleString("pt-BR")} •
              consulta: {date(weather.data.queriedAt)}
            </small>
          </>
        ) : (
          <p role="status">
            {weather.state === "loading"
              ? "Consultando previsão..."
              : "Não foi possível consultar a previsão no momento."}
          </p>
        )}
        <button onClick={() => onLayer("rain")}>
          Ver ferramentas de clima
        </button>
      </section>
    </aside>
  );
}

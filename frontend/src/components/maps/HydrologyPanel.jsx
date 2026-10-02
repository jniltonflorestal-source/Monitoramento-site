import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { getAnaStationReading } from "../../services/ana";

export function HydrologyPanel({ stations, station, onSelect }) {
  const [days, setDays] = useState(1),
    [result, setResult] = useState(null),
    [state, setState] = useState("idle");
  useEffect(() => {
    if (!station) return;
    let alive = true;
    setState("loading");
    setResult(null);
    getAnaStationReading(station.code, days)
      .then((r) => {
        if (alive) {
          setResult(r);
          setState(r ? "ready" : "empty");
        }
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [station?.code, days]);
  const rows = (result?.readings || []).map((r) => ({
    ...r,
    time: Date.parse(r.dateTime),
  }));
  const latest = rows.at(-1);
  const target = latest?.time - 86400000;
  const baseline = rows
    .filter((r) => Math.abs(r.time - target) <= 3600000)
    .sort((a, b) => Math.abs(a.time - target) - Math.abs(b.time - target))[0];
  const delta = latest && baseline ? latest.level - baseline.level : null;
  const stale = latest && Date.now() - latest.time > 86400000;
  const fmt = (t) =>
    new Date(t).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <section className="hydrology-panel">
      <h4>Situação hidrológica</h4>
      <p>{stations.length} estações cadastradas. Selecione uma estação para consultar leituras e evolução; cadastro não confirma leitura operacional.</p>
      <label>
        Estação ANA
        <select
          value={station?.code || ""}
          onChange={(e) =>
            onSelect(stations.find((s) => String(s.code) === e.target.value))
          }
        >
          <option value="">Selecione no mapa ou na lista</option>
          {stations.map((s) => (
            <option key={s.code} value={s.code}>
              {s.river} • {s.name} • {s.city}
            </option>
          ))}
        </select>
      </label>
      {station && (
        <>
          <strong>{station.name}</strong>
          <p>
            {station.river} • {station.city}
          </p>
          <div
            className="operational-segments"
            aria-label="Período hidrológico"
          >
            {[1, 7, 30].map((d) => (
              <button
                type="button"
                key={d}
                aria-pressed={days === d}
                onClick={() => setDays(d)}
              >
                {d === 1 ? "24 horas" : `${d} dias`}
              </button>
            ))}
          </div>
          {state === "loading" && (
            <p role="status">Consultando série da ANA...</p>
          )}
          {state === "error" && (
            <p role="status">
              Não foi possível consultar a ANA. Tente novamente mais tarde.
            </p>
          )}
          {state === "empty" && <p>Sem leituras válidas nesse período.</p>}
          {latest && (
            <>
              <div className="hydro-reading">
                <b>{latest.level.toLocaleString("pt-BR")} cm</b>
                <span
                  style={{
                    color:
                      delta === null
                        ? "#64748b"
                        : delta > 0
                          ? "#b91c1c"
                          : delta < 0
                            ? "#15803d"
                            : "#475569",
                  }}
                >
                  {delta === null
                    ? "Variação 24h indisponível"
                    : `${delta > 0 ? "↑ +" : delta < 0 ? "↓ " : "→ "}${delta.toLocaleString("pt-BR")} cm em aproximadamente 24h`}
                </span>
              </div>
              <p>
                {stale ? "Leitura desatualizada • " : ""}
                {fmt(latest.time)}
              </p>
              <div
                className="hydro-chart"
                aria-label="Evolução da cota em centímetros"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows}>
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={fmt}
                      minTickGap={50}
                    />
                    <YAxis domain={["auto", "auto"]} width={45} />
                    <Tooltip
                      labelFormatter={fmt}
                      formatter={(v) => [`${v} cm`, "Cota"]}
                    />
                    <Line
                      type="linear"
                      dataKey="level"
                      stroke="#0f766e"
                      dot={false}
                      isAnimationActive={false}
                    />
                    {(station.thresholds || [])
                      .filter(
                        (t) =>
                          t.official === true &&
                          t.unit === "cm" &&
                          Number.isFinite(t.value),
                      )
                      .map((t) => (
                        <ReferenceLine
                          key={t.label}
                          y={t.value}
                          label={t.label}
                          stroke="#b91c1c"
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
      <small>
        ANA / Telemetria. Vermelho: subida; verde: descida; cinza: estabilidade
        ou ausência de comparação. Subida não significa inundação. Limites de
        risco somente quando oficiais e disponíveis.
      </small>
    </section>
  );
}

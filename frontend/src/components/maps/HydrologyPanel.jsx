import { useEffect, useMemo, useState } from "react";
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
import { analyzeRiverSeries, riverDeltaLabel } from '../../services/hydrologyMetrics.js';
import { getAnaReportedReading } from '../../services/anaReportedReading.js';
import '../../hydrology-detail.css';

export function HydrologyPanel({ stations, station, onSelect }) {
  const [days, setDays] = useState(1),
    [result, setResult] = useState(null),
    [state, setState] = useState("idle");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [limit,setLimit]=useState(6);
  const [listOpen,setListOpen]=useState(false);
  const summaries=useMemo(()=>stations.map(item=>({...item,analysis:analyzeRiverSeries(item.collected?.readings || [])})),[stations,refreshVersion]);
  useEffect(() => {
    if (!station) return;
    const interval = setInterval(() => { if (!document.hidden) setRefreshVersion(value => value + 1); }, 300000);
    return () => clearInterval(interval);
  }, [station?.code]);
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
  }, [station?.code, days, refreshVersion]);
  const analysis=analyzeRiverSeries(result?.readings || []);
  const rows=analysis.readings,latest=analysis.latest,stale=analysis.quality==='stale';
  const reported = !latest && (result?.reportedReading || getAnaReportedReading(station?.collected?.readings));
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
      <details className="hydro-station-list" onToggle={event=>setListOpen(event.currentTarget.open)}>
        <summary>Leituras e minigráficos das estações</summary>
        <p>Resumo da última coleta disponível. Sem série válida, a estação permanece sem comparação.</p>
        {listOpen&&summaries.slice(0,limit).map(item=><button type="button" key={item.code} className="hydro-station-row" aria-pressed={station?.code===item.code} onClick={()=>onSelect(item)}>
          <span><strong>{item.name}</strong><small>{item.river} · {item.city}</small><b>{item.analysis.latest?`${item.analysis.latest.level.toLocaleString('pt-BR')} cm`:'Leitura indisponível'}</b><small>{item.collected?.status==='ok'&&item.analysis.quality==='current'?riverDeltaLabel(item.analysis.delta24):item.analysis.quality==='stale'?'Leitura desatualizada':'Atualidade não confirmada'}</small><small>{item.analysis.latest?fmt(item.analysis.latest.time):'Horário não confirmado'}</small></span>
          {item.analysis.readings.length>1&&<span className="hydro-spark" role="img" aria-label={`Histórico coletado da estação ${item.name}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={item.analysis.readings}><XAxis hide dataKey="time" type="number" domain={['dataMin','dataMax']}/><YAxis hide domain={['dataMin','dataMax']}/><Line type="linear" dataKey="level" stroke="#146e83" dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></span>}
        </button>)}
        {stations.length>limit&&<button type="button" className="hydro-more" onClick={()=>setLimit(value=>value+10)}>Mostrar mais estações</button>}
      </details>
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
          {reported && <div className="hydro-reading"><b>{reported.level.toLocaleString('pt-BR')} cm</b><span>Nível informado pela ANA</span><small>Horário original: {reported.dateTime}. Fuso e atualidade não confirmados; não utilizado no resumo de tendências.</small></div>}
          {state === 'ready' && !latest && <p role="status">Sem horário validado para comparação. Consulte o nível informado acima e confirme na fonte oficial antes de uso operacional.</p>}
          {latest && (
            <>
              <div className="hydro-reading">
                <b>{latest.level.toLocaleString("pt-BR")} cm</b>
                <span className={`hydro-trend hydro-${analysis.direction}`}>{stale?'Série histórica; tendência atual não confirmada':riverDeltaLabel(analysis.delta24)}</span>
              </div>
              <dl className="hydro-differences">{[['Leitura anterior',analysis.previous],['Aproximadamente 6h',analysis.delta6],['Aproximadamente 24h',analysis.delta24]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{riverDeltaLabel(value)}</dd></div>)}</dl>
              <details className="hydro-method"><summary>Ver detalhes técnicos</summary><p>Valores em centímetros no referencial da estação. Comparações de 6h e 24h usam a leitura mais próxima, com tolerância de até 1h; o intervalo real está indicado. Horários futuros, ambíguos e duplicados conflitantes são descartados. Uma subida não é classificação de risco.</p><p>Descartes: {analysis.ambiguous} horários sem confirmação; {analysis.conflicts} instantes conflitantes.</p></details>
              <p>
                {stale ? "Leitura desatualizada • " : ""}
                {fmt(latest.time)}
              </p>
              {result.quality?.status !== 'current' && <p role="status">{result.quality?.message}. Horário original da fonte: {result.dateTime}.</p>}
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

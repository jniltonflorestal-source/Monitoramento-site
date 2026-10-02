import { useEffect, useState } from "react";
import { cachedJson } from "../../services/operationalMap";
const API = "https://plataforma.monitorfogo.mapbiomas.org/api";
export function BurnedAreaControls({ boundary, onLoad }) {
  const [years, setYears] = useState([]),
    [months, setMonths] = useState([]),
    [year, setYear] = useState(""),
    [month, setMonth] = useState(""),
    [city, setCity] = useState(""),
    [state, setState] = useState("idle");
  useEffect(() => {
    let alive = true;
    cachedJson(`${API}/statistics/years`)
      .then((y) => {
        if (alive) {
          setYears(y);
          setYear(String(Math.max(...y)));
        }
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!year) return;
    let alive = true;
    setMonths([]);
    setMonth("");
    cachedJson(`${API}/statistics/${year}/months`)
      .then((m) => {
        if (alive) {
          setMonths(m);
          setMonth(String(Math.max(...m)));
        }
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [year]);
  async function load() {
    setState("loading");
    try {
      const type = city ? "city" : "state",
        code = city || "17";
      const query = `year=${year}&monthStart=${month}&monthEnd=${month}`;
      const [area, raster] = await Promise.all([
        cachedJson(`${API}/statistics/area/${type}/${code}/city?${query}`),
        cachedJson(
          `${API}/maps/fire/monthly?territoryType=${type}&territoryCode=${code}&${query}`,
          300000,
        ),
      ]);
      if (!Number.isFinite(area.areaHa) || !raster.url) throw new Error();
      onLoad({
        hectares: area.areaHa,
        period: `${month.padStart(2, "0")}/${year}`,
        source: "MapBiomas Monitor do Fogo",
        rasterUrl: raster.url,
        updatedAt: new Date().toISOString(),
        territory: city
          ? boundary?.features.find(
              (f) => String(f.properties.codarea) === city,
            )?.properties.nome || `Município ${city}`
          : "Tocantins",
      });
      setState("ready");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="operational-controls">
      <strong>Área queimada por período</strong>
      <label>
        Ano
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>
      <label>
        Mês
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(2020, m - 1, 1).toLocaleString("pt-BR", {
                month: "long",
              })}
            </option>
          ))}
        </select>
      </label>
      <label>
        Território
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Tocantins</option>
          {(boundary?.features || []).map((f) => (
            <option key={f.properties.codarea} value={f.properties.codarea}>
              {f.properties.nome || f.properties.name || f.properties.codarea}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={load}
        disabled={!month || state === "loading"}
      >
        {state === "loading" ? "Consultando..." : "Aplicar período"}
      </button>
      {state === "error" && (
        <p role="status">
          Não foi possível consultar este recorte no MapBiomas.
        </p>
      )}
    </div>
  );
}

export function FireControls({
  filters,
  onChange,
  points,
  count,
  updatedAt,
  historyState,
  enabled,
  onToggle,
  opacity,
  onOpacity,
  burnedArea,
}) {
  const options = (key) =>
    [...new Set(points.map((p) => p[key]).filter(Boolean))].sort();
  return (
    <div className="operational-controls fire-controls">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />{" "}
        Exibir focos do INPE
      </label>
      <label>
        Período
        <select
          value={filters.hours}
          onChange={(e) =>
            onChange({ ...filters, hours: Number(e.target.value) })
          }
        >
          {[24, 48, 168].map((h) => (
            <option key={h} value={h}>
              {h === 168 ? "7 dias" : `${h} horas`}
            </option>
          ))}
        </select>
      </label>
      <label>
        Satélite
        <select
          value={filters.satellite}
          onChange={(e) => onChange({ ...filters, satellite: e.target.value })}
        >
          <option value="">Todos</option>
          {options("satellite").map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Município
        <select
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
        >
          <option value="">Todo o Tocantins</option>
          {options("city").map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Opacidade das queimadas: {Math.round(opacity * 100)}%
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => onOpacity(Number(e.target.value))}
        />
      </label>
      <p>
        <strong>{count.toLocaleString('pt-BR')} detecções na base disponível</strong> • INPE •{" "}
        {updatedAt && Number.isFinite(Date.parse(updatedAt)) ? new Date(updatedAt).toLocaleString('pt-BR') : updatedAt || "Atualização não informada"}
        <br />
        {historyState === "ready"
          ? "Arquivo histórico consultado; confira a cobertura temporal."
          : "Histórico completo indisponível; contagem limitada aos registros carregados."}
        <br />
        Área queimada: {burnedArea?.period || "Período não disponível"}. Focos
        não representam hectares queimados.
      </p>
    </div>
  );
}

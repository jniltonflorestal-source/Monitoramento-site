const legends = {
  rain: {
    title: "Chuva observada",
    note: "Acumulado 24h",
    items: [
      ["zero", "0 mm"],
      ["rain-light", "1 a 10 mm"],
      ["rain-medium", "10 a 30 mm"],
      ["rain-heavy", "30 a 50 mm"],
      ["danger", "Acima de 50 mm"]
    ]
  },
  rivers: {
    title: "Rios",
    note: "Escala visual de referência",
    items: [
      ["normal", "Normal"],
      ["attention", "Atenção"],
      ["alert", "Alerta"],
      ["danger", "Emergência"]
    ]
  },
  drought: {
    title: "Seca municipal",
    note: "Índice Integrado de Seca",
    items: [
      ["normal", "Sem seca"],
      ["attention", "Fraca"],
      ["alert", "Moderada"],
      ["danger", "Severa"],
      ["drought-extreme", "Extrema"]
    ]
  }
};

export function FloatingMapLegend({ activeLayer, rainMode }) {
  if (activeLayer === "rain" && rainMode !== "observed") return null;

  const legend = legends[activeLayer];
  if (!legend) return null;

  return (
    <div className="floating-map-legend" aria-label={`Legenda rápida: ${legend.title}`}>
      <strong>{legend.title}</strong>
      <small>{legend.note}</small>
      <div>
        {legend.items.map(([tone, label]) => (
          <span key={label}><i className={`legend-swatch ${tone}`} />{label}</span>
        ))}
      </div>
    </div>
  );
}

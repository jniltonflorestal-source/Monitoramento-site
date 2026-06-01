const legends = {
  rain: [
    ["zero", "0 mm"],
    ["rain-light", "1 a 10 mm"],
    ["rain-medium", "10 a 30 mm"],
    ["rain-heavy", "30 a 50 mm"],
    ["danger", "Acima de 50 mm"]
  ],
  rivers: [
    ["normal", "Normal"],
    ["attention", "Atenção"],
    ["alert", "Alerta"],
    ["danger", "Emergência"]
  ],
  fire: [
    ["fire", "Foco de calor - INPE"]
  ],
  emergency: [
    ["alert", "Situação de Emergência"],
    ["danger", "Estado de Calamidade Pública"]
  ],
  drought: [
    ["normal", "Sem seca"],
    ["attention", "Seca fraca"],
    ["alert", "Seca moderada"],
    ["danger", "Seca grave"],
    ["drought-extreme", "Seca extrema"]
  ]
};

export function DynamicMapLegend({ activeLayer, mapBiomasEnabled }) {
  const items = [...(legends[activeLayer] || [])];
  if (activeLayer === "fire" && mapBiomasEnabled) {
    items.push(["burned-area", "Área queimada - MapBiomas"]);
  }

  return (
    <div className="dynamic-map-legend" aria-label="Legenda da camada ativa">
      <h4>Legenda</h4>
      {activeLayer === "rivers" && <small>Escala visual de referência</small>}
      <div>
        {items.map(([tone, label]) => (
          <span key={label}><i className={`legend-swatch ${tone}`} />{label}</span>
        ))}
      </div>
    </div>
  );
}

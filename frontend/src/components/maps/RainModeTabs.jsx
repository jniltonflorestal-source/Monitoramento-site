const rainModes = [
  { id: "observed", label: "Observado 24h" },
  { id: "forecast24", label: "Previsão 24h" },
  { id: "forecast48", label: "Previsão 48h" },
  { id: "satellite", label: "Satélite" }
];

export function RainModeTabs({ activeMode, onChange }) {
  return (
    <div className="rain-mode-tabs" aria-label="Modos da camada de chuva">
      {rainModes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={activeMode === mode.id ? "active" : ""}
          aria-pressed={activeMode === mode.id}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

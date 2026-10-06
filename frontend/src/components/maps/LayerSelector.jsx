import {
  CloudRain,
  Flame,
  LocateFixed,
  RotateCcw,
  Waves,
  Building2,
  Maximize2,
  MapPinned,
  Sun,
  BellRing,
} from "lucide-react";

const layerIcons = {
  overview: MapPinned,
  drought: Sun,
  rain: CloudRain,
  burned: Flame,
  rivers: Waves,
  fire: Flame,
  emergency: Building2,
  alerts: BellRing,
};

export function LayerSelector({
  layers,
  anchors,
  activeLayer,
  onSelect,
  onCenter,
  onClear,
  canClear,
}) {
  return (
    <div className="geo-toolbar">
      <div
        className="layer-switch geo-layer-switch"
        aria-label="Camadas do mapa"
      >
        {layers.map((layer) => {
          const Icon = layerIcons[layer.id];
          return (
            <button
              data-layer={layer.id}
              title={layer.title||layer.label}
              id={anchors[layer.id]}
              className={activeLayer === layer.id ? "active" : ""}
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              type="button"
              aria-pressed={activeLayer === layer.id}
            >
              {Icon && <Icon aria-hidden="true" />}
              {layer.label}
            </button>
          );
        })}
      </div>
      <div className="map-actions">
        <button
          type="button"
          title="Ampliar mapa"
          onClick={(e) => {
            if (document.fullscreenElement) document.exitFullscreen();
            else
              e.currentTarget
                .closest("section")
                ?.requestFullscreen?.()
                .catch(() => {});
          }}
        >
          <Maximize2 aria-hidden="true" />
          Ampliar mapa
        </button>
        <button type="button" onClick={onCenter}>
          <LocateFixed aria-hidden="true" />
          Centralizar Tocantins
        </button>
        <button type="button" onClick={onClear} disabled={!canClear}>
          <RotateCcw aria-hidden="true" />
          Limpar busca
        </button>
      </div>
    </div>
  );
}

import { MapPinned } from "lucide-react";
import { DynamicMapLegend } from "./DynamicMapLegend";
import { MapSearchBox } from "./MapSearchBox";

export function MapInfoPanel({
  activeLayer,
  query,
  results,
  onQueryChange,
  onSelect,
  mapBiomasAvailable,
  mapBiomasEnabled,
  onMapBiomasChange,
  summary,
  children,
}) {
  return (
    <aside className="map-readiness geo-info-panel">
      <header>
        <MapPinned aria-hidden="true" />
        <div>
          <p className="eyebrow">Consulta territorial</p>
          <h3>{{rain:'Chuva e clima',rivers:'Rios monitorados',fire:'Focos de calor',burned:'Áreas queimadas',drought:'Seca',emergency:'Situação de Emergência / Calamidade Pública'}[activeLayer]||'Detalhes da camada'}</h3>
        </div>
      </header>
      <details open className="geo-panel-content">
        <summary>Resumo e consultas</summary>
        {summary}
        {activeLayer!=='burned'&&<MapSearchBox
          activeLayer={activeLayer}
          query={query}
          results={results}
          onQueryChange={onQueryChange}
          onSelect={onSelect}
        />}
        {activeLayer === "burned" && (
          <label className="fire-overlay-toggle">
            <input
              type="checkbox"
              checked={mapBiomasEnabled}
              disabled={!mapBiomasAvailable}
              onChange={(event) => onMapBiomasChange(event.target.checked)}
            />
            <span>Área queimada - MapBiomas Fogo</span>
            {!mapBiomasAvailable && <small>Camada em integração</small>}
          </label>
        )}
        <div className="map-layer-information">{children}</div>
        <DynamicMapLegend
          activeLayer={activeLayer}
          mapBiomasEnabled={mapBiomasEnabled}
        />
      </details>
    </aside>
  );
}

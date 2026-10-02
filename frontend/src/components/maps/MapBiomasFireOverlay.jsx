import { useEffect, useState } from "react";
import { GeoJSON, Pane, TileLayer, useMap } from "react-leaflet";
import { cachedJson } from "../../services/operationalMap";

export function MapBiomasFireOverlay({ active, enabled, burnedArea, opacity = 0.58 }) {
  const map = useMap();
  const [failed, setFailed] = useState(false);
  const [vector, setVector] = useState(null);
  useEffect(() => {
    setFailed(false); setVector(null);
    if (!enabled || !burnedArea?.geoJsonUrl) return;
    let alive = true;
    cachedJson(burnedArea.geoJsonUrl).then(data=>{if(alive)setVector(data)}).catch(()=>{if(alive)setFailed(true)});
    return ()=>{alive=false};
  },[enabled,burnedArea?.rasterUrl,burnedArea?.geoJsonUrl]);
  if (!active || !enabled) return null;
  if (failed) return <div className="weather-map-legend" role="status">Camada MapBiomas indisponível. O endereço da imagem pode ter expirado.</div>;
  if (vector) return <GeoJSON data={vector} style={{color:'#8b1d11',weight:2,fillColor:'#ff5a24',fillOpacity:opacity}} onEachFeature={(feature,layer)=>{
    const p=feature.properties||{};
    const content=document.createElement('div');
    content.textContent=`${p.municipio||'Município não informado'} | ${p.periodo||burnedArea.period||'Período não informado'} | ${p.area_ha??'Área não informada'} ha | ${burnedArea.source||'MapBiomas Fogo'}`;
    layer.bindPopup(content);
    layer.on('click',()=>{layer.setStyle({weight:4,color:'#071b3a'});map.fitBounds(layer.getBounds(),{maxZoom:13,padding:[30,30]})});
    layer.on('popupclose',()=>layer.setStyle({weight:2,color:'#8b1d11'}));
  }}/>;
  if (!active || !enabled || !burnedArea?.rasterUrl) return null;

  return (
    <Pane name="burned-area-raster" style={{zIndex:350}}><TileLayer
      attribution="MapBiomas Monitor do Fogo"
      url={burnedArea.rasterUrl}
      opacity={opacity}
      eventHandlers={{tileerror:()=>setFailed(true)}}
    /></Pane>
  );
}

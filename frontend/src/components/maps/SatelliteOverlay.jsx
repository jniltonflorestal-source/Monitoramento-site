import { useState } from "react";
import { TileLayer } from "react-leaflet";

export function SatelliteOverlay() {
  const [failed, setFailed] = useState(false);
  const date = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return <>
    <TileLayer attribution="NASA GIBS / MODIS Terra" url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`} maxNativeZoom={9} opacity={0.8} eventHandlers={{tileerror:()=>setFailed(true)}} />
    <div className="satellite-caption" role="status">{failed ? "Imagem parcialmente indisponível. " : ""}NASA MODIS • {date} • composição diária, não imagem em tempo real.</div>
  </>;
}

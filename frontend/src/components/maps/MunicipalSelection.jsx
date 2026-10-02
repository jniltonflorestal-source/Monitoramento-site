import { useEffect } from "react";
import { GeoJSON, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { inMunicipality } from "../../services/municipalMonitoring";

export function MunicipalSelection({ boundary, selected, onSelect }) {
  const map = useMap();
  useMapEvents({
    click: (e) => {
      const feature = boundary?.features.find((f) =>
        inMunicipality({ latitude: e.latlng.lat, longitude: e.latlng.lng }, f),
      );
      if (feature) onSelect(feature);
    },
  });
  useEffect(() => {
    if (selected) {
      map.closePopup();
      map.fitBounds(L.geoJSON(selected).getBounds(), {
        padding: [24, 24],
        maxZoom: 10,
      });
    }
  }, [selected, map]);
  return (
    <>
      {boundary && (
        <GeoJSON
          data={boundary}
          interactive={false}
          style={{ color: "#526f83", weight: 0.6, fillOpacity: 0 }}
        />
      )}
      {selected && (
        <GeoJSON
          key={selected.properties.codarea}
          data={selected}
          interactive={false}
          style={{
            color: "#071b3a",
            weight: 3,
            fillColor: "#f59a23",
            fillOpacity: 0.12,
          }}
        />
      )}
    </>
  );
}

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const DEFAULT_CENTER = [-10.18, -48.33];

export function MapViewportController({ boundary, focus, centerRequest }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const updateSize = () => {
      map.invalidateSize({ pan: false });
      if (boundary && !focus) map.fitBounds(L.geoJSON(boundary).getBounds(), {padding:[20,20]});
    };
    const frame = window.requestAnimationFrame(updateSize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateSize) : null;

    observer?.observe(container);
    window.addEventListener("resize", updateSize);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [map, boundary, focus]);

  useEffect(() => {
    if (!centerRequest && !boundary) return;
    if (boundary) {
      map.fitBounds(L.geoJSON(boundary).getBounds(), { padding: [20, 20] });
    } else {
      map.setView(DEFAULT_CENTER, 6);
    }
  }, [boundary, centerRequest, map]);

  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.latitude, focus.longitude], focus.zoom || 9, { duration: 0.6 });
  }, [focus, map]);

  return null;
}

import {memo} from 'react';
import {CircleMarker,Popup} from 'react-leaflet';

const style={color:'#ba3e24',fillColor:'#f25922',fillOpacity:0.88,weight:2};
export const FirePointMarker=memo(function FirePointMarker({point}) {
  return <CircleMarker center={[point.latitude,point.longitude]} radius={5} pathOptions={style}>
    <Popup><strong>{point.city}</strong><br/>Foco detectado por satélite<br/>
      {point.satellite || 'INPE Queimadas'} {point.detectedAt?`| ${point.detectedAt} UTC`:''}<br/>
      {point.latitude}, {point.longitude}<br/>Fonte: INPE Queimadas
    </Popup>
  </CircleMarker>;
});

import {finiteValue} from './dataQuality.js';
import {booleanPointInPolygon,point} from '@turf/turf';

function position(row) {
  const latitude=finiteValue(row.requested?.[0]),longitude=finiteValue(row.requested?.[1]);
  return latitude!==null&&longitude!==null&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180?{latitude,longitude}:null;
}
function weatherValue(key,value) {
  const n=finiteValue(value);
  if(n===null)return null;
  if(['wind_speed_10m','wind_gusts_10m','precipitation'].includes(key)&&n<0)return null;
  if(key==='cloud_cover'&&(n<0||n>100))return null;
  if(key==='wind_direction_10m'&&(n<0||n>360))return null;
  return n;
}
export function weatherRowsAtTime(grid,seconds) {
  if(!Number.isFinite(seconds))return [];
  return (grid?.points||[]).flatMap(row=>{
    const coordinates=position(row),times=row.hourly?.time||[];
    if(!coordinates)return [];
    const indices=times.flatMap((time,index)=>finiteValue(time)===seconds?[index]:[]);
    if(indices.length!==1)return [];
    return [{...coordinates,time:seconds,...Object.fromEntries(Object.entries(row.hourly).filter(([key])=>key!=='time').map(([key,values])=>[key,weatherValue(key,values?.[indices[0]])]))}];
  });
}
export function buildWeatherTimeline(grid,variable='wind_speed_10m',now=Date.now(),boundary=null) {
  const points=(grid?.points||[]).filter(row=>{
    const coordinates=position(row);
    return coordinates&&(!boundary||(boundary.features||[boundary]).some(feature=>booleanPointInPolygon(point([coordinates.longitude,coordinates.latitude]),feature)));
  });
  const times=[...new Set(points.flatMap(row=>(row.hourly?.time||[]).map(finiteValue).filter(time=>time!==null&&time*1000>=now&&time*1000<=now+72*3600000)))].sort((a,b)=>a-b);
  const frames=times.flatMap(time=>{
    const rows=weatherRowsAtTime({points},time),values=rows.map(row=>row[variable]).filter(value=>Number.isFinite(value));
    return values.length?[{time:time*1000,value:Math.max(...values),rows,coverage:values.length,total:points.length}]:[];
  });
  return frames.map((frame,index)=>({...frame,index}));
}

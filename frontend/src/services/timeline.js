import {filterDetections,utcTime} from './operationalMap.js';
import {timestamp} from './dataQuality.js';
import {analyzeRiverSeries} from './hydrologyMetrics.js';

function sampleFrames(rows,limit) {
  if(rows.length<=limit)return rows;
  return Array.from({length:limit},(_,i)=>rows[Math.round(i*(rows.length-1)/(limit-1))]);
}

export function buildFireTimeline(points,{now=Date.now(),hours=24,coverageStart,coverageEnd,status,missingDates=[],...filters}={}) {
  const period=[24,48,168].includes(Number(hours))?Number(hours):24;
  let latest=null;
  for(const point of points){const time=utcTime(point.detectedAt||point.data_hora_gmt);if(Number.isFinite(time)&&time<=now)latest=Math.max(latest??time,time);}
  const coverageTime=timestamp(coverageEnd),coverageBeginning=timestamp(coverageStart);
  const end=Math.min(now,Math.max(latest??0,coverageTime??0))||now,start=end-period*3600000;
  const rows=filterDetections(points,{...filters,hours:period,now:end}).map(point=>({...point,timelineTime:utcTime(point.detectedAt||point.data_hora_gmt)})).sort((a,b)=>a.timelineTime-b.timelineTime);
  const counts=new Map();
  rows.forEach((point,index)=>counts.set(point.timelineTime,index+1));
  const frames=sampleFrames([...counts].map(([time,value])=>({time,value})),48);
  return {frames,points:rows,start,end,hours:period,historical:now-end>36*3600000,
    complete:status==='ready'&&coverageBeginning!==null&&coverageTime!==null&&start>=coverageBeginning&&end<=coverageTime&&!missingDates.length};
}

export const firePointsAt=(model,time)=>model.points.filter(point=>point.timelineTime<=time);

export function buildRiverTimeline(readings,days=1,now=Date.now()) {
  const period=[1,7,30].includes(Number(days))?Number(days):1;
  const rows=analyzeRiverSeries(readings,now).readings.filter(row=>row.time>=now-period*86400000);
  return sampleFrames(rows.map(row=>({time:row.time,value:row.level})),120);
}

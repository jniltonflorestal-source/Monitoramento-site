import { finiteValue, timestamp } from './dataQuality.js';

// Display/comparison policies, not flood thresholds. Never infer a missing timezone.
export function analyzeRiverSeries(input=[],now=Date.now()) {
  const unique=new Map(),conflicts=new Set();
  let ambiguous=0;
  for(const row of input) {
    const time=timestamp(row.dateTime),level=finiteValue(row.level);
    if(time===null){ambiguous++;continue;}
    if(time>now)continue;
    if(unique.has(time)&&unique.get(time).level!==level)conflicts.add(time);
    unique.set(time,{...row,time,level});
  }
  const readings=[...unique.values()].filter(row=>row.level!==null&&!conflicts.has(row.time)).sort((a,b)=>a.time-b.time);
  const latest=readings.at(-1)||null;
  const quality=!latest?'unknown':now-latest.time>86400000?'stale':'current';
  const difference=baseline=>latest&&baseline?{value:latest.level-baseline.level,hours:(latest.time-baseline.time)/3600000,from:baseline.dateTime,to:latest.dateTime}:null;
  const compare=hours=> {
    if(!latest)return null;
    const baseline=readings.filter(row=>Math.abs(row.time-(latest.time-hours*3600000))<=3600000&&row.time<latest.time).sort((a,b)=>Math.abs(a.time-(latest.time-hours*3600000))-Math.abs(b.time-(latest.time-hours*3600000)))[0];
    return difference(baseline);
  };
  const delta24=compare(24),delta6=compare(6),previous=difference(readings.at(-2));
  return {readings,latest,quality,delta24,delta6,previous,ambiguous,conflicts:conflicts.size,
    direction:quality!=='current'||!delta24?'unknown':delta24.value>0?'up':delta24.value<0?'down':'stable'};
}

export function summarizeRiverStations(stations=[],now=Date.now()) {
  const rows=stations.map(station=>({...station,analysis:analyzeRiverSeries(station.readings||[],now)}));
  const usable=rows.filter(row=>row.status==='ok'&&row.analysis.quality==='current');
  const comparable=usable.filter(row=>row.analysis.delta24);
  return {rows,total:rows.length,valid:usable.length,
    rising:comparable.length?comparable.filter(row=>row.analysis.direction==='up').length:null,
    falling:comparable.length?comparable.filter(row=>row.analysis.direction==='down').length:null,
    stable:comparable.length?comparable.filter(row=>row.analysis.direction==='stable').length:null,
    stale:rows.filter(row=>row.analysis.quality==='stale').length,
    unavailable:rows.filter(row=>row.analysis.quality!=='stale'&&(row.status!=='ok'||row.analysis.quality!=='current')).length,
    incomparable:usable.filter(row=>!row.analysis.delta24).length};
}

export function riverDeltaLabel(delta) {
  if(!delta)return 'Comparação indisponível';
  const value=Number(delta.value.toFixed(2));
  return `${value>0?'↑ +':value<0?'↓ ':'→ '}${value.toLocaleString('pt-BR')} cm / ${delta.hours.toLocaleString('pt-BR',{maximumFractionDigits:1})}h`;
}

import { bbox, booleanPointInPolygon, point } from '@turf/turf';
import { finiteValue, assessFreshness } from './dataQuality.js';
import { analyzeRiverSeries, riverDeltaLabel } from './hydrologyMetrics.js';
import { utcTime } from './operationalMap.js';

export function rankMunicipalities(snapshot,features=[],theme='rain',now=Date.now()) {
  const territories=features.map(feature=>({feature,box:bbox(feature)}));
  const locate=row=> {
    const lat=finiteValue(row.latitude),lon=finiteValue(row.longitude);
    if(lat===null||lon===null)return null;
    return territories.find(({box,feature})=>lon>=box[0]&&lon<=box[2]&&lat>=box[1]&&lat<=box[3]&&booleanPointInPolygon(point([lon,lat]),feature))?.feature;
  };
  const result=new Map();
  const add=(feature,item,sum=false)=> {
    if(!feature)return;
    const code=String(feature.properties.codarea),previous=result.get(code);
    if(sum&&previous){previous.value+=item.value;return;}
    if(!previous || Math.abs(item.value)>Math.abs(previous.value))result.set(code,{...item,code,name:feature.properties.nome});
  };
  if(theme==='rain'&&snapshot.rain?.state==='ready')for(const row of snapshot.rain.stations || []) {
    const amount=finiteValue(row.amount??row.chuva24h),date=row.updatedAt||row.atualizadoEm;
    if(amount===null||amount<=0||row.statusLeitura!=='valida'||assessFreshness(date,3,now).status!=='current')continue;
    add(locate(row),{value:amount,unit:'mm',reason:`Maior acumulado pontual · ${row.name || row.nome || 'estação'}`,period:'Observado 24h',source:row.fonte || row.source || snapshot.rain.source,date});
  }
  if(theme==='fire'&&snapshot.fire?.state==='ready'&&assessFreshness(snapshot.fire.observedAt,36,now).status==='current') {
    const seen=new Set();
    for(const row of snapshot.fire.points || []) {
      const time=utcTime(row.detectedAt),key=`${row.latitude}|${row.longitude}|${time}|${row.satellite}`;
      if(!Number.isFinite(time)||time>now||now-time>48*3600000||seen.has(key))continue;
      seen.add(key);
      add(locate(row),{value:1,unit:'focos',reason:'Detecções térmicas no arquivo consultado',period:snapshot.fire.period || 'Arquivo diário INPE',source:'INPE Queimadas',date:snapshot.fire.observedAt},true);
    }
  }
  if(theme==='rivers')for(const row of snapshot.rivers?.hydrology?.rows || []) {
    const analysis=analyzeRiverSeries(row.readings,now);
    if(row.status!=='ok'||analysis.quality!=='current'||!analysis.delta24||analysis.delta24.value===0)continue;
    add(locate(row),{value:analysis.delta24.value,unit:'cm',reason:`${row.name} · ${riverDeltaLabel(analysis.delta24)}`,period:'Variação com intervalo próximo de 24h',source:'ANA / Telemetria',date:analysis.latest.dateTime});
  }
  if(theme==='drought'&&snapshot.drought?.state==='ready'&&snapshot.drought.quality?.status==='current') {
    const classes={'Fraca':1,'Moderada':2,'Severa':3,'Extrema':4,'Excepcional':5};
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    for(const row of snapshot.drought.municipalities || []) {
      const degree=classes[row.classe];if(!degree)continue;
      const feature=features.find(feature=>normalize(feature.properties.nome)===normalize(row.nome));
      add(feature,{value:degree,display:row.classe,unit:'',reason:'Categoria do índice técnico de seca',period:snapshot.drought.reference,source:snapshot.drought.source,date:snapshot.drought.observedAt});
    }
  }
  return [...result.values()].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)||a.name.localeCompare(b.name,'pt-BR'));
}

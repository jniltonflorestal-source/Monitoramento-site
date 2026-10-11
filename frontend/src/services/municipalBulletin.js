import {municipalObservations} from './municipalMonitoring.js';
import {assessFreshness,finiteValue,nonNegativeValue} from './dataQuality.js';
import {analyzeRiverSeries} from './hydrologyMetrics.js';
import {getAnaReportedReading} from './anaReportedReading.js';
import {buildFireTimeline} from './timeline.js';

const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export const bulletinNumber=(value,unit='')=>finiteValue(value)===null?'Indisponível':`${Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2})}${unit}`;
export const bulletinDate=value=>!value?'Não informado':/Z$|[+-]\d{2}:\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):String(value);

export function buildMunicipalBulletin({feature,rain=[],rivers=[],firePoints=[],fireHistory,weatherQuery,burnedQuery,snapshot={},riverReadings={},hours=24,selectedCode},now=Date.now()) {
  const local=municipalObservations(feature,rain,rivers);
  const rainRows=local.validRain.filter(row=>nonNegativeValue(row.amount??row.chuva24h)!==null&&assessFreshness(row.updatedAt||row.atualizadoEm,3,now).status==='current').sort((a,b)=>(b.amount??b.chuva24h)-(a.amount??a.chuva24h));
  const hydro=local.rivers.map(row=>{
    const data=riverReadings[row.code]||row.collected||{},analysis=analyzeRiverSeries(data.readings||[],now);
    const reported=data.reportedReading||(!analysis.latest?getAnaReportedReading(data.readings):null);
    return {...row,analysis,failed:data.status==='error',level:analysis.latest?.level??reported?.level??null,date:analysis.latest?.dateTime||reported?.dateTime,status:data.status==='error'?'Consulta indisponível; leitura preservada':analysis.latest?analysis.quality==='current'?'Leitura recente':'Série histórica':reported?'Horário não confirmado':'Leitura indisponível'};
  });
  const fireModel=buildFireTimeline(firePoints,{hours,boundary:feature,now,coverageStart:fireHistory?.coverageStart,coverageEnd:fireHistory?.coverageEnd,status:fireHistory?.status,missingDates:fireHistory?.missingDates});
  hydro.sort((a,b)=>Number(String(b.code)===String(selectedCode))-Number(String(a.code)===String(selectedCode)));
  const count=!fireModel.historical&&(fireModel.points.length>0||fireModel.complete)?fireModel.points.length:null;
  const area=burnedQuery?.state==='ready'?burnedQuery.data:null;
  const drought=(snapshot.drought?.municipalities||[]).find(row=>normalize(row.nome)===normalize(feature.properties.nome));
  const alertSource=snapshot.alerts||{},alertsCurrent=alertSource.state==='ready'&&assessFreshness(alertSource.observedAt,6,now).status==='current';
  const alerts=alertsCurrent?(alertSource.details||[]).filter(row=>Array.isArray(row.municipalityCodes)&&row.municipalityCodes.map(String).includes(String(feature.properties.codarea))):[];
  const hourly=weatherQuery?.state==='ready'?weatherQuery.data.hourly:null,index=hourly?.time?.findIndex(time=>time*1000>=now)??-1;
  const sum=duration=>{
    const rows=index>=0?hourly?.precipitation?.slice(index,index+duration):[];
    return rows?.length===duration&&rows.every(value=>nonNegativeValue(value)!==null)?rows.reduce((a,b)=>a+Number(b),0):null;
  };
  const weather={temperature:index>=0?finiteValue(hourly.temperature_2m?.[index]):null,humidity:index>=0?finiteValue(hourly.relative_humidity_2m?.[index]):null,wind:index>=0?finiteValue(hourly.wind_speed_10m?.[index]):null,direction:index>=0?finiteValue(hourly.wind_direction_10m?.[index]):null,gust:index>=0?finiteValue(hourly.wind_gusts_10m?.[index]):null,rain24:sum(24),rain48:sum(48),validAt:index>=0?new Date(hourly.time[index]*1000).toISOString():null,queriedAt:weatherQuery?.data?.queriedAt,latitude:weatherQuery?.data?.latitude,longitude:weatherQuery?.data?.longitude};
  const result={feature,name:feature.properties.nome,code:String(feature.properties.codarea),generatedAt:new Date(now).toISOString(),hours,
    rain:{rows:rainRows,registered:local.rain.length||snapshot.rain?.state==='ready'?local.rain.length:null,maximum:rainRows.length?Number(rainRows[0].amount??rainRows[0].chuva24h):null},rivers:hydro,riverCount:rivers.length||snapshot.rivers?.state==='ready'?hydro.length:null,
    fire:{...fireModel,count,updatedAt:fireHistory?.updatedAt},burned:{hectares:nonNegativeValue(area?.hectares),period:area?.period,updatedAt:area?.updatedAt},
    drought:{category:drought?.classe||null,reference:snapshot.drought?.reference,date:snapshot.drought?.observedAt,historical:Boolean(drought)&&assessFreshness(snapshot.drought?.observedAt,120*24,now).status!=='current',source:snapshot.drought?.source||'CEMADEN / Índice de seca'},
    alerts:{rows:alerts,count:alerts.length||null,date:alertSource.observedAt,note:alerts.length?'Abrangência municipal confirmada por código.':'Abrangência municipal não confirmada nas fontes carregadas. Consulte os órgãos emissores.'},weather};
  const sentences=[];
  if(result.rain.maximum!==null)sentences.push(`Maior chuva observada em estação do município: ${bulletinNumber(result.rain.maximum,' mm / 24h')}.`);
  const comparable=hydro.find(row=>!row.failed&&row.analysis.quality==='current'&&row.analysis.delta24);
  if(comparable){const delta=comparable.analysis.delta24;sentences.push(`${comparable.name}: variação de ${bulletinNumber(delta.value,' cm')} em ${bulletinNumber(delta.hours,'h')}.`);}
  if(count!==null)sentences.push(`${count} detecção(ões) térmica(s) carregada(s) na janela do arquivo INPE.`);
  if(alerts.length)sentences.push(`${alerts.length} aviso(s) com abrangência municipal confirmada.`);
  result.summary=sentences.join(' ')||'Não há dados suficientes para compor um resumo quantitativo nesta consulta. As limitações estão indicadas em cada tema.';
  return result;
}

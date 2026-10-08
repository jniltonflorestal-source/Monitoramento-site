import {rankMunicipalities} from './municipalRanking.js';
import {inMunicipality} from './municipalMonitoring.js';
import {finiteValue, assessFreshness} from './dataQuality.js';
import {analyzeRiverSeries} from './hydrologyMetrics.js';

export const situationThemes = [
  ['integrated','Visão Integrada'],['rain','Chuva'],['rivers','Hidrologia'],
  ['fire','Fogo'],['drought','Seca'],['alerts','Alertas']
];
export const situationColors = {rain:'#2177ad',rivers:'#126c70',fire:'#ba481e',drought:'#916215',alerts:'#a12539',integrated:'#536088',unknown:'#dce1e5'};
const label = id => situationThemes.find(([key])=>key===id)?.[1] || id;
const missing = id => ({id,value:null,status:'Dados insuficientes',source:'Fonte não confirmada',date:null,reason:'Sem dado municipal válido nesta consulta.'});
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const droughtDegree = {'Sem seca':0,Fraca:1,Moderada:2,Severa:3,Extrema:4,Excepcional:5};
const severity = value => ({'Perigo Potencial':1,Moderado:1,Perigo:2,Alto:2,'Grande Perigo':3,'Muito Alto':3}[value] || 0);
const themes = situationThemes.slice(1).map(([id])=>id);
const isFresh = (item,hours,now) => item?.state==='ready' && assessFreshness(item.observedAt,hours,now).status==='current';

export function buildStateSituation(snapshot, features=[], now=Date.now()) {
  const rankings = Object.fromEntries(['rain','rivers','fire','drought'].map(theme=>[theme,rankMunicipalities(snapshot,features,theme,now)]));
  const byTheme = Object.fromEntries(Object.entries(rankings).map(([theme,rows])=>[theme,new Map(rows.map(row=>[row.code,row]))]));
  const validRain = snapshot.rain?.state==='ready' ? (snapshot.rain.stations || []).filter(row=>row.statusLeitura==='valida' && finiteValue(row.amount??row.chuva24h)!==null && finiteValue(row.amount??row.chuva24h)>=0 && assessFreshness(row.updatedAt||row.atualizadoEm,3,now).status==='current') : [];
  const stableRivers=(snapshot.rivers?.hydrology?.rows || []).map(row=>({...row,analysis:analyzeRiverSeries(row.readings,now)})).filter(row=>row.status==='ok'&&row.analysis.quality==='current'&&row.analysis.delta24?.value===0);
  const alertsCurrent = isFresh(snapshot.alerts,6,now);
  const alertDetails = alertsCurrent ? snapshot.alerts.details || [] : [];
  const droughtCurrent = isFresh(snapshot.drought,24*120,now) && snapshot.drought.quality?.status==='current';
  const droughtByName = new Map((droughtCurrent ? snapshot.drought.municipalities || [] : []).map(row=>[normalize(row.nome),row]));
  const municipalities = features.map(feature=>{
    const code=String(feature.properties.codarea),name=feature.properties.nome;
    const indicators=Object.fromEntries(themes.map(id=>[id,missing(id)]));
    for(const id of ['rain','rivers','fire']) {
      const row=byTheme[id].get(code);
      if(row) indicators[id]={...row,id,status:'Acompanhamento',display:row.display || `${row.value.toLocaleString('pt-BR',{maximumFractionDigits:1})} ${id==='fire'&&row.value===1?'foco':row.unit}`};
    }
    // A measured zero is valid. Absence of a station is never a measured zero.
    if(indicators.rain.value===null) {
      const row=validRain.find(row=>inMunicipality(row,feature));
      if(row) indicators.rain={id:'rain',value:finiteValue(row.amount??row.chuva24h),display:'0 mm',status:'Acompanhamento',reason:'Zero medido na estação; não representa todo o município.',source:row.fonte||row.source||snapshot.rain.source,date:row.updatedAt||row.atualizadoEm,period:'Observado 24h'};
    }
    const drought=droughtByName.get(normalize(name));
    if(indicators.rivers.value===null) {
      const row=stableRivers.find(row=>inMunicipality(row,feature));
      if(row) indicators.rivers={id:'rivers',value:0,display:'0 cm de variação',status:'Acompanhamento',reason:`${row.name}: nível estável no intervalo comparado; não é classificação de risco.`,source:'ANA / Telemetria',date:row.analysis.latest.dateTime,period:`Variação em ${row.analysis.delta24.hours}h`};
    }
    if(drought && droughtDegree[drought.classe]!==undefined) {
      const value=droughtDegree[drought.classe];
      indicators.drought={id:'drought',value,display:drought.classe,status:value>=3?'Atenção elevada':value===2?'Atenção':'Acompanhamento',reason:'Categoria oficial do índice de seca, não risco integrado.',source:snapshot.drought.source,date:snapshot.drought.observedAt,period:snapshot.drought.reference};
    }
    // Display text may list only a few cities. Never infer the full footprint from it.
    const localAlerts=alertDetails.filter(alert=>Array.isArray(alert.municipalityCodes) && alert.municipalityCodes.map(String).includes(code));
    if(localAlerts.length) {
      const highest=Math.max(...localAlerts.map(alert=>severity(alert.severity)));
      indicators.alerts={id:'alerts',value:localAlerts.length,display:`${localAlerts.length} aviso(s)`,status:highest>=2?'Atenção elevada':highest===1?'Atenção':'Acompanhamento',reason:localAlerts.map(alert=>`${alert.title} · ${alert.severity}`).join('; '),source:snapshot.alerts.source,date:snapshot.alerts.observedAt,period:localAlerts.map(alert=>alert.period).filter(Boolean).join('; '),highest};
    }
    const available=themes.filter(id=>indicators[id].value!==null);
    const factors=available.filter(id=>Math.abs(indicators[id].value)>0);
    const primary=factors.includes('alerts')?'alerts':factors.length===1?factors[0]:null;
    return {code,name,feature,indicators,coverage:available.length,factors,primary,
      factor:primary?label(primary):factors.length>1?'Múltiplos fatores':available.length?'Sem destaque nos dados disponíveis':'Dados insuficientes'};
  });
  const radar=themes.map(id=>{
    const observed=municipalities.map(row=>row.indicators[id]).filter(item=>item.value!==null);
    if(id==='alerts' && alertsCurrent) {
      const counts=[snapshot.alerts.inmetCount,snapshot.alerts.cemadenCount].filter(value=>finiteValue(value)!==null);
      const highest=Math.max(0,...alertDetails.map(alert=>severity(alert.severity)));
      return {id,label:label(id),status:counts.length?highest>=2?'Atenção elevada':highest===1?'Atenção':'Acompanhamento':'Dados insuficientes',value:counts.length?`${counts.reduce((a,b)=>a+b,0)} aviso(s) confirmado(s)`:'Total não confirmado',source:snapshot.alerts.source,date:snapshot.alerts.observedAt,coverage:observed.length,note:`${snapshot.alerts.coverageComplete===false?'Consulta parcial. ':''}Abrangência municipal exige identificadores confirmados; texto resumido não é convertido em polígono.`};
    }
    const top=[...observed].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value))[0];
    const highest=observed.some(row=>row.status==='Atenção elevada')?'Atenção elevada':observed.some(row=>row.status==='Atenção')?'Atenção':'Acompanhamento';
    return {id,label:label(id),status:top?highest:'Dados insuficientes',value:top?.display || 'Não disponível',source:top?.source || snapshot[id]?.source || 'Fonte não confirmada',date:top?.date,coverage:observed.length,note:id==='rain'?'Maior leitura pontual; não é média territorial.':id==='rivers'?'Maior variação absoluta comparável; subida não significa inundação.':id==='fire'?'Maior contagem municipal no arquivo diário INPE; não equivale a área queimada.':'Categoria do período informado pela fonte.'};
  });
  const maximum=Object.fromEntries(themes.map(id=>[id,Math.max(0,...municipalities.map(row=>Math.abs(row.indicators[id].value??0)))]));
  return {municipalities,radar,maximum,total:features.length,rankings};
}

export function situationColor(row, theme, maximum) {
  if(theme==='integrated') return !row.coverage?situationColors.unknown:row.primary?situationColors[row.primary]:row.factors.length>1?situationColors.integrated:'#c6d8df';
  const item=row.indicators[theme];
  if(item.value===null)return situationColors.unknown;
  const ratio=maximum[theme] ? Math.abs(item.value)/maximum[theme] : 0;
  const color=situationColors[theme];
  const rgb=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
  return `rgb(${rgb.map(channel=>Math.round(240+(channel-240)*(0.2+0.8*ratio))).join(',')})`;
}

export function situationRanking(model,theme) {
  const rows=model.municipalities.filter(row=>theme==='integrated'?row.factors.length:Math.abs(row.indicators[theme].value??0)>0);
  // Integrated view is grouped, never a numerical score across different units.
  return rows.sort((a,b)=>theme==='integrated' ? Number(b.primary==='alerts')-Number(a.primary==='alerts') || a.factor.localeCompare(b.factor,'pt-BR') || a.name.localeCompare(b.name,'pt-BR') : Math.abs(b.indicators[theme].value)-Math.abs(a.indicators[theme].value) || a.name.localeCompare(b.name,'pt-BR'));
}

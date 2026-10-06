import { nonNegativeValue } from './dataQuality.js';
import { mapAnchors } from '../data/mapThemes.js';
import { riverDeltaLabel } from './hydrologyMetrics.js';

const absent = 'Não disponível';
const number = value => nonNegativeValue(value);
const fmt = (value, digits=0) => value.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
export function indicatorTime(item) {
  if (/^\d{4}-\d{2}/.test(item?.reference || '')) return `${item.reference.slice(5,7)}/${item.reference.slice(0,4)}`;
  const stamp = item?.observedAt || item?.updatedAt;
  if (!stamp) return 'Horário não informado';
  if (typeof stamp === 'string' && (/Z$|UTC$|[+-]\d{2}:\d{2}$/.test(stamp)) && Number.isFinite(Date.parse(stamp))) return new Date(stamp).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
  return stamp;
}

export function dataHealthRows(snapshot, refreshing=false) {
  const themes = [['alerts','Alertas · CEMADEN / INMET'],['emergency','Reconhecimentos · S2ID'],['rivers','Estações de rios · ANA'],['fire','Focos · INPE'],['drought','Seca · CEMADEN']];
  const rows = themes.map(([key,label])=> {
    const item=snapshot[key] || {}, quality=item.quality;
    const current=item.state==='ready' && quality?.status!=='catalog';
    const delayed=quality?.status==='stale';
    return {key,label,current,delayed,status:quality?.status==='catalog'?'Cadastro disponível':delayed?'Dados desatualizados':current?'Dados disponíveis':refreshing&&!snapshot.attemptedAt?'Atualizando':'Dados indisponíveis',updatedAt:indicatorTime(item),attemptedAt:quality?.attemptedAt || item.attemptedAt || snapshot.attemptedAt,note:quality?.message || item.description};
  });
  for (const source of ['CEMADEN','INMET','ANA','SEMARH']) {
    const item=snapshot.rain?.sourceBreakdown?.[source];
    rows.push({key:`rain-${source}`,label:`Chuva · ${source}`,current:item?.status==='ready',delayed:item?.status!=='ready'&&item?.staleCount>0,status:item?.label || (refreshing?'Atualizando':'Consulta indisponível'),updatedAt:item?.updatedAt,attemptedAt:item?.attemptedAt || snapshot.attemptedAt,note:item?.status==='integration'?item.message:item?`${item.registeredCount ?? 'Não informado'} cadastradas; ${item.validCount ?? 'não informado'} com leitura válida; ${item.staleCount ?? 0} desatualizadas. ${item.message || ''}`:'Consulta não concluída.'});
  }
  const area=snapshot.fire?.burnedArea;
  rows.push({key:'burned',label:'Área queimada · MapBiomas',current:Boolean(area && area.quality?.status==='current'),delayed:area?.quality?.status==='stale',status:!area?'Dados indisponíveis':area.quality?.status==='current'?'Produto disponível':'Atualização não confirmada',updatedAt:area?.updatedAt,attemptedAt:area?.quality?.attemptedAt,note:area?`Período: ${area.period || area.year || 'não informado'}. Produto de área queimada, distinto das detecções térmicas.`:'Período e área não confirmados.'});
  rows.push({key:'idap',label:'Alertas · IDAP',status:'Fonte em integração',note:'Consulta automática pública não configurada. Confirme no canal oficial.',current:false});
  return rows;
}

export function buildStateDashboard(snapshot) {
  const healthRows=dataHealthRows(snapshot);
  const health={total:healthRows.length,available:healthRows.filter(row=>row.current).length,delayed:healthRows.filter(row=>row.delayed).length};
  health.unavailable=health.total-health.available-health.delayed;
  const base=(id,title,sourceItem={})=>({
    ...sourceItem,id,title,facts:[],theme:id,
    displayValue:sourceItem.state==='loading'?'Consultando':sourceItem.state==='ready'?sourceItem.value || absent:'Indisponível',
    value:sourceItem.state==='loading'?'Consultando':sourceItem.state==='ready'?sourceItem.value || absent:'Indisponível',
    statusLabel:sourceItem.state==='loading'?'Atualizando':sourceItem.quality?.status==='stale'?'Desatualizado':sourceItem.state==='ready'?'Disponível':'Sem dados',
    tone:'empty',source:sourceItem.source || 'Fonte não informada',stamp:indicatorTime(sourceItem),
    description:sourceItem.state==='loading'?'Consultando a fonte, com tempo limite.':sourceItem.state==='ready'?sourceItem.description:sourceItem.quality?.message || 'Não foi possível confirmar dados atuais desta fonte.',
    actionHref:`#${mapAnchors[id]}`,actionLabel:'Consultar no mapa'
  });
  const alerts=base('alerts','Alertas vigentes',snapshot.alerts);
  if(snapshot.alerts?.state==='ready') {
    const a=number(snapshot.alerts.cemadenCount),b=number(snapshot.alerts.inmetCount);
    alerts.value=a!==null&&b!==null?fmt(a+b):absent;
    const complete = a!==null && b!==null;
    alerts.description=!complete?'Contagem não confirmada. Consulte os órgãos emissores.':a+b>0?'Avisos identificados nos órgãos emissores.':'Nenhum aviso identificado nas fontes consultadas.';
    alerts.statusLabel=!complete?'Sem confirmação':a+b>0?'Aviso vigente':'Sem aviso';
    const rank={'Grande Perigo':3,'Perigo':2,'Perigo Potencial':1};
    const details=snapshot.alerts.details || [];
    const severity=[...details].sort((a,b)=>(rank[b.severity]||0)-(rank[a.severity]||0))[0]?.severity;
    const mainDetail=[...details].sort((a,b)=>(rank[b.severity]||0)-(rank[a.severity]||0))[0];
    alerts.facts=[{label:'Severidade informada',value:severity || 'Consultar órgão emissor'},{label:'Abrangência',value:details.length?'Ver municípios no aviso':'Consultar fonte oficial'},...(mainDetail?.period?[{label:'Vigência informada',value:mainDetail.period}]:[])];
    alerts.tone=severity==='Grande Perigo'?'emergency':a+b>0?'alert':'empty';
  }
  const rain=base('rain','Chuva observada · 24h',snapshot.rain);
  const stations=(snapshot.rain?.stations || []).filter(s=>s.statusLeitura==='valida'&&number(s.amount??s.chuva24h)!==null);
  if(snapshot.rain?.state==='ready'&&stations.length) {
    const ordered=[...stations].sort((a,b)=>(b.amount??b.chuva24h)-(a.amount??a.chuva24h));
    rain.value=`${fmt(number(ordered[0].amount??ordered[0].chuva24h),1)} mm`;
    rain.description=`Maior leitura: ${ordered[0].city || ordered[0].municipio || ordered[0].name || 'estação sem nome'}.`;
    rain.statusLabel='Observado';
    rain.facts=[{label:'Leituras válidas',value:String(stations.length)},{label:'Acima de 10 mm',value:String(stations.filter(s=>(s.amount??s.chuva24h)>10).length)}];
  }
  const rivers=base('rivers','Rios monitorados',snapshot.rivers);
  if(snapshot.rivers?.state==='ready') {
    rivers.value=`${fmt(snapshot.rivers.stations?.length || 0)} cadastradas`;
    rivers.description='Consulte níveis, tendências e gráficos por estação.';
    rivers.statusLabel='Cadastro';
  }
  rivers.facts=[{label:'Subidas / reduções',value:'Sem consolidação'},{label:'Maior variação',value:'Consultar estação'}];
  const hydro=snapshot.rivers?.hydrology;
  if(hydro?.total) {
    rivers.statusLabel=hydro.valid?'Leituras parciais':'Sem leitura atual';
    rivers.description=`${hydro.valid} com leitura recente entre ${hydro.total} estações consultadas. Cadastro: ${snapshot.rivers.stations?.length || hydro.total}.`;
    const greatest=hydro.rows.filter(row=>row.status==='ok'&&row.analysis.quality==='current'&&row.analysis.delta24).sort((a,b)=>Math.abs(b.analysis.delta24.value)-Math.abs(a.analysis.delta24.value))[0];
    rivers.facts=[{label:'Subidas / reduções · ~24h',value:`${hydro.rising ?? 'Não disponível'} / ${hydro.falling ?? 'Não disponível'}`},{label:'Atrasadas / indisponíveis',value:`${hydro.stale} / ${hydro.unavailable}`},{label:'Maior variação disponível',value:greatest?`${greatest.name}: ${riverDeltaLabel(greatest.analysis.delta24)}`:'Sem comparação válida'}];
  }
  const fire=base('fire','Focos de calor',snapshot.fire);
  if(snapshot.fire?.state==='ready') {
    fire.description='Detecções do arquivo diário INPE disponível; não é uma janela móvel de 24h.';
    fire.statusLabel='Arquivo diário';
    const counts=new Map();
    for(const point of snapshot.fire.points || []) if(point.city && point.city!=='Município não informado') counts.set(point.city,(counts.get(point.city)||0)+1);
    const peak=[...counts].sort((a,b)=>b[1]-a[1])[0];
    fire.facts=[{label:'Maior contagem no arquivo',value:peak?`${peak[0]} · ${peak[1]}`:absent},{label:'Comparação anterior',value:'Sem série comparável'}];
  }
  const area=snapshot.fire?.burnedArea;
  const burned=base('burned','Área queimada',{state:area?'ready':snapshot.fire?.state==='loading'?'loading':'error',source:area?.source || 'MapBiomas Monitor do Fogo',updatedAt:area?.updatedAt,quality:area?.quality});
  if(area && number(area.hectares)!==null) {
    burned.value=`${fmt(number(area.hectares),number(area.hectares)%1?2:0)} ha`;
    burned.description=area.period || `Período de referência: ${area.year || 'não informado'}`;
    burned.statusLabel=area.quality?.status==='current'?'Produto mensal':'Referência histórica';
    burned.facts=[{label:'Território',value:'Estado do Tocantins'},{label:'Município mais afetado',value:area.leadingMunicipality || 'Sem ranking consolidado'}];
  }
  const drought=base('drought','Seca',snapshot.drought);
  if(snapshot.drought?.state==='ready') {
    drought.value=snapshot.drought.value;
    drought.statusLabel='Índice de seca';
    drought.description='Condição informada pelo índice técnico no período de referência.';
    drought.facts=[{label:'Municípios com seca',value:number(snapshot.drought.summary?.com_seca)===null?absent:String(snapshot.drought.summary.com_seca)},{label:'Severa ou extrema',value:number(snapshot.drought.summary?.severa_ou_extrema)===null?absent:String(snapshot.drought.summary.severa_ou_extrema)}];
  }
  const emergency=base('emergency','Emergência e calamidade',snapshot.emergency);
  if(snapshot.emergency?.state==='ready') {
    emergency.statusLabel='Reconhecimento';
    emergency.description='Reconhecimentos federais vigentes consultados no S2ID.';
    emergency.facts=[{label:'Situação de Emergência',value:snapshot.emergency.se ?? absent},{label:'Calamidade Pública',value:snapshot.emergency.ecp ?? absent}];
  }
  const healthCard=base('health','Saúde dos dados',{state:snapshot.attemptedAt?'ready':'loading',source:'Diagnóstico das integrações',updatedAt:snapshot.attemptedAt});
  healthCard.value=snapshot.attemptedAt?`${health.available} de ${health.total}`:'Consultando';
  healthCard.statusLabel=snapshot.attemptedAt?'Bases disponíveis':'Atualizando';
  healthCard.description='Produtos com dados confirmados. Cadastro não conta como medição.';
  healthCard.facts=snapshot.attemptedAt?[{label:'Atrasados',value:String(health.delayed)},{label:'Sem confirmação',value:String(health.unavailable)}]:[];
  healthCard.actionHref='#qualidade-dados';healthCard.actionLabel='Ver diagnóstico';
  const cards=[alerts,rain,rivers,fire,burned,drought,emergency,healthCard].map(card=>({...card,displayValue:card.value}));
  return {cards,health,healthRows};
}

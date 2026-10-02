import { CloudRain, Flame, Waves, Sun, Building2, MapPinned, ArrowRight } from 'lucide-react';
function date(value){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('pt-BR'):value||'Atualização não informada'}
export function MapOverview({rain,fire,drought,emergency,stationCount,onSelect}) {
  const rows=[
    ['rain','Chuva e clima',CloudRain,rain],
    ['rivers','Rios',Waves,{value:stationCount?`${stationCount} estações cadastradas`:'Cadastro indisponível',source:'ANA / Telemetria',description:'Cadastro não indica situação de risco. Leituras consultadas por estação.'}],
    ['fire','Focos e queimadas',Flame,fire],
    ['drought','Seca',Sun,drought],
    ['emergency','SE/ECP',Building2,emergency],
  ];
  return <aside className="map-readiness overview-panel" aria-label="Visão geral territorial"><h3><MapPinned aria-hidden="true"/>Visão geral</h3><p>Panorama das bases disponíveis para o Tocantins</p><div className="overview-rows">{rows.map(([id,title,Icon,data])=><button type="button" key={id} onClick={()=>onSelect(id)}><span className="overview-row-title"><Icon aria-hidden="true"/>{title}<ArrowRight aria-hidden="true"/></span><strong>{data?.value||'Dados indisponíveis'}</strong>{data?.description&&<span>{data.description}</span>}<small>{data?.source||'Fonte não informada'} • {date(data?.updatedAt||data?.reference)}</small></button>)}</div></aside>;
}

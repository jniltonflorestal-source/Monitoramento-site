import { useMemo, useState } from 'react';
import { ListOrdered, ArrowRight } from 'lucide-react';
import { rankMunicipalities } from '../../services/municipalRanking.js';
import { indicatorTime } from '../../services/stateDashboard.js';
import '../../municipal-ranking.css';

export function MunicipalityRanking({snapshot,features,onSelect}) {
  const [open,setOpen]=useState(false),[theme,setTheme]=useState('rain'),[limit,setLimit]=useState(5);
  const rows=useMemo(()=>open?rankMunicipalities(snapshot,features,theme):[],[open,snapshot,features,theme]);
  return <details className="municipality-ranking" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary><ListOrdered size={20} aria-hidden="true" /><span>Municípios para acompanhamento</span><small>Destaques por tema, sem classificação de risco</small></summary>
    {open&&<div className="ranking-content">
      <div className="ranking-themes" aria-label="Tema do acompanhamento">{[['rain','Chuva'],['rivers','Rios'],['fire','Focos de calor'],['drought','Seca']].map(([id,label])=><button key={id} type="button" aria-pressed={theme===id} onClick={()=>{setTheme(id);setLimit(5);}}>{label}</button>)}</div>
      <p>{theme==='rain'?'Maiores acumulados nas estações dentro do município; não representam chuva em todo o território.':theme==='rivers'?'Maiores variações absolutas disponíveis. Subida e descida não representam, por si só, risco de inundação.':theme==='fire'?'Contagem de detecções do arquivo diário INPE consultado. Não equivale à área queimada ou necessariamente às últimas 24h.':'Categorias oficiais do índice disponível, no período informado. Não é ranking de risco.'}</p>
      {!features?.length?<p role="status">Limites municipais indisponíveis no momento.</p>:!rows.length?<p role="status">Sem destaques calculáveis com dados válidos nesta consulta. Isso não significa ausência de risco.</p>:<ol>{rows.slice(0,limit).map(row=><li key={row.code}><button type="button" onClick={()=>onSelect(features.find(feature=>String(feature.properties.codarea)===row.code),theme)}>
        <span><strong>{row.name}</strong><span>{row.reason}</span><small>{row.period} · {row.source} · {indicatorTime({observedAt:row.date})}</small></span>
        <b>{row.display || `${row.value>0&&theme==='rivers'?'+':''}${row.value.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${row.value===1&&row.unit==='focos'?'foco':row.unit}`}</b><ArrowRight size={18} aria-hidden="true" />
      </button></li>)}</ol>}
      {rows.length>limit&&<button type="button" className="ranking-more" onClick={()=>setLimit(value=>value+10)}>Mostrar mais municípios ({rows.length})</button>}
      <small>Somente bases confirmadas entram na lista. Área queimada ainda não possui ranking municipal consolidado; consulte o município no mapa.</small>
    </div>}
  </details>;
}

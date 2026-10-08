import {useEffect, useMemo, useRef, useState} from 'react';
import {GeoJSON} from 'react-leaflet';
import {CloudRain, Waves, Flame, Sun, BellRing, MapPinned} from 'lucide-react';
import {situationThemes, situationColors, situationColor, situationRanking} from '../../services/stateSituation.js';
import {indicatorTime} from '../../services/stateDashboard.js';
import '../../state-situation.css';

const icons={integrated:MapPinned,rain:CloudRain,rivers:Waves,fire:Flame,drought:Sun,alerts:BellRing};
const stamp=item=>indicatorTime({observedAt:item.date});
const textFor=(row,theme)=>theme==='integrated'?`${row.factor}. ${row.coverage}/5 dimensões com dado municipal. ${row.factors.map(id=>`${situationThemes.find(([key])=>key===id)[1]}: ${row.indicators[id].display}`).join('; ')}`:`${row.indicators[theme].display || 'Dados insuficientes'}. ${row.indicators[theme].reason} Fonte: ${row.indicators[theme].source}. ${stamp(row.indicators[theme])}`;

export function StateMunicipalitySummary({row}) {
  if(!row)return null;
  return <section aria-label="Situação municipal por tema"><h4>{row.factor}</h4>
    {situationThemes.slice(1).map(([id,label])=><p key={id}><strong>{label}: {row.indicators[id].display || 'Dados insuficientes'}</strong><br/><small>{row.indicators[id].source} · {stamp(row.indicators[id])}</small></p>)}
    <small>Indicadores de acompanhamento, não classificação oficial de risco.</small>
  </section>;
}

export function StateSituationControls({model,theme,onChange}) {
  return <div className="state-situation-controls">
    <div className="situation-themes" aria-label="Temas da Situação Estadual">{situationThemes.map(([id,label])=>{
      const Icon=icons[id];return <button type="button" key={id} aria-pressed={theme===id} onClick={()=>onChange(id)}><Icon size={18} aria-hidden="true"/>{label}</button>;
    })}</div>
    <details className="situation-radar" open>
      <summary>Radar de Situação Estadual</summary>
      <p>Indicador de acompanhamento baseado nos dados disponíveis. Não substitui alertas oficiais ou análise técnica.</p>
      <div className="radar-dimensions">{model.radar.map(item=>{
        const Icon=icons[item.id];return <button type="button" key={item.id} onClick={()=>onChange(item.id)} aria-pressed={theme===item.id} style={{'--theme-color':situationColors[item.id]}}>
          <span><Icon size={18} aria-hidden="true"/><strong>{item.label}</strong></span><b>{item.value}</b><span>{item.status}</span><small>{item.coverage}/{model.total} municípios com dado territorial</small><small>{item.source} · {stamp(item)}</small>
        </button>;
      })}</div>
    </details>
  </div>;
}

export function StateSituationLayer({boundary,model,theme,onSelect}) {
  const ref=useRef(null);
  useEffect(()=>{
    const rows=new Map(model.municipalities.map(row=>[row.code,row]));
    ref.current?.eachLayer(layer=>{
      const row=rows.get(String(layer.feature.properties.codarea));
      if(!row)return;
      layer.setStyle({color:'#526677',weight:0.8,fillOpacity:0.75,fillColor:situationColor(row,theme,model.maximum)});
      const content=document.createElement('div');
      content.textContent=`${row.name} — ${textFor(row,theme)}`;
      layer.bindTooltip(content,{sticky:true,className:'situation-tooltip'});
    });
  },[model,theme]);
  return <GeoJSON ref={ref} data={boundary} onEachFeature={(feature,layer)=>{
    layer.on('click',()=>onSelect(feature));
    layer.on('mouseover',()=>layer.setStyle({weight:2}));
    layer.on('mouseout',()=>layer.setStyle({weight:0.8}));
  }}/>;
}

export function StateSituationLegend({theme,model}) {
  return <div className="situation-legend" aria-label="Legenda da Situação Estadual">
    <strong>{situationThemes.find(([id])=>id===theme)[1]}</strong>
    <span><i style={{background:situationColors.unknown}}/>Dados insuficientes</span>
    {theme==='integrated'?<><span><i style={{background:situationColors.integrated}}/>Múltiplos fatores</span><span><i style={{background:'#c6d8df'}}/>Sem destaque nos dados disponíveis</span>{situationThemes.slice(1).map(([id,label])=><span key={id}><i style={{background:situationColors[id]}}/>{label}</span>)}</>:<><span className="situation-scale" style={{background:`linear-gradient(to right,#edf1f4,${situationColors[theme]})`}}/><small>Menor → maior valor disponível ({model.maximum[theme].toLocaleString('pt-BR',{maximumFractionDigits:1})})</small><small>{theme==='drought'?'Ordem das categorias oficiais; veja o detalhe municipal.':theme==='rivers'?'Magnitude da variação; veja subida/descida no detalhe.':'Intensidade relativa nesta consulta, não nível de risco.'}</small></>}
  </div>;
}

export function StateSituationPanel({model,theme,onSelect}) {
  const [limit,setLimit]=useState(5);
  useEffect(()=>setLimit(5),[theme]);
  const rows=useMemo(()=>situationRanking(model,theme),[model,theme]);
  const dimension=model.radar.find(item=>item.id===theme);
  return <aside className="state-situation-panel" aria-label="Sala de Situação Estadual">
    <p className="eyebrow">Sala de Situação</p><h3>{situationThemes.find(([id])=>id===theme)[1]}</h3>
    <p>{dimension?.note || 'Avisos oficiais confirmados têm destaque. Os demais fatores são apresentados juntos, sem nota final de risco.'}</p>
    <strong>{model.total} municípios na malha</strong>
    <p>{model.municipalities.filter(row=>theme==='integrated'?row.coverage>0:row.indicators[theme].value!==null).length} com dado territorial disponível neste tema. Sem dado não significa sem ocorrência.</p>
    <h4>Municípios para acompanhamento</h4>
    {theme==='integrated'&&<small>Agrupados por fator e nome; não há comparação entre unidades diferentes.</small>}
    {!rows.length?<p role="status">Sem destaques calculáveis com os dados disponíveis.</p>:<ul className="situation-ranking">{rows.slice(0,limit).map(row=><li key={row.code}><button type="button" onClick={()=>onSelect(row.feature)}><strong>{row.name}</strong><span>{theme==='integrated'?row.factor:row.indicators[theme].display}</span>
      {(theme==='integrated'?row.factors:[theme]).map(id=><span className="situation-ranking-detail" key={id}><b>{situationThemes.find(([key])=>key===id)[1]}: {row.indicators[id].display}</b><span>{row.indicators[id].reason}</span><small>{row.indicators[id].source} · {row.indicators[id].period || 'Período não informado'} · {stamp(row.indicators[id])}</small></span>)}
    </button></li>)}</ul>}
    {rows.length>limit&&<button className="situation-more" type="button" onClick={()=>setLimit(value=>value+10)}>Mostrar mais municípios</button>}
    <details><summary>Metodologia e limitações</summary><p>Chuva representa a maior leitura pontual de uma estação no município. Focos são detecções do arquivo INPE, não incêndios confirmados. Rios exigem leituras comparáveis e horário validado. Seca preserva a categoria e referência da fonte. Alertas no mapa exigem códigos municipais confirmados.</p><p>Não há soma, pesos ou índice integrado. Ausência de alerta em uma fonte parcial não confirma ausência de alertas no Estado.</p><a href={`${import.meta.env.BASE_URL}docs/RADAR-SITUACAO.md`} target="_blank" rel="noreferrer">Consultar metodologia completa</a></details>
  </aside>;
}

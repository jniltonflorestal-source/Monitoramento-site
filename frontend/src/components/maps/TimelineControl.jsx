import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Play,Pause} from 'lucide-react';
import '../../timeline.css';

export const timelineTime=time=>Number.isFinite(time)?new Date(time).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):'Horário não confirmado';

export function TimelineControl({frames,title,source,note,onFrame,unit,updatedAt}) {
  const [index,setIndex]=useState(Math.max(0,frames.length-1)),[playing,setPlaying]=useState(false);
  const callback=useRef(onFrame);callback.current=onFrame;
  const safeIndex=Math.min(index,Math.max(0,frames.length-1)),frame=frames[safeIndex];
  useEffect(()=>{setPlaying(false);setIndex(Math.max(0,frames.length-1));},[frames]);
  useEffect(()=>callback.current?.(frame||null),[frame]);
  useEffect(()=>{
    const stop=()=>{if(document.hidden)setPlaying(false);};
    document.addEventListener('visibilitychange',stop);
    return ()=>document.removeEventListener('visibilitychange',stop);
  },[]);
  useEffect(()=>{
    if(!playing||frames.length<2)return;
    const timer=setInterval(()=>setIndex(value=>Math.min(value+1,frames.length-1)),1500);
    return ()=>clearInterval(timer);
  },[playing,frames.length]);
  useEffect(()=>{if(playing&&safeIndex===frames.length-1)setPlaying(false);},[playing,safeIndex,frames.length]);
  const move=position=>{setPlaying(false);setIndex(position);};
  const play=()=>{if(playing)setPlaying(false);else{if(safeIndex===frames.length-1)setIndex(0);setPlaying(true);}};
  return <section className="context-timeline" aria-label={title}>
    <div className="timeline-heading"><strong>{title}</strong><span>{frame?timelineTime(frame.time):'Sem instantes válidos'}</span></div>
    <div className="timeline-controls">
      <button type="button" title="Instante anterior" aria-label="Instante anterior" disabled={!frame||safeIndex===0} onClick={()=>move(safeIndex-1)}><ChevronLeft aria-hidden="true"/></button>
      <button type="button" title={playing?'Pausar evolução':'Reproduzir evolução'} aria-label={playing?'Pausar evolução':'Reproduzir evolução'} aria-pressed={playing} disabled={frames.length<2} onClick={play}>{playing?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}</button>
      <input type="range" aria-label={`Instante de ${title}`} aria-valuetext={frame?`${timelineTime(frame.time)}; ${frame.value} ${unit}`:'Sem instantes válidos'} min="0" max={Math.max(1,frames.length-1)} value={safeIndex} disabled={frames.length<2} onChange={event=>move(Number(event.target.value))}/>
      <button type="button" title="Próximo instante" aria-label="Próximo instante" disabled={!frame||safeIndex===frames.length-1} onClick={()=>move(safeIndex+1)}><ChevronRight aria-hidden="true"/></button>
    </div>
    <p className="timeline-reading">{frame?<><b>{frame.value.toLocaleString('pt-BR',{maximumFractionDigits:2})} {unit}</b><span> · instante {safeIndex+1} de {frames.length}</span></>:'Dados insuficientes para evolução temporal.'}</p>
    {frames.length===1&&<small>Há apenas uma leitura. Reprodução indisponível.</small>}
    <small>{source}{updatedAt?` · Atualização: ${updatedAt}`:''}</small><small>{note}</small>
  </section>;
}

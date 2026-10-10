import {useEffect,useMemo,useRef,useState} from 'react';
import {buildFireTimeline} from '../../services/timeline.js';
import {TimelineControl,timelineTime} from './TimelineControl';

export function FireTimeline({points,filters,boundary,history,onSelection}) {
  const [open,setOpen]=useState(false),[frame,setFrame]=useState(null);
  const callback=useRef(onSelection);callback.current=onSelection;
  const model=useMemo(()=>open?buildFireTimeline(points,{...filters,boundary,coverageStart:history?.coverageStart,coverageEnd:history?.coverageEnd,status:history?.status,missingDates:history?.missingDates}):{frames:[]},[open,points,filters,boundary,history]);
  useEffect(()=>{callback.current(open&&frame&&model.frames.includes(frame)?{model,time:frame.time}:null);},[open,frame,model]);
  useEffect(()=>()=>callback.current(null),[]);
  return <details className="fire-timeline" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>Linha do tempo dos focos de calor</summary>
    {open&&<TimelineControl frames={model.frames} title="Evolução dos focos" source="INPE Queimadas" unit="detecções carregadas" onFrame={setFrame}
      updatedAt={history?.updatedAt?timelineTime(Date.parse(history.updatedAt)):null}
      note={`${model.historical?'Arquivo histórico. ':''}Janela do arquivo: ${timelineTime(model.start)} a ${timelineTime(model.end)}. ${model.complete?'Cobertura declarada do arquivo disponível.':'Cobertura parcial ou não confirmada; não representa total completo do período.'} Pontos acumulados até o instante selecionado. Focos não equivalem a incêndios confirmados ou área queimada.`}/>} 
  </details>;
}

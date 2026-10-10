import {useEffect,useMemo,useRef,useState} from 'react';
import {Monitor,LogOut,Play,Pause,CloudRain,Waves,Flame,Sun,MapPinned,BellRing} from 'lucide-react';
import {buildStateDashboard,indicatorTime} from '../../services/stateDashboard.js';
import {nextOperationalTheme,operationalThemes,rotationDelay,operationalHealth} from '../../services/operationalMode.js';
import '../../operational-mode.css';

const icons={state:MapPinned,rivers:Waves,rain:CloudRain,fire:Flame,drought:Sun};
export function OperationalMode({enabled,onToggle,onSelect,activeLayer,snapshot={},refreshing=false}) {
  const [playing,setPlaying]=useState(false),[seconds,setSeconds]=useState(30),[visible,setVisible]=useState(!document.hidden);
  const root=useRef(null),exitButton=useRef(null),callbacks=useRef({onToggle,onSelect,activeLayer});
  callbacks.current={onToggle,onSelect,activeLayer};
  const dashboard=useMemo(()=>buildStateDashboard(snapshot),[snapshot]);
  const health=useMemo(()=>operationalHealth(snapshot),[snapshot]);
  const alerts=dashboard.cards.find(card=>card.id==='alerts');
  useEffect(()=>{
    const visibility=()=>setVisible(!document.hidden);
    document.addEventListener('visibilitychange',visibility);
    return ()=>document.removeEventListener('visibilitychange',visibility);
  },[]);
  useEffect(()=>{
    if(!enabled){setPlaying(false);return;}
    const section=root.current.closest('.map-section');
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    // Keep keyboard navigation within the operational workspace without cloning it.
    const siblings=[];
    for(let child=section;child?.parentElement&&child!==document.body;child=child.parentElement) {
      for(const sibling of child.parentElement.children)if(sibling!==child&&sibling instanceof HTMLElement){siblings.push([sibling,sibling.inert]);sibling.inert=true;}
    }
    exitButton.current?.focus();
    const escape=event=>{if(event.key==='Escape'){event.preventDefault();callbacks.current.onToggle();}};
    const interaction=event=>{if(!event.target.closest('.operational-toolbar'))setPlaying(false);};
    document.addEventListener('keydown',escape);
    section.addEventListener('pointerdown',interaction);
    section.addEventListener('keydown',interaction);
    return ()=>{
      document.body.style.overflow=oldOverflow;
      siblings.forEach(([element,inert])=>element.inert=inert);
      document.removeEventListener('keydown',escape);
      section.removeEventListener('pointerdown',interaction);
      section.removeEventListener('keydown',interaction);
      queueMicrotask(()=>section.querySelector('.operational-entry button')?.focus({preventScroll:true}));
    };
  },[enabled]);
  useEffect(()=>{
    if(!enabled||!playing||!visible)return;
    const timer=setInterval(()=>callbacks.current.onSelect(nextOperationalTheme(callbacks.current.activeLayer),true),rotationDelay(seconds));
    return ()=>clearInterval(timer);
  },[enabled,playing,seconds,visible]);
  const select=theme=>{setPlaying(false);onSelect(theme,false);};
  if(!enabled)return <div ref={root} className="operational-entry"><button type="button" onClick={onToggle}><Monitor size={20} aria-hidden="true"/>Modo Operacional</button></div>;
  return <div ref={root} className="operational-console">
    <header className="operational-toolbar">
      <div className="operational-brand"><Monitor aria-hidden="true"/><div><strong>Defesa Civil do Tocantins</strong><span>Sala de Situação Estadual</span></div></div>
      <div className="operational-rotation"><button type="button" aria-pressed={playing} onClick={()=>setPlaying(value=>!value)}>{playing?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}{playing?'Pausar rotação':'Iniciar rotação'}</button><label>Intervalo<select aria-label="Intervalo da rotação" value={seconds} onChange={e=>setSeconds(Number(e.target.value))}><option value={15}>15 segundos</option><option value={30}>30 segundos</option><option value={60}>60 segundos</option></select></label><span role="status">{playing?(visible?'Rotação ativa':'Pausada: aba oculta'):'Rotação desligada'}</span></div>
      <button ref={exitButton} type="button" onClick={onToggle}><LogOut aria-hidden="true"/>Modo Público</button>
    </header>
    <div className="operational-status"><span>{refreshing?'Atualizando consulta…':`Última consulta: ${indicatorTime({observedAt:snapshot.attemptedAt})}`}</span><details><summary>Fontes: {health.available}/{health.total} disponíveis</summary><ul>{health.rows.map(row=><li key={row.key}><strong>{row.label}</strong><span>{row.status}</span><small>{row.updatedAt || 'Atualização não informada'}</small></li>)}</ul></details><button type="button" onClick={()=>select('alerts')}><BellRing size={18} aria-hidden="true"/>Alertas: {alerts.displayValue} · {alerts.statusLabel}</button></div>
    <nav className="operational-themes" aria-label="Telas operacionais">{operationalThemes.map(([id,label])=>{const Icon=icons[id];return <button type="button" key={id} aria-pressed={activeLayer===id} onClick={()=>select(id)}><Icon aria-hidden="true"/>{label}</button>;})}</nav>
    <div className="operational-indicators">{dashboard.cards.filter(card=>['rain','rivers','fire','drought'].includes(card.id)).map(card=><button key={card.id} type="button" onClick={()=>select(card.id)}><span>{card.title}</span><strong>{card.displayValue}</strong><small>{card.statusLabel} · {card.source}</small><small>{card.stamp}</small></button>)}</div>
  </div>;
}

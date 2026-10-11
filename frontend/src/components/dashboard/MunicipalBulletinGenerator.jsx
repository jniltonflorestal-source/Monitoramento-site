import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {FileDown,Loader2,Printer,X} from 'lucide-react';
import {getAnaStationReading} from '../../services/ana.js';
import {buildMunicipalBulletin} from '../../services/municipalBulletin.js';
import {MunicipalBulletinTemplate} from './MunicipalBulletinTemplate';
import '../../municipal-bulletin.css';

const bounded=(promise,ms,fallback)=>new Promise(resolve=>{const timer=setTimeout(()=>resolve(fallback),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},()=>{clearTimeout(timer);resolve(fallback);});});
export function MunicipalBulletinGenerator({feature,rain,rivers,firePoints,fireHistory,weatherQuery,burnedQuery,snapshot,hours,station}) {
  const [loading,setLoading]=useState(false),[model,setModel]=useState(null),[printReady,setPrintReady]=useState(false),[error,setError]=useState(false);
  const preview=useRef(null),closeButton=useRef(null),trigger=useRef(null),alive=useRef(true);
  const latest=useRef(null);latest.current={feature,rain,rivers,firePoints,fireHistory,weatherQuery,burnedQuery,snapshot,hours};
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
  useEffect(()=>{
    if(!model)return;
    let active=true;const body=document.body,previousOverflow=body.style.overflow,root=preview.current;
    const siblings=[...body.children].filter(element=>element!==preview.current).map(element=>[element,element.inert]);
    siblings.forEach(([element])=>element.inert=true);body.style.overflow='hidden';body.classList.add('municipal-bulletin-open');closeButton.current?.focus();
    const escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setModel(null);}};
    document.addEventListener('keydown',escape);
    (async()=>{await bounded(document.fonts.ready,5000,null);await bounded(Promise.all([...root.querySelectorAll('img')].map(image=>image.decode().catch(()=>{}))),5000,null);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(active){setPrintReady(true);window.print();}})();
    return ()=>{active=false;body.style.overflow=previousOverflow;body.classList.remove('municipal-bulletin-open');siblings.forEach(([element,inert])=>element.inert=inert);document.removeEventListener('keydown',escape);trigger.current?.focus({preventScroll:true});};
  },[model]);
  async function generate() {
    setLoading(true);setError(false);setPrintReady(false);
    try{
      const selectedCode=station?.code;
      const settlePanel=new Promise(resolve=>{const deadline=Date.now()+5000;const check=()=>{const data=latest.current;if(!alive.current||Date.now()>=deadline||(data.weatherQuery?.state!=='loading'&&data.burnedQuery?.state!=='loading'&&data.fireHistory!==null))resolve();else setTimeout(check,100);};check();});
      const [reading]=await Promise.all([selectedCode?bounded(getAnaStationReading(selectedCode,7),12000,null):Promise.resolve(null),settlePanel]);
      const payload=buildMunicipalBulletin({...latest.current,selectedCode,riverReadings:reading?{[selectedCode]:reading}:{}});
      if(alive.current)setModel(payload);
    }catch{if(alive.current)setError(true);}finally{if(alive.current)setLoading(false);}
  }
  return <div className="municipal-bulletin-action"><button type="button" ref={trigger} onClick={generate} disabled={loading}>{loading?<Loader2 aria-hidden="true"/>:<FileDown aria-hidden="true"/>}{loading?'Preparando resumo…':'Gerar Resumo Municipal'}</button>{error&&<p role="status">Não foi possível preparar o documento. Tente novamente.</p>}
    {model&&createPortal(<div className="municipal-bulletin-preview" ref={preview} role="dialog" aria-modal="true" aria-label={`Resumo municipal de ${model.name}`}>
      <nav className="municipal-document-toolbar"><strong>Resumo Municipal · {model.name}</strong><button type="button" disabled={!printReady} onClick={()=>window.print()}><Printer aria-hidden="true"/>{printReady?'Imprimir / Salvar PDF':'Preparando impressão…'}</button><button type="button" ref={closeButton} onClick={()=>setModel(null)}><X aria-hidden="true"/>Voltar ao mapa</button></nav>
      <MunicipalBulletinTemplate model={model}/>
    </div>,document.body)}
  </div>;
}

import { Children, useEffect, useId, useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import '../../map-workspace.css';

export function MapWorkspace({children,selectionKey,enabled=true}) {
  const [collapsed,setCollapsed]=useState(false),[width,setWidth]=useState(360);
  const panelId=useId();
  useEffect(()=>setCollapsed(false),[selectionKey]);
  const [map,panel]=Children.toArray(children);
  if(!enabled)return <div className="map-layout">{children}</div>;
  const Icon=collapsed?PanelRightOpen:PanelRightClose;
  return <div className="map-workspace">
    <div className="workspace-toolbar">
      {!collapsed&&<label className="workspace-width">Largura do painel<input aria-label="Largura do painel lateral" type="range" min="300" max="520" step="10" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>}
      <button type="button" aria-controls={panelId} aria-expanded={!collapsed} aria-label={collapsed?'Expandir painel lateral':'Recolher painel lateral'} onClick={()=>setCollapsed(v=>!v)}><Icon aria-hidden="true"/>{collapsed?'Expandir painel':'Recolher painel'}</button>
    </div>
    <div className={`map-layout workspace-grid${collapsed?' panel-collapsed':''}`} style={{'--panel-width':`${width}px`}}>
      {map}<div id={panelId} className="workspace-panel" hidden={collapsed}>{panel}</div>
    </div>
  </div>;
}

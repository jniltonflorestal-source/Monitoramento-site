import {dataHealthRows} from './stateDashboard.js';

export const operationalThemes=[['state','Visão estadual'],['rivers','Hidrologia'],['rain','Chuva'],['fire','Fogo'],['drought','Seca']];
export const rotationDelay=value=>[15,30,60].includes(Number(value))?Number(value)*1000:30000;
export const nextOperationalTheme=current=>operationalThemes[(operationalThemes.findIndex(([id])=>id===current)+1)%operationalThemes.length][0];
export function operationalHealth(snapshot) {
  const rows=dataHealthRows(snapshot).map(row=>{
    const integration=row.key==='idap'||snapshot.rain?.sourceBreakdown?.[row.key.replace('rain-','')]?.status==='integration';
    const status=integration?'sem integração':row.delayed?'desatualizado':row.current?(row.key==='burned'?'atualização periódica':'disponível'):'indisponível';
    return {...row,status,available:!integration&&!row.delayed&&row.current};
  });
  return {rows,available:rows.filter(row=>row.available).length,total:rows.filter(row=>row.status!=='sem integração').length};
}

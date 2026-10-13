import {finiteValue,nonNegativeValue} from '../frontend/src/services/dataQuality.js';

export function selectLatestInpeFile(html,now=Date.now()) {
  const today=new Date(now),day=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());
  const files=[...new Set([...html.matchAll(/focos_diario_br_(\d{8})\.csv/g)].flatMap(match=>{
    const value=match[1],year=Number(value.slice(0,4)),month=Number(value.slice(4,6)),date=Number(value.slice(6,8)),stamp=new Date(Date.UTC(year,month-1,date));
    return stamp.getUTCFullYear()===year&&stamp.getUTCMonth()===month-1&&stamp.getUTCDate()===date&&stamp.getTime()<=day?[match[0]]:[];
  }))].sort();
  if(!files.length)throw new Error('CSV diário válido do INPE não encontrado');
  const name=files.at(-1),value=name.match(/(\d{8})/)?.[1],end=Date.UTC(Number(value.slice(0,4)),Number(value.slice(4,6))-1,Number(value.slice(6,8))+1)-1;
  if(now-Math.min(now,end)>36*3600000)throw new Error('Arquivo diário do INPE antigo; atualização não confirmada');
  return name;
}

export function summarizeRecognitions(records) {
  const federal=new Set(),se=new Set(),ecp=new Set();let unidentified=0,unknown=0;
  for(const record of records){
    const code=String(record.geocodigo||'').trim(),name=String(record.municipio||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const identity=/^17\d{5}$/.test(code)?code:name;
    if(!identity){unidentified++;continue;}
    federal.add(identity);
    const status=String(record.situacao||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    if(/^(estado de calamidade publica(?:\s*\(ECP\))?|ECP)$/i.test(status))ecp.add(identity);
    else if(/^(situacao de emergencia(?:\s*\(SE\))?|SE)$/i.test(status))se.add(identity);
    else unknown++;
  }
  return {federal:unidentified?null:federal.size,se:unidentified||unknown?null:se.size,ecp:unidentified||unknown?null:ecp.size,registros:records.length,classificacao_nao_confirmada:unknown,municipios_nao_identificados:unidentified};
}

export async function collectBurnedProduct(fetcher,api,now=Date.now()) {
  const date=new Date(now),yearLimit=date.getUTCFullYear();
  const yearsResponse=await fetcher(`${api}/statistics/years`);
  if(!yearsResponse.ok)throw new Error(`Anos do Monitor do Fogo indisponíveis (HTTP ${yearsResponse.status})`);
  const years=await yearsResponse.json();
  const validYears=Array.isArray(years)?years.map(finiteValue).filter(value=>Number.isInteger(value)&&value>=1900&&value<=yearLimit):[];
  if(!validYears.length)throw new Error('Ano do Monitor do Fogo não confirmado');
  const year=Math.max(...validYears),monthsResponse=await fetcher(`${api}/statistics/${year}/months`);
  if(!monthsResponse.ok)throw new Error(`Meses do Monitor do Fogo indisponíveis (HTTP ${monthsResponse.status})`);
  const months=await monthsResponse.json(),monthLimit=year===yearLimit?date.getUTCMonth()+1:12;
  const validMonths=Array.isArray(months)?months.map(finiteValue).filter(value=>Number.isInteger(value)&&value>=1&&value<=monthLimit):[];
  if(!validMonths.length)throw new Error('Mês do Monitor do Fogo não confirmado');
  const month=Math.max(...validMonths),query=`year=${year}&monthStart=1&monthEnd=${month}`;
  // Consume each response body within its own deadline, without waiting for raster retries.
  const [hectares,rasterResult]=await Promise.all([
    fetcher(`${api}/statistics/area/state/17/city?${query}`).then(async response=>{
      if(!response.ok)throw new Error(`Área queimada indisponível (HTTP ${response.status})`);
      const area=await response.json(),value=nonNegativeValue(area.areaHa);
      if(value===null)throw new Error('Área queimada sem valor válido');
      return value;
    }),
    fetcher(`${api}/maps/fire/monthly?territoryType=state&territoryCode=17&${query}`).then(async response=>response.ok?response.json():null).catch(()=>null)
  ]);
  const rasterUrl=typeof rasterResult?.url==='string'&&/^https?:\/\//.test(rasterResult.url)?rasterResult.url:null;
  const names=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  return {fonte:'MapBiomas Monitor do Fogo',fonte_url:`${api}/docs/`,ano_referencia:year,mes_final:month,periodo:`Janeiro a ${names[month-1]} de ${year}`,area_queimada_ha:hectares,raster_url:rasterUrl,raster_status:rasterUrl?'ok':'indisponivel',unidade:'ha',natureza:'Cicatrizes de área queimada mapeadas pelo Monitor do Fogo.'};
}

export function applyBurnedProduct(data,product) {
  const hectares=nonNegativeValue(product?.area_queimada_ha);
  if(hectares===null)return;
  data.area_queimada=product;
  data.resumo||={};data.resumo.area_queimada_ano_ha=hectares;
}

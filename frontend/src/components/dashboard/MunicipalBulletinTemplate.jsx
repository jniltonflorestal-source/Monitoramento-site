import {bbox,toMercator} from '@turf/turf';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,ReferenceLine} from 'recharts';
import {bulletinNumber as num,bulletinDate as date} from '../../services/municipalBulletin.js';
import {riverDeltaLabel} from '../../services/hydrologyMetrics.js';

const droughtColors={'Sem seca':'#d7eadf',Fraca:'#f0d15a',Moderada:'#ec9d43',Severa:'#c9564b',Extrema:'#843857',Excepcional:'#572d59'};
function MiniMap({feature,points=[],fill='#e2edf2',label}) {
  const projected=toMercator(feature),bounds=bbox(projected),width=420,height=250,padding=20;
  const scale=Math.min((width-2*padding)/(bounds[2]-bounds[0]||1),(height-2*padding)/(bounds[3]-bounds[1]||1));
  const project=([x,y])=>[(width-(bounds[2]-bounds[0])*scale)/2+(x-bounds[0])*scale,(height-(bounds[3]-bounds[1])*scale)/2+(bounds[3]-y)*scale];
  const polygons=projected.geometry.type==='Polygon'?[projected.geometry.coordinates]:projected.geometry.coordinates;
  const path=polygons.flatMap(polygon=>polygon.map(ring=>ring.map((coordinate,i)=>`${i?'L':'M'}${project(coordinate).join(' ')}`).join(' ')+' Z')).join(' ');
  return <svg className="municipal-document-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <rect width={width} height={height} fill="#f3f7f9"/><path d={path} fill={fill} fillRule="evenodd" stroke="#5b8295" strokeWidth="1.2"/>
    {points.map((point,i)=>{const coords=project(toMercator({type:'Point',coordinates:[Number(point.longitude),Number(point.latitude)]}).coordinates);return <circle key={i} cx={coords[0]} cy={coords[1]} r={4} fill={point.color||'#23759a'} stroke="#fff" strokeWidth="1"/>;})}
    <text x="12" y="238" fontSize="10" fill="#506671">Limite municipal · IBGE / base do portal</text>
  </svg>;
}
function MapBlock({title,feature,points,fill,caption}) {return <figure className="municipal-document-map-block"><h3>{title}</h3><MiniMap feature={feature} points={points} fill={fill} label={title}/><figcaption>{caption}</figcaption></figure>;}
function Table({headers,rows,empty='Dado indisponível para o período.'}) {return rows.length?<table><thead><tr>{headers.map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j}>{value}</td>)}</tr>)}</tbody></table>:<p className="municipal-document-empty">{empty}</p>;}
function Page({model,number,title,children}) {return <section className="municipal-print-page">
  <header className="municipal-document-header"><img src={`${import.meta.env.BASE_URL}assets/logo-centro.png`} alt=""/><div><strong>Defesa Civil do Tocantins</strong><span>Centro de Monitoramento</span><small>Boletim municipal informativo</small></div><b>{model.name}</b></header>
  <div className="municipal-document-title"><span>{String(number).padStart(2,'0')} / 04</span><h2>{title}</h2><small>Gerado em {date(model.generatedAt)} · IBGE {model.code}</small></div>
  <div className="municipal-document-content">{children}</div>
  <footer className="municipal-document-footer"><strong>Emergência: Defesa Civil 199 · Bombeiros 193</strong><span>Documento informativo gerado automaticamente. Não substitui parecer técnico, aviso meteorológico ou alerta oficial de Proteção e Defesa Civil.</span><small>{model.name} · {date(model.generatedAt)} · Página {number} de 4</small></footer>
  </section>;}
function Metric({label,value,reference}) {return <article className="municipal-document-metric"><span>{label}</span><strong>{value}</strong><small>{reference}</small></article>;}

export function MunicipalBulletinTemplate({model}) {
  const rainPoints=model.rain.rows.map(row=>({...row,color:(row.amount??row.chuva24h)>30?'#1c5484':(row.amount??row.chuva24h)>10?'#3f96b7':'#90bccf'}));
  const riverPoints=model.rivers.map(row=>({...row,color:row.analysis.direction==='up'?'#b9443a':row.analysis.direction==='down'?'#29845f':'#718895'}));
  const graph=model.rivers.find(row=>row.analysis.readings.length>1);
  return <article className="municipal-document">
    <Page model={model} number={1} title="Panorama municipal">
      <p className="municipal-document-lead">{model.summary}</p>
      <div className="municipal-document-metrics">
        <Metric label="Chuva observada" value={num(model.rain.maximum,' mm')} reference="Maior leitura pontual · 24h"/>
        <Metric label="Estações de rios" value={num(model.riverCount, ' na base')} reference="Cadastro territorial; leituras na página 2"/>
        <Metric label="Focos de calor" value={num(model.fire.count)} reference={model.fire.historical?'Arquivo histórico; veja página 3':`Janela de ${model.hours===168?'7 dias':model.hours+'h'} do arquivo`}/>
        <Metric label="Área queimada" value={num(model.burned.hectares,' ha')} reference={`MapBiomas · ${model.burned.period||'Período indisponível'}`}/>
        <Metric label="Seca" value={model.drought.category||'Indisponível'} reference={`${model.drought.historical?'Referência histórica · ':''}${model.drought.reference||'Sem referência confirmada'}`}/>
        <Metric label="Avisos municipais" value={num(model.alerts.count)} reference="Somente abrangência territorial confirmada"/>
      </div>
      <MapBlock title={`Território de ${model.name}`} feature={model.feature} caption="A consulta utiliza o limite municipal. Uma medição pontual não representa toda a superfície do município."/>
      <p className="municipal-document-method">Períodos independentes por fonte: chuva observada em 24h, focos na janela do arquivo, área queimada mensal e previsão de modelo. As referências acompanham cada tema.</p>
    </Page>
    <Page model={model} number={2} title="Chuva e situação hidrológica">
      <div className="municipal-document-columns">
        <MapBlock title="Chuva observada — estações" feature={model.feature} points={rainPoints} caption="Azul: estação com leitura válida. Tom mais forte: maior acumulado; não é classificação de risco."/>
        <div><h3>Maior acumulado: {num(model.rain.maximum,' mm / 24h')}</h3><p>{model.rain.registered===null?'Base de estações indisponível nesta consulta.':`${model.rain.rows.length} com leitura recente entre ${model.rain.registered} estações na base territorial.`}</p><Table headers={['Estação / fonte','24h','Atualização']} rows={model.rain.rows.slice(0,3).map(row=>[`${row.name||row.nome||'Estação'} · ${row.fonte||row.source||'Fonte não informada'}`,num(row.amount??row.chuva24h,' mm'),date(row.updatedAt||row.atualizadoEm)])}/><small>Até três maiores leituras. Sem base validada para acumular 48h ou 7 dias.</small></div>
      </div>
      <div className="municipal-document-columns">
        <MapBlock title="Estações hidrológicas" feature={model.feature} points={riverPoints} caption="Vermelho: subida; verde: descida; cinza: sem comparação confirmada. Tendência não indica inundação."/>
        <div><h3>Níveis e tendências · ANA</h3><Table headers={['Estação / rio','Nível','Situação / atualização']} rows={model.rivers.slice(0,2).map(row=>[`${row.name} · ${row.river||'Rio não informado'}`,num(row.level,' cm'),`${row.status} · ${date(row.date)}`])}/><small>{model.rivers.length>2?'Mostradas duas estações; outras permanecem consultáveis no painel. ':''}Cotas no referencial próprio de cada estação.</small></div>
      </div>
      {graph?<div className="municipal-document-chart"><h3>{graph.name} · evolução disponível</h3><ResponsiveContainer width="100%" height={120}><LineChart data={graph.analysis.readings}><XAxis dataKey="time" type="number" domain={['dataMin','dataMax']} tickFormatter={value=>new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})} minTickGap={60}/><YAxis width={50} domain={['auto','auto']}/><Line dataKey="level" type="linear" stroke="#1a7184" dot={false} isAnimationActive={false}/>{(graph.thresholds||[]).filter(row=>row.official===true&&row.unit==='cm'&&Number.isFinite(row.value)).map(row=><ReferenceLine key={row.label} y={row.value} label={row.label} stroke="#b4443c"/>)}</LineChart></ResponsiveContainer><small>{graph.status} · {graph.analysis.quality==='current'?riverDeltaLabel(graph.analysis.delta24):'Tendência atual não confirmada'} · série carregada, sem interpolar medições na análise.</small></div>:<p className="municipal-document-empty">Gráfico hidrológico indisponível: não há série com horários validados.</p>}
    </Page>
    <Page model={model} number={3} title="Fogo, áreas queimadas e seca">
      <h3>{model.fire.historical?'Focos — arquivo histórico':'Focos — registros disponíveis'}</h3>
      <p>{model.fire.points.length?`${model.fire.points.length} detecções carregadas no recorte territorial.`:'Contagem não confirmada; dados insuficientes no recorte.'} {model.fire.complete?'Cobertura declarada do arquivo.':'Cobertura parcial ou não confirmada.'}</p>
      <div className="municipal-document-columns">
        <MapBlock title="Localização das detecções" feature={model.feature} points={model.fire.points.map(row=>({...row,color:'#c44c2f'}))} caption="Laranja: foco detectado por satélite. Foco não representa incêndio distinto ou hectares queimados."/>
        <div><h3>INPE Queimadas</h3><p>Janela: {date(new Date(model.fire.start).toISOString())} a {date(new Date(model.fire.end).toISOString())}.</p><p>Consulta do arquivo: {date(model.fire.updatedAt)}.</p><h3>Área queimada: {num(model.burned.hectares,' ha')}</h3><p>MapBiomas Monitor do Fogo · referência mensal {model.burned.period||'indisponível'}.</p><p>Consulta: {date(model.burned.updatedAt)}.</p><small>Cicatrizes individuais não estão integradas ao documento; não foram gerados polígonos a partir dos focos.</small></div>
      </div>
      <div className="municipal-document-columns">
        <MapBlock title="Categoria municipal de seca" feature={model.feature} fill={droughtColors[model.drought.category]||'#e5eaed'} caption={model.drought.category?`Categoria da fonte: ${model.drought.category}. ${model.drought.historical?'Referência histórica.':''}`:'Cinza: condição municipal não confirmada.'}/>
        <div><h3>{model.drought.category||'Dados de seca indisponíveis'}</h3><p>Referência: {model.drought.reference||'Não informada'}.</p><p>Fonte: {model.drought.source}.</p><p>Atualização: {date(model.drought.date)}.</p><p>A condição monitorada de seca e os registros administrativos de emergência são informações complementares.</p></div>
      </div>
    </Page>
    <Page model={model} number={4} title="Meteorologia, avisos e orientações">
      <h3>Previsão de modelo · Open-Meteo / GFS</h3><p>Ponto representativo do município. Valores previstos, não observação de estação ou média territorial.</p>
      <Table headers={['Temperatura','Umidade','Vento / origem','Rajadas','Chuva 24h / 48h']} rows={[[num(model.weather.temperature,' °C'),num(model.weather.humidity,' %'),`${num(model.weather.wind,' km/h')} / ${num(model.weather.direction,'°')}`,num(model.weather.gust,' km/h'),`${num(model.weather.rain24,' mm')} / ${num(model.weather.rain48,' mm')}`]]}/>
      <small>Válido a partir de {date(model.weather.validAt)} · consulta {date(model.weather.queriedAt)}. Coordenadas: {num(model.weather.latitude)} / {num(model.weather.longitude)}. Open-Meteo / GFS, CC BY 4.0.</small>
      <h3>Avisos com abrangência municipal confirmada</h3><p>{model.alerts.note}</p>
      <Table headers={['Fenômeno / órgão','Severidade','Vigência / orientação']} rows={model.alerts.rows.slice(0,4).map(row=>[`${row.title} · ${row.issuer||'Órgão não informado'}`,row.severity||'Consultar emissor',`${row.period||'Consultar emissor'} · ${row.recommendation||'Acompanhe os canais oficiais.'}`])}/><small>Consulta: {date(model.alerts.date)}. {model.alerts.rows.length>4?'Exibidos quatro avisos; consulte os demais no portal.':''}</small>
      <h3>Recomendações à população</h3><ul><li>Evite atravessar áreas alagadas, enxurradas e passagens molhadas.</li><li>Ao observar fumaça ou chamas em vegetação, acione 193.</li><li>Acompanhe os comunicados e siga as orientações da Defesa Civil.</li></ul>
      <h3>Fontes e limites da consulta</h3><p>Chuva: fontes indicadas na tabela de estações. Rios: ANA / Telemetria. Focos: INPE Queimadas. Área queimada: MapBiomas Monitor do Fogo. Seca: fonte indicada na página 3. Previsão: Open-Meteo / GFS. Avisos: órgãos emissores dos registros confirmados.</p>
      <p className="municipal-document-method">Ausência de medição não significa zero nem ausência de risco. Séries antigas e horários não confirmados são identificados. A consulta não produz classificação oficial de risco ou ato administrativo. Confirme avisos e orientações nos canais oficiais emissores.</p>
    </Page>
  </article>;
}


(function(){
  'use strict';
  var estado={dados:null,mapa:null,malha:null,camadas:{},selecionado:'',carregando:false,malhaPendente:false,proximaAtualizacao:0};
  var cores={critica:'#b42318',alta:'#c45508',moderada:'#8a6500',controlada:'#16724a',cinza:'#687684'};
  var nf=new Intl.NumberFormat('pt-BR');
  function el(id){return document.getElementById(id);}
  function texto(id,value){el(id).textContent=value;}
  function no(tag,conteudo,classe){var n=document.createElement(tag);if(conteudo!==undefined)n.textContent=conteudo;if(classe)n.className=classe;return n;}
  function numero(value){return value===null||value===undefined?'NI':nf.format(value);}
  function data(value,comHora){if(!value)return 'Não informada';var d=new Date(value.length===10?value+'T12:00:00Z':value);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',comHora?{dateStyle:'short',timeStyle:'short'}:{dateStyle:'short',timeZone:'UTC'}):'Não informada';}
  function backend(){return typeof google!=='undefined'&&google.script&&google.script.run;}
  function mensagem(msg,erro){var aviso=el('aviso-conexao');aviso.hidden=!msg;aviso.textContent=msg;aviso.classList.toggle('erro',!!erro);}
  function elegibilidade(){return estado.dados&&estado.dados.configPublica.validacaoTecnicaObrigatoria===false?'consistente':'validada';}
  function atualizar(){
    if(estado.carregando||!backend())return;
    estado.carregando=true;el('atualizar').disabled=true;texto('conexao','Atualizando levantamento…');
    google.script.run.withSuccessHandler(function(dados){
      estado.carregando=false;estado.dados=dados;estado.proximaAtualizacao=Date.now()+60000;
      el('ponto-conexao').className='ponto online';texto('conexao','Conectado ao levantamento');
      texto('ultima-atualizacao','Atualizado em '+data(dados.geradoEm,true)+' · automático a cada 60 s');
      mensagem('');['atualizar','exportar-csv','exportar-pdf'].forEach(function(id){el(id).disabled=false;});
      preencherIndicadores();preencherSeletor();filtrar();desenharGrafico();carregarMalha();
    }).withFailureHandler(function(){
      estado.carregando=false;el('atualizar').disabled=false;estado.proximaAtualizacao=Date.now()+60000;
      el('ponto-conexao').className='ponto erro';texto('conexao','Não foi possível atualizar');
      mensagem('Não foi possível consultar o levantamento. Tente novamente em instantes. Os dados anteriores, quando disponíveis, conservam o horário exibido.',true);
    }).obterDadosDashboard();
  }
  function preencherIndicadores(){
    var i=estado.dados.indicadores;
    texto('rotulo-respondentes','Com resposta '+elegibilidade());
    texto('serie-respondentes','Municípios com resposta '+elegibilidade());
    el('indicadores-kpis').setAttribute('aria-label','Indicadores estaduais de respostas atuais '+(elegibilidade()==='validada'?'validadas':'consistentes'));
    texto('regra-elegibilidade',elegibilidade()==='validada'?'Respostas vencidas, sem validação ou sem informação suficiente ficam em cinza e não entram nos agregados.':'Respostas vencidas, rejeitadas ou sem informação suficiente ficam em cinza e não entram nos agregados. O modo de coleta permite respostas consistentes pendentes de validação.');
    el('filtro-prioridade').querySelector('option[value="cinza"]').textContent='Sem informação atual '+elegibilidade();
    texto('rotulo-pendentes','Sem resposta '+elegibilidade()+' elegível');
    texto('kpi-pendentes',numero(i.pendentes));
    texto('kpi-total',numero(i.totalMunicipios));texto('kpi-respondentes',numero(i.respondentes));texto('kpi-afetados',numero(i.afetados));
    texto('cobertura-respostas',numero(i.atuais)+' atuais · '+numero(i.desatualizados)+' desatualizadas');
    texto('base-afetados','Informado por '+i.categorias.q07.cobertura+' de '+i.atuais+' municípios atuais');
    var c=i.campos.q16;texto('kpi-sem-atendimento',numero(c.total));texto('cobertura-sem-atendimento','Informado por '+c.cobertura+' de '+c.totalElegiveis+' municípios atuais');
    ['q13','q12','q23','q31','q38','q14','frotaTotal'].forEach(function(id){var c=i.campos[id];texto('valor-'+id,numero(c.total));texto('cobertura-'+id,c.cobertura+' de '+c.totalElegiveis+' municípios atuais informaram');});
    ['q43','q45'].forEach(function(id){var c=i.categorias[id];texto('valor-'+id,numero(c.total));texto('cobertura-'+id,c.cobertura+' de '+c.totalElegiveis+' municípios atuais informaram');});
    texto('resumo-validacao',numero(i.recebidos)+' municípios com envio recebido · '+numero(i.aguardandoValidacao)+' com último envio aguardando validação · '+numero(i.desatualizados)+' com resposta desatualizada · '+numero(i.semClassificacao)+' atuais sem informação suficiente para classificação.');
    if(estado.dados.configPublica.validacaoTecnicaObrigatoria===false){mensagem('Modo de coleta: a configuração permite respostas consistentes ainda pendentes de validação técnica. A prioridade permanece preliminar.',false);texto('aviso-metodologia','Classificação preliminar de prioridade. Modo de coleta: as respostas consistentes podem estar pendentes de validação técnica. Não representa classificação oficial de intensidade de desastre. NI significa informação não levantada; zero indica ausência informada.');}
  }
  function normalizar(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function municipiosFiltrados(){if(!estado.dados)return [];var busca=normalizar(el('busca').value.trim()),prioridade=el('filtro-prioridade').value;return estado.dados.municipios.filter(function(m){return (!busca||normalizar(m.nome+' '+m.codigo).includes(busca))&&(prioridade==='todas'||m.prioridade.nivel===prioridade);});}
  function preencherSeletor(){
    var select=el('seletor-municipio');select.replaceChildren(no('option','Selecione um município'));select.firstChild.value='';
    estado.dados.municipios.forEach(function(m){var option=no('option',m.nome);option.value=m.codigo;select.appendChild(option);});
    select.value=estado.selecionado;
  }
  function etiqueta(m){var badge=no('span',undefined,'pill');var ponto=no('i');ponto.style.backgroundColor=cores[m.prioridade.nivel]||cores.cinza;badge.append(ponto,document.createTextNode(m.prioridade.rotulo));return badge;}
  function filtrar(){
    if(!estado.dados)return;
    var municipios=municipiosFiltrados(),body=el('lista-municipios');body.replaceChildren();
    texto('contagem-filtro',municipios.length+' de '+estado.dados.municipios.length+' municípios');
    if(!municipios.length){var row=no('tr'),cell=no('td','Nenhum município corresponde aos filtros.','tabela-vazia');cell.colSpan=7;row.appendChild(cell);body.appendChild(row);}
    municipios.forEach(function(m){
      var row=no('tr');row.dataset.codigo=m.codigo;row.classList.toggle('selecionada',m.codigo===estado.selecionado);
      var cell=no('td'),button=no('button',m.nome);button.type='button';button.setAttribute('aria-label','Consultar '+m.nome);button.addEventListener('click',function(){selecionar(m.codigo,false);});cell.append(button,no('small','IBGE '+m.codigo));row.appendChild(cell);
      cell=no('td');cell.appendChild(etiqueta(m));row.appendChild(cell);row.appendChild(no('td',m.referencia?data(m.referencia):'Sem resposta '+elegibilidade()));
      ['q13','q16','q23','q31'].forEach(function(id){row.appendChild(no('td',numero(m.q[id]),'numero'));});body.appendChild(row);
    });
    atualizarCamadas();mostrarDetalhe();
  }
  function selecionar(codigo,ajustarMapa){
    estado.selecionado=codigo;el('seletor-municipio').value=codigo;filtrar();
    if(ajustarMapa&&estado.camadas[codigo])estado.mapa.fitBounds(estado.camadas[codigo].getBounds(),{padding:[35,35],maxZoom:10});
  }
  function mostrarDetalhe(){
    if(!estado.dados)return;
    if(!estado.selecionado){var vazio=el('detalhe-municipio');vazio.className='vazio-detalhe';vazio.replaceChildren(no('span','◎'),no('h4','Acompanhe cada município'),no('p','Selecione no mapa ou na lista para consultar a situação, os quantitativos e as categorias de apoio.'));return;}
    var m=estado.dados.municipios.find(function(m){return m.codigo===estado.selecionado;});if(!m)return;
    var container=el('detalhe-municipio');container.className='municipio-detalhe';container.replaceChildren();
    var head=no('div',undefined,'municipio-cabecalho');head.append(no('p','IBGE '+m.codigo,'codigo-ibge'),no('h4',m.nome),etiqueta(m),no('p','Referência: '+data(m.referencia)+' · Recebido: '+data(m.recebidoEm,true),'referencia'));container.appendChild(head);
    if(m.prioridade.nivel==='cinza')container.appendChild(no('p','Sem informação atual elegível para agregação. Quantitativos abaixo, quando existentes, correspondem à referência exibida.','detalhe-aviso'));
    var dl=no('dl',undefined,'municipio-quantitativos');[['Famílias afetadas','q13'],['Sem atendimento','q16'],['Pipas operacionais','q23'],['Déficit de pipas','q31']].forEach(function(item){var div=no('div');div.append(no('dt',item[0]),no('dd',numero(m.q[item[1]])));dl.appendChild(div);});container.appendChild(dl);
    var apoio=no('div',undefined,'apoio');apoio.append(no('h5','Situação do abastecimento'),no('p',m.q.q08||'Não informada'),no('h5','Recursos de apoio solicitados'),no('p',Array.isArray(m.q.q46)&&m.q.q46.length?m.q.q46.join(' '):'Não informados'),no('h5','Prazo de apoio'),no('p',m.q.q47||'Não informado'));container.appendChild(apoio);
  }
  function carregarMalha(){
    if(estado.malha||estado.malhaPendente||!backend())return;
    estado.malhaPendente=true;
    if(typeof L==='undefined'){texto('mapa-vazio','Não foi possível carregar a biblioteca do mapa. Consulte a lista acessível de municípios.');estado.malhaPendente=false;return;}
    google.script.run.withSuccessHandler(function(malha){estado.malhaPendente=false;estado.malha=malha;iniciarMapa();}).withFailureHandler(function(){estado.malhaPendente=false;texto('mapa-vazio','A malha oficial do IBGE está indisponível. A lista de municípios permanece disponível. Use Atualizar para tentar novamente.');}).obterMalhaMunicipal();
  }
  function iniciarMapa(){
    el('mapa').replaceChildren();estado.mapa=L.map('mapa',{scrollWheelZoom:false,keyboard:true,preferCanvas:false});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(estado.mapa);
    var geo=L.geoJSON(estado.malha,{style:function(){return {color:'#ffffff',weight:1,fillColor:cores.cinza,fillOpacity:.76};},onEachFeature:function(feature,layer){
      var codigo=String(feature.properties.codarea);estado.camadas[codigo]=layer;
      layer.on('click',function(){if(municipiosFiltrados().some(function(m){return m.codigo===codigo;}))selecionar(codigo,false);});
      layer.on('add',function(){var path=layer.getElement();var municipio=estado.dados.municipios.find(function(m){return m.codigo===codigo;});if(path&&municipio){path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label','Consultar '+municipio.nome);path.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();selecionar(codigo,false);}});}});
      var municipio=estado.dados.municipios.find(function(m){return m.codigo===codigo;});var tooltip=no('span',municipio?municipio.nome:'Município '+codigo);layer.bindTooltip(tooltip,{sticky:true});
    }}).addTo(estado.mapa);
    estado.mapa.fitBounds(geo.getBounds(),{padding:[18,18]});estado.mapa.attributionControl.addAttribution('Malha municipal: <a href="https://www.ibge.gov.br/">IBGE</a>');atualizarCamadas();
  }
  function atualizarCamadas(){
    if(!estado.mapa||!estado.dados)return;var visiveis={};municipiosFiltrados().forEach(function(m){visiveis[m.codigo]=true;});
    estado.dados.municipios.forEach(function(m){var layer=estado.camadas[m.codigo];if(!layer)return;var selecionado=m.codigo===estado.selecionado;layer.setStyle({fillColor:cores[m.prioridade.nivel]||cores.cinza,fillOpacity:visiveis[m.codigo] ? .8 : .06,color:selecionado?'#112e49':'#ffffff',weight:selecionado?3:.8,opacity:visiveis[m.codigo]?1:.2});var path=layer.getElement();if(path){path.setAttribute('tabindex',visiveis[m.codigo]?'0':'-1');path.setAttribute('aria-hidden',visiveis[m.codigo]?'false':'true');}if(selecionado)layer.bringToFront();});
  }
  function svgNo(tag,attrs,content){var n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs).forEach(function(key){n.setAttribute(key,attrs[key]);});if(content!==undefined)n.textContent=content;return n;}
  function desenharGrafico(){
    if(!estado.dados)return;var key=el('metrica-serie').value,serie=estado.dados.serie,quantitativo=key.charAt(0)==='q';
    var pontos=serie.map(function(p){return {mes:p.mes,valor:quantitativo?p.campos[key].total:p[key],cobertura:quantitativo?p.campos[key].cobertura:p.atuais,base:quantitativo?p.campos[key].totalElegiveis:estado.dados.indicadores.totalMunicipios};});
    var container=el('grafico'),tabela=el('tabela-serie');container.replaceChildren();tabela.replaceChildren();
    pontos.forEach(function(p){var row=no('tr');row.append(no('td',p.mes),no('td',numero(p.valor)),no('td',p.cobertura+'/'+p.base));tabela.appendChild(row);});
    if(!pontos.some(function(p){return p.valor!==null;})){container.appendChild(no('p','Sem quantitativos informados para este indicador. Consulte a cobertura na tabela.'));return;}
    var largura=760,altura=185,left=45,right=12,top=15,bottom=32,plotW=largura-left-right,plotH=altura-top-bottom;
    var max=Math.max.apply(null,pontos.map(function(p){return p.valor||0;}));max=max||1;
    var svg=svgNo('svg',{viewBox:'0 0 '+largura+' '+altura,role:'img','aria-label':'Evolução de '+el('metrica-serie').selectedOptions[0].textContent+'. Dados acessíveis na tabela abaixo.'});
    for(var n=0;n<=3;n++){var y=top+plotH*n/3;svg.append(svgNo('line',{x1:left,y1:y,x2:largura-right,y2:y,stroke:'#e3eaf0','stroke-dasharray':'3 4'}),svgNo('text',{x:left-8,y:y+3,'text-anchor':'end',fill:'#72889b','font-size':'9'},numero(Math.round(max*(1-n/3)))));}
    var caminho='';pontos.forEach(function(p,index){var x=left+index*plotW/Math.max(pontos.length-1,1);if(p.valor===null){caminho+=' ';return;}var y=top+plotH-(p.valor/max)*plotH;var anterior=index>0&&pontos[index-1].valor!==null;caminho+=(anterior?' L':' M')+x+' '+y;});
    svg.appendChild(svgNo('path',{d:caminho,fill:'none',stroke:'#c4661b','stroke-width':'2.5','stroke-linecap':'round','stroke-linejoin':'round'}));
    pontos.forEach(function(p,index){var x=left+index*plotW/Math.max(pontos.length-1,1),y=top+plotH-(Number(p.valor)/max)*plotH;if(p.valor!==null){var circle=svgNo('circle',{cx:x,cy:y,r:3.5,fill:'#fff',stroke:'#c4661b','stroke-width':2});circle.appendChild(svgNo('title',{},p.mes+': '+numero(p.valor)+'; cobertura '+p.cobertura+'/'+p.base));svg.appendChild(circle);}svg.appendChild(svgNo('text',{x:x,y:altura-9,'text-anchor':'middle',fill:'#71879a','font-size':'9'},p.mes.slice(5)+'/'+p.mes.slice(2,4)));});container.appendChild(svg);
  }
  function baixar(tipo){
    if(tipo==='pdf'){try{window.PainelPublico.imprimir();mensagem('O relatório abriu em outra janela. Use Imprimir / Salvar como PDF nessa janela.',false);}catch(erro){mensagem(erro.message,true);}return;}
    if(!backend()||!estado.dados)return;var botao=el(tipo==='csv'?'exportar-csv':'exportar-pdf');botao.disabled=true;
    var runner=google.script.run.withSuccessHandler(function(arquivo){botao.disabled=false;var blob;if(arquivo.base64){var raw=atob(arquivo.base64),bytes=new Uint8Array(raw.length);for(var n=0;n<raw.length;n++)bytes[n]=raw.charCodeAt(n);blob=new Blob([bytes],{type:arquivo.mimeType});}else blob=new Blob([arquivo.conteudo],{type:arquivo.mimeType});var url=URL.createObjectURL(blob),link=no('a');link.href=url;link.download=arquivo.nome;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);}).withFailureHandler(function(){botao.disabled=false;mensagem('Não foi possível gerar o arquivo. Tente novamente em instantes.',true);});
    runner.exportarCSV();
  }
  el('busca').addEventListener('input',filtrar);el('filtro-prioridade').addEventListener('change',filtrar);el('limpar-filtros').addEventListener('click',function(){el('busca').value='';el('filtro-prioridade').value='todas';filtrar();});
  el('seletor-municipio').addEventListener('change',function(){selecionar(this.value,true);});el('metrica-serie').addEventListener('change',desenharGrafico);el('atualizar').addEventListener('click',atualizar);el('exportar-csv').addEventListener('click',function(){baixar('csv');});el('exportar-pdf').addEventListener('click',function(){baixar('pdf');});
  if(backend()){atualizar();setInterval(function(){if(document.visibilityState==='visible'&&Date.now()>=estado.proximaAtualizacao)atualizar();},1000);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&Date.now()>=estado.proximaAtualizacao)atualizar();});}
  else{texto('conexao','Implantação necessária');texto('ultima-atualizacao','Prévia visual · nenhuma fonte de dados conectada');mensagem('Não foi possível iniciar a consulta pública. Atualize a página ou tente novamente em instantes.',false);texto('mapa-vazio','A malha e as prioridades serão consultadas após a implantação autorizada do Apps Script.');texto('lista-municipios','');var row=no('tr'),cell=no('td','Sem dados conectados. Implante o aplicativo para consultar o levantamento.','tabela-vazia');cell.colSpan=7;row.appendChild(cell);el('lista-municipios').appendChild(row);}
})();

(function(root,factory){
  'use strict';
  var api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){root.PainelPublico=api;root.google={script:{run:api.runner()}};}
})(typeof window!=='undefined'?window:null,function(root){
  'use strict';
  var ultimo=null;
  var ids=['q12','q13','q14','q15','q16','q20','q21','q22','q23','q24','q25','q26','q27','q31','q37','q38','q39','q40','q07','q08','q09','q11','q18','q19','q28','q29','q30','q32','q33','q34','q35','q36','q41','q42','q43','q44','q45','q46','q47','q48'];
  function endpointValido(valor){var url=new URL(valor);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!/^\/(?:a\/macros\/[^/]+\/s|macros\/s)\/[^/]+\/exec$/.test(url.pathname))throw new Error('Endpoint público inválido.');return url;}
  function validarDados(d){
    if(!d||!Number.isFinite(Date.parse(d.geradoEm))||!d.configPublica||d.configPublica.validacaoTecnicaObrigatoria!==true||!Array.isArray(d.municipios)||d.municipios.length!==139||!d.indicadores||!d.indicadores.campos||!d.indicadores.categorias||!Array.isArray(d.serie))throw new Error('A fonte pública retornou dados incompatíveis.');
    var vistos=new Set();d.municipios.forEach(function(m){if(!m||!/^17\d{5}$/.test(String(m.codigo))||vistos.has(String(m.codigo))||typeof m.nome!=='string'||!m.prioridade||!['critica','alta','moderada','controlada','cinza'].includes(m.prioridade.nivel)||!m.q)throw new Error('Catálogo municipal inválido.');vistos.add(String(m.codigo));});
    return d;
  }
  function consultarPublico(){
    var url=endpointValido(root.PAINEL_PUBLICO_CONFIG&&root.PAINEL_PUBLICO_CONFIG.endpoint),controle=new root.AbortController(),expirou=false;
    url.searchParams.set('recurso','publico');url.searchParams.delete('callback');url.searchParams.set('_',Math.floor(Date.now()/60000));
    var timer=root.setTimeout(function(){expirou=true;controle.abort();},30000);
    return root.fetch(url.href,{credentials:'omit',redirect:'follow',cache:'no-store',mode:'cors',signal:controle.signal}).then(function(resposta){
      if(!resposta.ok)throw new Error('Fonte indisponível.');return resposta.json();
    }).then(function(dados){ultimo=validarDados(dados);return ultimo;}).catch(function(){
      throw new Error(expirou?'A consulta ao levantamento excedeu o tempo de espera.':'A fonte pública está temporariamente indisponível. Tente atualizar novamente.');
    }).finally(function(){root.clearTimeout(timer);});
  }
  function csvCelula(valor){var s=valor===null||valor===undefined?'':String(valor);if(/^\s*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function exportarCSV(d){
    var linhas=[['Código IBGE','Município','Referência','Recebido em','Prioridade'].concat(ids)];
    d.municipios.forEach(function(m){linhas.push([m.codigo,m.nome,m.referencia,m.recebidoEm,m.prioridade.rotulo].concat(ids.map(function(id){return Array.isArray(m.q[id])?m.q[id].join(' | '):m.q[id];})));});
    return {nome:'estiagem-tocantins-'+d.geradoEm.slice(0,10)+'.csv',mimeType:'text/csv;charset=utf-8',conteudo:'\uFEFF'+linhas.map(function(l){return l.map(csvCelula).join(';');}).join('\r\n')};
  }
  function escapar(v){return String(v===null||v===undefined?'NI':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function relatorioHtml(d){
    var i=d.indicadores,e=escapar;
    var metricas=[['Famílias afetadas','q13'],['Pessoas afetadas','q14'],['Famílias sem atendimento','q16'],['Caminhões-pipa — frota total','frotaTotal'],['Caminhões operacionais','q23'],['Déficit de caminhões','q31'],['Comunidades afetadas','q12'],['Demanda alimentar (famílias)','q38']];
    var resumo=metricas.map(function(m){var c=i.campos[m[1]];return '<tr><td>'+e(m[0])+'</td><td>'+e(c.total)+'</td><td>'+e(c.cobertura)+'/'+e(c.totalElegiveis)+'</td></tr>';}).join('');
    [['Municípios com escassez hídrica','q07'],['Municípios com decreto vigente','q43'],['Municípios que necessitam de apoio estadual','q45']].forEach(function(m){var c=i.categorias[m[1]];resumo+='<tr><td>'+e(m[0])+'</td><td>'+e(c.total)+'</td><td>'+e(c.cobertura)+'/'+e(c.totalElegiveis)+'</td></tr>';});
    var linhas=d.municipios.map(function(m){return '<tr><td>'+e(m.codigo)+'</td><td>'+e(m.nome)+'</td><td>'+e(m.referencia)+'</td><td>'+e(m.prioridade.rotulo)+'</td><td>'+e(m.q.q13)+'</td><td>'+e(m.q.q16)+'</td><td>'+e(m.q.q23)+'</td><td>'+e(m.q.q31)+'</td></tr>';}).join('');
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de estiagem — Tocantins</title><style>@page{size:A4 landscape;margin:15mm 12mm}body{font:10px Arial,sans-serif;color:#17324d}h1{font-size:20px;margin:0 0 5px}h2{font-size:14px;margin-top:20px}p{line-height:1.5}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{padding:5px;border:1px solid #d5dce3;text-align:left}th{background:#17324d;color:white}tr{break-inside:avoid}thead{display:table-header-group}.aviso{padding:9px;background:#fff1e4;border-left:3px solid #c45508}.rodape{font-size:9px;color:#526375}.imprimir{font:14px Arial;padding:12px;background:#17324d;color:white;border:0;cursor:pointer}@media print{.imprimir{display:none}}</style></head><body><button class="imprimir" onclick="window.print()">Imprimir / Salvar como PDF</button><h1>Monitoramento da Estiagem — Tocantins</h1><p>Defesa Civil Estadual · Centro de Monitoramento<br>Gerado em '+e(d.geradoEm)+' (UTC)</p><p class="aviso">Classificação preliminar de prioridade, sujeita à validação técnica. Não representa classificação oficial de intensidade de desastre.</p><p>Municípios: '+e(i.totalMunicipios)+' · Com resposta validada: '+e(i.respondentes)+' · Atuais: '+e(i.atuais)+' · Desatualizados: '+e(i.desatualizados)+' · Pendentes de resposta validada: '+e(i.pendentes)+' · Aguardando validação: '+e(i.aguardandoValidacao)+'</p><h2>Indicadores agregados de respostas atuais validadas</h2><table><thead><tr><th>Indicador</th><th>Total informado</th><th>Cobertura municipal</th></tr></thead><tbody>'+resumo+'</tbody></table><p class="rodape">NI = não informado; zero é um valor informado. Cobertura = municípios que informaram o campo / municípios com resposta atual validada. Respostas desatualizadas não compõem os agregados. A tabela municipal conserva a referência para consulta histórica.</p><p class="rodape">Fonte: levantamento municipal, após validação técnica. Dados pessoais, localidades em texto livre e documentos comprobatórios foram excluídos deste relatório.</p><h2>Situação municipal</h2><table><thead><tr><th>IBGE</th><th>Município</th><th>Referência</th><th>Prioridade</th><th>Famílias afetadas</th><th>Famílias sem atendimento</th><th>Pipas operacionais</th><th>Déficit</th></tr></thead><tbody>'+linhas+'</tbody></table></body></html>';
  }
  function imprimir(){if(!ultimo)throw new Error('Atualize o levantamento antes de imprimir.');var janela=root.open('','_blank');if(!janela)throw new Error('Permita abrir a janela do relatório para salvar o PDF.');janela.opener=null;janela.document.open();janela.document.write(relatorioHtml(ultimo));janela.document.close();janela.focus();}
  function runner(sucesso,falha){
    function executar(acao){Promise.resolve().then(acao).then(function(r){if(sucesso)sucesso(r);},function(e){if(falha)falha(e);});}
    return {withSuccessHandler:function(fn){return runner(fn,falha);},withFailureHandler:function(fn){return runner(sucesso,fn);},obterDadosDashboard:function(){executar(consultarPublico);},obterMalhaMunicipal:function(){executar(function(){return root.fetch('./municipios.geojson',{cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error('Malha indisponível.');return r.json();}).then(function(m){if(m.type!=='FeatureCollection'||!Array.isArray(m.features)||m.features.length!==139)throw new Error('Malha municipal incompleta.');return m;});});},exportarCSV:function(){executar(function(){if(!ultimo)throw new Error('Nenhum levantamento disponível.');return exportarCSV(ultimo);});}};
  }
  return {endpointValido:endpointValido,validarDados:validarDados,csvCelula:csvCelula,exportarCSV:exportarCSV,relatorioHtml:relatorioHtml,imprimir:imprimir,runner:runner};
});

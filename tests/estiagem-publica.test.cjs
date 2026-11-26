const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../estiagem/public-api.js');
const vm=require('node:vm');
const fs=require('node:fs');
function navegadorFalso(){
 const scripts=[];const timers=[];
 const janela={document:{createElement:()=>({remove(){this.removido=true;}}),head:{appendChild(s){scripts.push(s);}}},PAINEL_PUBLICO_CONFIG:{endpoint:'https://script.google.com/macros/s/ABC/exec'},setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../estiagem/public-api.js'),'utf8'),{window:janela,URL,Promise,Set});
 return {janela,scripts,timers};
}
test('transporte JSONP usa callback seguro e remove recurso após falha de rede',async()=>{
 const {janela,scripts}=navegadorFalso();
 const final=new Promise(resolve=>janela.google.script.run.withFailureHandler(resolve).obterDadosDashboard());
 await Promise.resolve();
 const script=scripts[0],url=new URL(script.src),callback=url.searchParams.get('callback');
 assert.equal(url.searchParams.get('recurso'),'publico');
 assert.match(callback,/^estiagem_[A-Za-z0-9_]{1,64}$/);
 assert.equal(typeof janela[callback],'function');
 script.onerror();
 const erro=await final;
 assert.match(erro.message,/indisponível/);
 assert.equal(script.removido,true);
 assert.equal(janela[callback],undefined);
});
test('transporte JSONP libera a interface após tempo limite',async()=>{
 const {janela,scripts,timers}=navegadorFalso();
 const final=new Promise(resolve=>janela.google.script.run.withFailureHandler(resolve).obterDadosDashboard());
 await Promise.resolve();
 timers[0]();
 const erro=await final;
 assert.match(erro.message,/tempo de espera/);
 assert.equal(scripts[0].removido,true);
});
test('CSV público conserva NI e zero e neutraliza fórmulas',()=>{
  const d={geradoEm:'2026-11-26T12:00:00Z',municipios:[{codigo:'1721000',nome:'=PERIGO',referencia:null,recebidoEm:null,prioridade:{rotulo:'Sem informação'},q:{q13:0,q16:null,q02:'PESSOA_PRIVADA',q46:['Sim.','Apoio']}}]};
  const csv=api.exportarCSV(d).conteudo;
  assert.ok(csv.includes('"\'=PERIGO"'));
  assert.ok(csv.includes('"0"'));
  assert.ok(!csv.includes('PESSOA_PRIVADA'));
  assert.ok(!csv.includes('null'));
  assert.ok(csv.includes('Sim. | Apoio'));
});
test('relatório escapa HTML e inclui todos os municípios sem contato',()=>{
 const campo={total:null,cobertura:0,totalElegiveis:0};
 const d={geradoEm:'2026-11-26T12:00:00Z',municipios:[{codigo:'1700000',nome:'<script>roubo()</script>',referencia:null,prioridade:{rotulo:'Cinza'},q:{q13:0,q02:'PESSOA_PRIVADA'}}],indicadores:{totalMunicipios:139,respondentes:0,atuais:0,desatualizados:0,pendentes:139,aguardandoValidacao:0,campos:Object.fromEntries(['q13','q14','q16','frotaTotal','q23','q31','q12','q38'].map(k=>[k,campo])),categorias:{q07:campo,q43:campo,q45:campo}}};
 const html=api.relatorioHtml(d);
 assert.ok(html.includes('&lt;script&gt;roubo()&lt;/script&gt;'));
 assert.ok(!html.includes('<script>roubo()'));
 assert.ok(!html.includes('PESSOA_PRIVADA'));
 assert.ok(html.includes('NI'));
 assert.ok(html.includes('139'));
 assert.ok(html.includes('Municípios com escassez hídrica'));
 assert.ok(html.includes('Municípios com decreto vigente'));
 assert.ok(html.includes('Municípios que necessitam de apoio estadual'));
});
test('JSONP usa somente endpoint HTTPS oficial do Apps Script',()=>{
 assert.throws(()=>api.endpointValido('javascript:alert(1)'));
 assert.throws(()=>api.endpointValido('https://exemplo.com/exec'));
 assert.equal(api.endpointValido('https://script.google.com/macros/s/ABC/exec').hostname,'script.google.com');
});
test('payload público exige validação técnica e 139 códigos únicos',()=>{
 const d={geradoEm:'2026-11-26T12:00:00Z',configPublica:{validacaoTecnicaObrigatoria:true},municipios:Array.from({length:139},(_,i)=>({codigo:String(1700000+i),nome:'Município',prioridade:{nivel:'cinza'},q:{}})),indicadores:{campos:{},categorias:{}},serie:[]};
 assert.equal(api.validarDados(d),d);
 assert.throws(()=>api.validarDados({...d,configPublica:{validacaoTecnicaObrigatoria:false}}));
 assert.throws(()=>api.validarDados({...d,municipios:d.municipios.slice(1)}));
 assert.throws(()=>api.validarDados({...d,municipios:d.municipios.map(()=>d.municipios[0])}));
});

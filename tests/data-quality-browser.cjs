const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const now = new Date().toISOString();
    const old = '2020-01-01T00:00:00Z';
    const rainStation = { id:'1', codigo:'1', nome:'Estação teste', municipio:'Palmas', latitude:-10.18, longitude:-48.33, chuva24h:500, atualizadoEm:old };
    await page.route('**/dados-monitoramento.json*', route => route.fulfill({ json: {
      atualizado_em:now, erros_atualizacao:{avisos_inmet:'Falha de consulta'},
      resumo:{ alertas_cemaden_to:0, avisos_inmet_to_hoje:0 },
      focos_calor:{ status:'ok', atualizadoEm:old, quantidade24h:987, pontos_24h:[] },
      s2id:{resumo:{ federal:null,se:null,ecp:null }},
      chuva_observada:{ atualizadoEm:old, fontes:{ INMET:{ status:'ready', estacoesCadastradas:1, estacoesComLeitura:1, atualizadoEm:old, estacoes:[rainStation] } } }
    }}));
    await page.route('https://**/*', route => {
      const url = route.request().url();
      if (url.includes('resources.cemaden.gov.br/dados/311_24.json')) return route.fulfill({ contentType:'text/javascript', body:`estacoes(${JSON.stringify([{atualizado:now, estacao:[{uf:'TO',status:0,idtipoestacao:1,codestacao:'1',cidade:'Palmas',nomeestacao:'Teste CEMADEN',acumulado:0,latitude:-10.18,longitude:-48.33}]}])});` });
      if (url.includes('/estacoes/T')) return route.fulfill({ json:[] });
      if (url.includes('HidroInventario')) return route.fulfill({ contentType:'text/xml', body:'<root><Table><Codigo>123</Codigo><Nome>Teste ANA</Nome><Latitude>-10.18</Latitude><Longitude>-48.33</Longitude></Table></root>' });
      return route.abort();
    });
    await page.goto('http://127.0.0.1:4196/Monitoramento-site/', {waitUntil:'domcontentloaded'});
    await page.locator('#qualidade-dados summary').click();
    await page.getByRole('button', {name:'Consultar novamente', exact:true}).waitFor({timeout:50000});
    const health = await page.locator('#qualidade-dados').innerText();
    assert.match(health, /Dados desatualizados/);
    assert.match(health, /Cadastro disponível/);
    assert.match(health, /1 cadastradas; 1 com leitura válida/);
    assert.match(health, /1 cadastradas; 0 com leitura válida; 1 desatualizadas/);
    const cards = await page.locator('.status-card').allTextContents();
    assert(cards.some(text=>/0,0 mm/.test(text)), 'A real zero rainfall reading is retained');
    assert(!cards.some(text=>/987 focos|500,0 mm/.test(text)), 'Old measurements cannot appear as current');
    const river = cards.find(text=>text.includes('Rios monitorados'));
    assert(river.includes('Cadastro') && !river.includes('Normalidade'));
    await page.locator('#qualidade-dados').screenshot({path:'tmp/phase2-health-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
    await page.locator('#qualidade-dados').screenshot({path:'tmp/phase2-health-mobile.png'});
    assert.deepEqual(errors,[], 'No unhandled errors, including JSONP callback');
    console.log('Phase 2 browser: stale data, missing counts, real zero, catalogue, JSONP and mobile passed.');
  } finally { await browser.close(); }
})();

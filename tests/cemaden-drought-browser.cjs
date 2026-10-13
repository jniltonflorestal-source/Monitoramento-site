const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const product=JSON.parse(fs.readFileSync(process.env.QA_DROUGHT_FILE||'tmp/cemaden-drought-official-preview.json','utf8'));
const classes={'Sem seca':'#dceee4',Fraca:'#ffe66d',Moderada:'#f59a23',Severa:'#d73027',Extrema:'#7a1d45',Excepcional:'#4d1630'};
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:1100},serviceWorkers:'block'}),errors=[],date=new Date().toISOString();
    page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>window.print=()=>{});
    if(!process.env.QA_URL){
      await page.route('https://**/*',route=>route.abort());
      await page.route('**/dados-monitoramento.json*',route=>route.fulfill({json:{atualizado_em:date,qualidade_fontes:{seca_iis3:{status:'ok',ultimaTentativa:date,ultimoSucesso:date}},seca:product,resumo:{alertas_cemaden_to:0,avisos_inmet_to_hoje:0}}}));
      await page.route('**/data/river-summary.json*',route=>route.fulfill({json:{status:'error',stations:[]}}));
      await page.route('**/data/fire-history.json*',route=>route.fulfill({json:{status:'error',points:[]}}));
    }
    await page.goto(process.env.QA_URL||'http://127.0.0.1:4196/Monitoramento-site/',{waitUntil:'domcontentloaded'});
    const card=page.locator('[data-indicator="drought"]');
    await card.getByText(product.situacao_geral,{exact:true}).waitFor();
    assert.match(await card.innerText(),/09\/2026/);
    assert.match(await card.innerText(),/88/);
    await card.click();
    await page.locator('.drought-map-summary h4').getByText(product.situacao_geral,{exact:true}).waitFor();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.leaflet-overlay-pane canvas')).some(canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((value,index)=>index%4===3&&value>100)));
    const counts=await page.locator('.leaflet-overlay-pane canvas').evaluateAll((canvases,colors)=>{
      const counts=Object.fromEntries(Object.keys(colors).map(name=>[name,0]));
      const targets=Object.entries(colors).map(([name,color])=>[name,[1,3,5].map(i=>parseInt(color.slice(i,i+2),16))]);
      for(const canvas of canvases){const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<100)continue;for(const [name,rgb] of targets)if(rgb.every((value,j)=>Math.abs(value-pixels[i+j])<3))counts[name]++;}}
      return counts;
    },classes);
    for(const name of Object.keys(classes))if(product.municipios.some(city=>city.classe===name))assert.ok(counts[name]>100,`Nonblank municipal map color ${name}`);
    assert.match(await page.locator('.drought-map-summary').innerText(),/139/);
    assert.equal(await page.locator('.floating-map-legend').getByText('Excepcional',{exact:true}).count(),1);
    await page.locator('.map-workspace').screenshot({path:'tmp/cemaden-drought-map-desktop.png'});
    await page.locator('#municipality-picker').selectOption(product.municipios.find(city=>city.nome==='Dianópolis').codigoIbge);
    await page.locator('.municipal-panel h3').getByText('Dianópolis',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Gerar Resumo Municipal',exact:true}).click();
    await page.getByRole('button',{name:'Imprimir / Salvar PDF',exact:true}).waitFor();
    assert.match(await page.locator('.municipal-document').innerText(),/Moderada/);
    assert.match(await page.locator('.municipal-document').innerText(),/09\/2026|2026-09/);
    assert.doesNotMatch(await page.locator('.municipal-document').innerText(),/Referência histórica/);
    await page.getByRole('button',{name:'Voltar ao mapa',exact:true}).click();
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
    await page.locator('.map-workspace').screenshot({path:'tmp/cemaden-drought-map-mobile.png'});
    assert.deepEqual(errors,[]);
    console.log('CEMADEN drought browser: current card, 139 colored municipalities, official categories, municipality/PDF, mobile and no JS errors passed.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

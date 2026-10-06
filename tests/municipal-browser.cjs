const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(process.env.QA_URL||'http://127.0.0.1:4196/Monitoramento-site/',{waitUntil:'domcontentloaded'});
  await page.locator('#mapa-prioritario').scrollIntoViewIfNeeded();
  const theme=name=>page.locator('.geo-layer-switch').getByRole('button',{name,exact:true});
  assert.equal(await page.locator('.operational-layer-panel').getAttribute('open'),null);
  await theme('Rios').click();assert.equal(await page.locator('.fire-controls').count(),0);
  await theme('Fogo').click();assert.equal(await page.getByRole('button',{name:'Aplicar período'}).count(),0);
  await theme('Chuva').click();assert.equal(await page.locator('.operational-weather-controls').count(),1);
  await page.locator('#municipality-picker option[value="1721000"]').waitFor({state:'attached'});
  assert.equal(await page.locator('#municipality-picker option').count(),140);
  await page.locator('#municipality-picker').selectOption('1721000');
  assert.equal(await page.locator('.municipal-panel h3').innerText(),'Palmas');
  await page.locator('.municipal-period select').selectOption('48');
  assert.equal(await page.locator('.municipal-panel>section').first().getByText('Histórico indisponível',{exact:true}).count(),1);
  await page.locator('.municipal-panel').getByRole('button',{name:'Localizar focos no mapa'}).click();
  assert.equal(await theme('Fogo').getAttribute('aria-pressed'),'true');
  await page.locator('.municipal-panel').getByRole('button',{name:'Fechar painel municipal'}).click();
  assert.equal(await page.locator('.municipal-panel').count(),0);
  await theme('Seca').click();await page.waitForTimeout(1000);
  const map=page.locator('.public-map').first();const box=await map.boundingBox();
  await map.click({position:{x:box.width/2,y:box.height/2}});
  await page.locator('.municipal-panel h3').waitFor();
  console.log('Map click selected:',await page.locator('.municipal-panel h3').innerText());
  await page.locator('#municipality-picker').selectOption('1702109');
  assert.equal(await page.locator('.municipal-panel h3').innerText(),'Araguaína');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  console.log('Context, 139 municipalities, unavailable periods, clicks and mobile passed.');
 } finally {await browser.close()}
})();

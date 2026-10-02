const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();
 await page.route('**/api.open-meteo.com/**',r=>r.abort());
 await page.route('**/api/statistics/**',r=>r.abort());
 await page.route('**/data/fire-history.json*',r=>r.abort());
 await page.goto(process.env.QA_URL||'http://127.0.0.1:4196/Monitoramento-site/',{waitUntil:'domcontentloaded'});
 await page.locator('#mapa-prioritario').scrollIntoViewIfNeeded();
 await page.locator('#municipality-picker option[value="1721000"]').waitFor({state:'attached'});
 await page.locator('#municipality-picker').selectOption('1721000');
 const panel=page.locator('.municipal-panel');
 await panel.getByText('Consulta indisponível',{exact:true}).waitFor();
 await panel.getByText('Não foi possível consultar a previsão no momento.',{exact:true}).waitFor();
 assert.equal(await panel.locator('section').filter({has:page.getByRole('heading',{name:'Focos de calor',exact:true})}).getByText('Histórico indisponível',{exact:true}).count(),1);
 console.log('Unavailable APIs show unavailable values, not fabricated zeroes.');
}finally{await browser.close()}})();

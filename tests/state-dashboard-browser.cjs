const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:process.env.QA_CHANNEL||'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.env.QA_URL||'http://127.0.0.1:4196/Monitoramento-site/',{waitUntil:'domcontentloaded'});
 await page.locator('.geo-layer-switch button').first().waitFor();
 const cards=page.locator('.state-card');
 assert.equal(await cards.count(),8);
 const tops=await cards.evaluateAll(nodes=>nodes.map(n=>Math.round(n.getBoundingClientRect().top)));
 assert.equal(new Set(tops).size,2,'Desktop grid must be 4 by 2');
 await page.getByRole('button',{name:'Consultar novamente',exact:true,includeHidden:true}).waitFor({state:'attached',timeout:55000});
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'tmp/state-dashboard-desktop.png'});
 for(const [id,theme] of [['alerts','alerts'],['rain','rain'],['rivers','rivers'],['fire','fire'],['burned','fire'],['drought','drought'],['emergency','emergency']]) {
   await page.locator(`[data-indicator="${id}"]`).click();
   await page.waitForFunction(t=>document.querySelector(`.geo-layer-switch [data-layer="${t}"]`)?.getAttribute('aria-pressed')==='true',theme);
 }
 await page.locator('[data-indicator="alerts"]').click();
 await page.locator('.map-alerts-panel').waitFor();
 await page.locator('.geo-layer-switch [data-layer="rain"]').click();
 await page.goBack();
 await page.locator('.map-alerts-panel').waitFor();
 await page.locator('#municipality-picker').selectOption('1721000');
 await page.locator('.municipal-panel').waitFor();
 await page.locator('[data-indicator="alerts"]').click();
 await page.locator('.map-alerts-panel').waitFor();
 assert.equal(await page.locator('.municipal-panel').count(),0);
 await page.locator('[data-indicator="health"]').click();
 assert.equal(await page.locator('#qualidade-dados details').getAttribute('open'),'');
 assert.equal(await page.locator('.data-health-item').count(),11);
 for(const size of [{width:820,height:1180},{width:390,height:844}]) {
   await page.setViewportSize(size);await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),size.width,'No horizontal page overflow');
   await page.locator('.state-dashboard').screenshot({path:`tmp/state-dashboard-${size.width}.png`});
 }
 await page.getByRole('button',{name:'Próximo indicador',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.state-cards').scrollLeft>100);
 await page.locator('[data-indicator="rain"]').focus();
 await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('.geo-layer-switch [data-layer="rain"]')?.getAttribute('aria-pressed')==='true');
 assert.deepEqual(errors,[]);
 console.log('Dashboard/navigation: 8 cards, 4x2 grid, all destinations, history, municipal reset, health, tablet, mobile, keyboard passed.');
}finally{await browser.close()}})();

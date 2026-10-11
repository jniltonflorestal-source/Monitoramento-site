const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],start=Math.ceil(Date.now()/3600000)*3600;
let requests=0,failed=false,single=false;
page.on('pageerror',error=>errors.push(error.message));
await page.route('https://**/*',route=>{
 const url=new URL(route.request().url());
 if(url.hostname==='api.open-meteo.com'&&url.searchParams.get('hourly')?.includes('cloud_cover')){
  requests++;if(failed)return route.fulfill({status:503,body:'Unavailable'});
  const positions=url.searchParams.get('latitude').split(',').map((lat,index)=>[Number(lat),Number(url.searchParams.get('longitude').split(',')[index])]);
  return route.fulfill({json:positions.map(([lat,lon])=>{
   const times=single?[start]:[start,start+3600,start+7200].filter((_,i)=>!(lat===-10&&lon===-48&&i===0));
   return {hourly:{time:times,wind_speed_10m:times.map(time=>10+10*(time-start)/3600),wind_direction_10m:times.map(()=>90),wind_gusts_10m:times.map(()=>25),temperature_2m:times.map(()=>31),precipitation:times.map(time=>2*(time-start)/3600),cloud_cover:times.map(()=>50)}};
  })});
 }
 if(url.href.includes('resources.cemaden.gov.br/dados/311_24.json'))return route.fulfill({contentType:'text/javascript',body:'estacoes([]);'});
 if(url.href.includes('apiprevmet3.inmet.gov.br/previsao/')){const code=url.pathname.split('/').at(-1),date=new Date().toLocaleDateString('pt-BR');return route.fulfill({json:{[code]:{[date]:{manha:{resumo:'Nublado',temp_min:'25',temp_max:'31'}}}}});}
 return route.abort();
});
await page.goto('http://127.0.0.1:4196/Monitoramento-site/',{waitUntil:'domcontentloaded'});
await page.locator('[data-layer="rain"]').click();
const weather=page.locator('.operational-weather-controls');
await weather.locator('summary').click();
assert.equal(await weather.locator('.context-timeline').count(),0,'Forecast loads only when requested');
await weather.getByRole('button',{name:'Carregar / atualizar previsão',exact:true}).click();
await weather.locator('.timeline-reading').getByText('10 km/h',{exact:true}).waitFor();
assert.equal(requests,6);
await weather.getByRole('button',{name:'Próximo instante',exact:true}).click();
await weather.locator('.timeline-reading').getByText('20 km/h',{exact:true}).waitFor();
await weather.getByRole('button',{name:'Próximo instante',exact:true}).click();
await weather.getByRole('button',{name:'Reproduzir evolução',exact:true}).click();
await page.waitForTimeout(3500);
await weather.getByRole('button',{name:'Reproduzir evolução',exact:true}).waitFor();
assert.match(await weather.locator('.timeline-reading').innerText(),/30 km\/h/);
await page.waitForTimeout(1800);
assert.match(await weather.locator('.timeline-reading').innerText(),/30 km\/h/,'Playback does not wrap');
assert.equal(requests,6,'No per-frame request');
await page.waitForFunction(()=>{const canvas=document.querySelector('.weather-particles');return canvas&&canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((value,index)=>index%4===3&&value>0);});
await weather.getByLabel('Precipitação',{exact:true}).check();
await weather.getByLabel('Vento',{exact:true}).uncheck();
await weather.locator('.timeline-reading').getByText('0 mm/h',{exact:true}).waitFor();
await weather.getByRole('button',{name:'Reproduzir evolução',exact:true}).click();
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
await weather.getByRole('button',{name:'Reproduzir evolução',exact:true}).waitFor();
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
await weather.screenshot({path:'tmp/weather-timeline-desktop.png'});
await weather.getByRole('button',{name:'Reproduzir evolução',exact:true}).click();
await page.locator('.rain-mode-tabs').getByRole('button',{name:'Previsão 24h',exact:true}).click();
await weather.getByRole('button',{name:'Reproduzir evolução',exact:true}).waitFor();
failed=true;
await weather.getByRole('button',{name:'Carregar / atualizar previsão',exact:true}).click();
await weather.getByText('Previsão indisponível no momento. Tente novamente.',{exact:true}).waitFor();
assert.equal(await weather.locator('.context-timeline').count(),0,'Failed refresh clears unconfirmed forecast');
failed=false;single=true;
await weather.getByRole('button',{name:'Carregar / atualizar previsão',exact:true}).click();
await weather.locator('.context-timeline').waitFor();
assert.equal(await weather.getByRole('button',{name:'Reproduzir evolução',exact:true}).isDisabled(),true);
await page.setViewportSize({width:390,height:844});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
await weather.screenshot({path:'tmp/weather-timeline-mobile.png'});
await page.locator('[data-layer="fire"]').click();
assert.equal(await page.locator('.operational-weather-controls').count(),0);
assert.deepEqual(errors,[]);
console.log('Weather timeline browser: timestamps, controls, end, zero, visibility, failure, cache refresh, canvas, mobile and theme cleanup passed.');
}finally{await browser.close()}})();

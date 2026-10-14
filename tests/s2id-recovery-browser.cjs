const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const product = JSON.parse(fs.readFileSync(process.env.QA_S2ID_FILE || 'tests/fixtures/s2id-confirmed.json', 'utf8'));

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const failed of process.env.QA_URL ? [false] : [false, true]) {
      const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, serviceWorkers: 'block' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(60000);
      if (!process.env.QA_URL) {
        const date = new Date().toISOString();
        await page.route('https://**/*', route => route.abort());
        await page.route('**/dados-monitoramento.json*', route => route.fulfill({ json: {
          atualizado_em: date, s2id: { ...product, atualizadoEm: date }, resumo: {},
          qualidade_fontes: { s2id: { status: failed ? 'erro' : 'ok', ultimaTentativa: date, ultimoSucesso: date } },
          erros_atualizacao: failed ? { s2id: 'Portal S2ID indisponível (HTTP 403)' } : {}
        } }));
        await page.route('**/data/river-summary.json*', route => route.fulfill({ json: { status: 'error', stations: [] } }));
        await page.route('**/data/fire-history.json*', route => route.fulfill({ json: { status: 'error', points: [] } }));
      }
      await page.goto(process.env.QA_URL || 'http://127.0.0.1:4196/Monitoramento-site/', { waitUntil: 'domcontentloaded' });
      const card = page.locator('[data-indicator="emergency"]');
      await card.getByText(failed ? '2 na última consulta' : '2 municípios', { exact: true }).waitFor();
      assert.doesNotMatch(await card.innerText(), /Horário não informado/);
      if (failed) {
        assert.match(await card.innerText(), /Atualização pendente/i);
        assert.match(await card.innerText(), /Última confirmação/);
        assert.match(await card.innerText(), /Última tentativa/);
      } else {
        assert.match(await card.innerText(), /Situação de Emergência\s+2/);
        assert.match(await card.innerText(), /Calamidade Pública\s+0/);
      }
      await card.screenshot({ path: `tmp/s2id-card-${failed ? 'pending' : 'confirmed'}.png` });
      await card.click();
      await page.waitForFunction(() => document.querySelector('.geo-layer-switch [data-layer="emergency"]')?.getAttribute('aria-pressed') === 'true');
      const panel = page.locator('.geo-info-panel');
      await panel.getByRole('link', { name: 'Consultar reconhecimentos no S2ID' }).waitFor();
      await panel.getByRole('searchbox').fill('Filadélfia');
      if (failed) {
        await panel.getByText('Nenhum resultado encontrado nesta camada.', { exact: true }).waitFor();
        assert.match(await panel.innerText(), /vigência atual não foi reconfirmada/);
        assert.doesNotMatch(await panel.innerText(), /Reconhecimentos vigentes\s+0/);
      } else {
        await panel.locator('.search-results button').getByText('Filadélfia', { exact: true }).click();
        await page.locator('.leaflet-popup-content').getByText('Filadélfia', { exact: true }).waitFor();
        assert.match(await page.locator('.leaflet-popup-content').innerText(), /Situação de Emergência/);
      }
      for (const viewport of [{ width: 820, height: 1180 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
      }
      await page.locator('.map-workspace').screenshot({ path: `tmp/s2id-map-mobile-${failed ? 'pending' : 'confirmed'}.png` });
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('S2ID browser: confirmed card and map, failed recheck provenance, no false active points, responsive layouts and no JS errors passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

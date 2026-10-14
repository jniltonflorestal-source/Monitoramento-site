const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

function contrast(a, b) {
  const luminance = value => value.match(/\d+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (!process.env.QA_URL) {
      const date = new Date().toISOString();
      await page.route('https://**/*', route => route.abort());
      await page.route('**/dados-monitoramento.json*', route => route.fulfill({ json: {
        atualizado_em: date, resumo: { alertas_cemaden_to: 1, avisos_inmet_to_hoje: 0 },
        qualidade_fontes: { alertas_cemaden: { status: 'ok', ultimoSucesso: date }, avisos_inmet: { status: 'ok', ultimoSucesso: date } }
      } }));
      await page.route('**/data/river-summary.json*', route => route.fulfill({ json: { status: 'error', stations: [] } }));
      await page.route('**/data/fire-history.json*', route => route.fulfill({ json: { status: 'error', points: [] } }));
    }
    await page.goto(process.env.QA_URL || 'http://127.0.0.1:4196/Monitoramento-site/', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.state-card');
    await cards.first().waitFor();
    assert.equal(await cards.count(), 8);
    for (const viewport of [{ width: 1600, height: 1200 }, { width: 1280, height: 1000 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const styles = await cards.evaluateAll(nodes => nodes.map(card => {
        const title = card.querySelector('header > span:not(.status-icon)'), icon = card.querySelector('.status-icon'), svg = icon.querySelector('svg');
        const style = getComputedStyle(card), titleStyle = getComputedStyle(title);
        const tint = document.createElement('span'); tint.style.color = style.getPropertyValue('--card-tint'); card.append(tint);
        const tintColor = getComputedStyle(tint).color; tint.remove();
        const parent = card.getBoundingClientRect(), text = title.getBoundingClientRect();
        return {
          id: card.dataset.indicator, background: style.backgroundImage, border: style.borderTopColor,
          titleSize: parseFloat(titleStyle.fontSize), ink: titleStyle.color, tint: tintColor,
          iconWidth: icon.getBoundingClientRect().width, svgWidth: parseFloat(getComputedStyle(svg).width),
          textFits: text.right <= parent.right + 1 && text.left >= parent.left && title.scrollWidth <= title.clientWidth + 1,
          cursor: style.cursor, href: card.getAttribute('href')
        };
      }));
      for (const card of styles) {
        assert.ok(card.titleSize >= 18, `${card.id}: title must be more readable`);
        assert.ok(card.iconWidth >= 44 && card.svgWidth >= 25, `${card.id}: larger fixed-size icon`);
        assert.notEqual(card.background, 'none', `${card.id}: theme surface must not remain plain white`);
        assert.ok(contrast(card.ink, card.tint) >= 4.5, `${card.id}: title contrast against tint`);
        assert.ok(card.textFits, `${card.id}: title cannot spill out of the card`);
        assert.equal(card.cursor, 'pointer');
        assert.ok(card.href.startsWith('#'));
      }
      assert.equal(new Set(styles.map(card => card.tint)).size, 7, 'Every category has its own tint; fire and burned area share one family');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
      if (viewport.width === 1600 || viewport.width === 390) await page.locator('.state-cards').screenshot({ path: `tmp/state-card-colors-${viewport.width}.png` });
    }
    assert.deepEqual(errors, []);
    console.log('State cards: eight themed surfaces, larger titles/icons, contrast, destinations and four responsive viewports passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

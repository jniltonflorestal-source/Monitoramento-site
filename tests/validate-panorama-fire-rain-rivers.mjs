import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const hero = await read("frontend/src/components/dashboard/SituationHero.jsx");
assert.match(hero, /Panorama Atual!/);
assert.doesNotMatch(hero, /Situa(?:ç|Ã§)(?:ã|Ã£)o do Tocantins Agora!/);

const map = await read("frontend/src/components/maps/PublicMapSection.jsx");
for (const snippet of [
  "FloatingMapLegend",
  "RainModeTabs",
  "rainMode",
  "Resumo da chuva",
  "Situação hidrológica",
  "Previsão 24h",
  "Previsão 48h",
  "Satélite",
  "Classificação oficial em integração",
  "Heatmap observacional"
]) {
  assert.ok(map.includes(snippet), `PublicMapSection precisa conter ${snippet}`);
}

const floatingLegend = await read("frontend/src/components/maps/FloatingMapLegend.jsx");
assert.match(floatingLegend, /Normal/);
assert.match(floatingLegend, /Emergência/);
assert.match(floatingLegend, /Acima de 50 mm/);

const rainTabs = await read("frontend/src/components/maps/RainModeTabs.jsx");
assert.match(rainTabs, /Observado 24h/);
assert.match(rainTabs, /Previsão 48h/);

const panel = await read("frontend/src/components/maps/MapInfoPanel.jsx");
assert.match(panel, /summary/);
assert.ok(panel.indexOf("{summary}") < panel.indexOf("<MapSearchBox"), "Resumo deve aparecer antes da busca");

const parser = await read("frontend/src/services/publishedSnapshotParser.js");
assert.match(parser, /fireData\?\.atualizadoEm/);
assert.match(parser, /fireData\?\.status/);
assert.match(parser, /Dados desatualizados|Não foi possível atualizar/);

const updateScript = await read("scripts/update-monitoring.mjs");
for (const snippet of [
  "quantidade24h",
  "quantidadeMapa",
  "atualizadoEm",
  'status: "ok"',
  "referenciaArquivo"
]) {
  assert.ok(updateScript.includes(snippet), `update-monitoring precisa conter ${snippet}`);
}

const workflow = await read(".github/workflows/atualizar-dados.yml");
assert.match(workflow, /pages: write/);
assert.match(workflow, /id-token: write/);
assert.match(workflow, /actions\/upload-pages-artifact/);
assert.match(workflow, /actions\/deploy-pages/);

const styles = await read("frontend/src/styles.css");
for (const selector of [
  ".map-shell",
  ".floating-map-legend",
  ".rain-mode-tabs",
  ".map-summary-card",
  ".rain-heat-point",
  ".river-popup-grid"
]) {
  assert.ok(styles.includes(selector), `styles.css precisa conter ${selector}`);
}

console.log("Panorama, focos, rios e chuva validados.");

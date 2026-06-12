import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const html = await read("index.html");
const app = await read("frontend/src/App.jsx");
const dashboard = await read("frontend/src/components/dashboard/SituationDashboard.jsx");
const hero = await read("frontend/src/components/dashboard/SituationHero.jsx");
const map = await read("frontend/src/components/maps/PublicMapSection.jsx");
const publications = await read("frontend/src/components/dashboard/PublicationsCenter.jsx");
const data = JSON.parse(await read("dados-monitoramento.json"));

assert.match(html, /<div id="root"><\/div>/, "HTML publicado deve montar o app React");
assert.match(html, /assets\/index-.*\.js/, "HTML publicado deve apontar para bundle JS");
assert.match(html, /assets\/index-.*\.css/, "HTML publicado deve apontar para CSS");
assert.match(html, /Painel p.blico com informa..es sobre chuva, rios, fogo, seca, alertas oficiais e situa..es de emerg.ncia no Tocantins/);

for (const marker of [
  "Centro de Monitoramento",
  "#boletins",
  "#alertas",
  "#mapa-prioritario",
  "Emerg"
]) {
  assert.match(app, new RegExp(marker), `App deve conter ${marker}`);
}

for (const marker of [
  "SituationHero",
  "QuickActions",
  "OfficialAlertsSection",
  "PublicMapSection",
  "PublicationsCenter",
  "RecommendationsSection",
  "OfficialSourcesSection",
  "AboutCenterSection"
]) {
  assert.match(dashboard, new RegExp(marker), `Dashboard deve conter ${marker}`);
}

assert.match(hero, /Panorama Atual!/);
assert.match(hero, /MeteorologiaTocantinsPanel/);
assert.match(map, /Chuva|Rios|Focos|SE\/ECP/);
assert.match(map, /sourceBreakdown/);
assert.match(publications, /library-primary-grid/);
assert.match(publications, /Relat/);
assert.match(publications, /Boletins da Defesa Civil/);

assert.equal(data.seca?.fonte, "Cemaden / Alerta-Secas - IIS3");
assert.equal(data.seca?.municipios?.length, 139);
assert.ok(Number.isInteger(data.seca?.resumo?.com_seca), "Resumo deve ter contagem municipal de seca");
assert.equal(data.seca?.s2id?.vigentes, null, "S2ID nao deve afirmar total vigente sem base atual");

console.log("Portal publico React: estrutura atual validada.");

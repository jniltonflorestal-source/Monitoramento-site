import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../frontend/", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const requiredSections = [
  "src/components/dashboard/OfficialAlertsSection.jsx",
  "src/components/dashboard/FeaturedBulletin.jsx",
  "src/components/dashboard/RecentBulletins.jsx",
  "src/components/dashboard/TechnicalPanelsSection.jsx",
  "src/components/dashboard/RecommendationsSection.jsx",
  "src/components/dashboard/AboutCenterSection.jsx"
];
for (const file of requiredSections) {
  await access(new URL(file, root));
}

const requiredServices = [
  ["src/services/idap.js", "getAlertasVigentes"],
  ["src/services/s2id.js", "getMunicipiosEmergencia"],
  ["src/services/cemaden.js", "getChuva24h"],
  ["src/services/inmet.js", "getAvisosMeteorologicos"],
  ["src/services/ana.js", "getSituacaoRios"],
  ["src/services/inpe.js", "getFocosCalor24h"],
  ["src/services/monitorSecas.js", "getSituacaoSeca"],
  ["src/services/weather.js", "getMeteorologiaTocantins"]
];
for (const [file, exportedFunction] of requiredServices) {
  const contents = await read(file);
  assert.match(contents, new RegExp(`export async function ${exportedFunction}`), `${exportedFunction} ausente`);
}

const dashboard = await read("src/components/dashboard/SituationDashboard.jsx");
const orderedMarkers = [
  "SituationHero",
  "QuickActions",
  "OfficialAlertsSection",
  "PublicMapSection",
  "FeaturedBulletin",
  "RecentBulletins",
  "TechnicalPanelsSection",
  "RecommendationsSection",
  "AboutCenterSection"
];
let previousIndex = -1;
for (const marker of orderedMarkers) {
  const nextIndex = dashboard.indexOf(`<${marker}`);
  assert.ok(nextIndex > previousIndex, `Ordem incorreta ou secao ausente: ${marker}`);
  previousIndex = nextIndex;
}
const hero = await read("src/components/dashboard/SituationHero.jsx");
assert.match(hero, /Panorama Atual!/);
assert.match(hero, /MeteorologiaTocantinsPanel/);

const fallback = await read("src/data/monitoringFallback.js");
assert.match(fallback, /Consulta automática em desenvolvimento/);
assert.match(fallback, /Nenhum alerta vigente no momento/);
assert.match(fallback, /Sem municípios registrados no momento/);

const app = await read("src/App.jsx");
assert.match(app, /Emergência: Defesa Civil 199/);
assert.match(app, /#boletins/);
assert.match(app, /#alertas/);

const html = await read("index.html");
assert.match(html, /Painel público com informações sobre chuva, rios, fogo, seca, alertas oficiais e situações de emergência no Tocantins/);
assert.match(html, /og:image/);

console.log("Home pública React: hierarquia, serviços e conteúdo validados.");

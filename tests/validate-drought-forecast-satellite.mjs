import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const hero = await read("frontend/src/components/dashboard/SituationHero.jsx");
const order = [
  "AlertasVigentesCard",
  "FogoCard",
  "Chuva24hCard",
  "RiosMonitoradosCard",
  "EmergenciaCalamidadeCard",
  "SecaCard"
].map((marker) => hero.indexOf(`<${marker}`));
assert.deepEqual(order, [...order].sort((a, b) => a - b), "Cards principais devem seguir a nova ordem visual");

const dashboard = await read("frontend/src/components/dashboard/SituationDashboard.jsx");
assert.match(dashboard, /droughtSummary=\{snapshot\.drought\}/);

const technical = await read("frontend/src/components/dashboard/TechnicalPanelsSection.jsx");
assert.doesNotMatch(technical, /<PublicMapSection/);
assert.match(technical, /Ver mapa de seca/);

const map = await read("frontend/src/components/maps/PublicMapSection.jsx");
for (const snippet of [
  '{ id: "drought", label: "Seca" }',
  'useState("drought")',
  "tocantins_municipios.geojson",
  "droughtByName",
  "GeoJSON",
  "Previsão 24h",
  "Previsão 48h",
  "GOES-East_ABI_GeoColor",
  "forecastPoints",
  "Camada municipal de seca em integração"
]) {
  assert.ok(map.includes(snippet), `PublicMapSection precisa conter ${snippet}`);
}

const forecast = await read("frontend/src/services/rainForecast.js");
assert.match(forecast, /getRainForecastPoints/);
assert.match(forecast, /precipitation/);
assert.match(forecast, /Open-Meteo/);

await access(new URL("frontend/public/data/tocantins_municipios.geojson", root));

const styles = await read("frontend/src/styles.css");
for (const selector of [".drought-map-summary", ".forecast-status", ".satellite-credit"]) {
  assert.ok(styles.includes(selector), `styles.css precisa conter ${selector}`);
}

console.log("Ordem dos cards, seca prioritária, previsão e satélite validados.");

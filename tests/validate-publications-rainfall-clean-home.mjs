import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const dashboard = await read("frontend/src/components/dashboard/SituationDashboard.jsx");
assert.doesNotMatch(dashboard, /TechnicalPanelsSection/);

const quickActions = await read("frontend/src/components/layout/QuickActions.jsx");
assert.match(quickActions, /href="#mapa-prioritario"/);
assert.doesNotMatch(quickActions, /href="#mapas"/);

const app = await read("frontend/src/App.jsx");
assert.match(app, /href="#mapa-prioritario"/);
assert.doesNotMatch(app, /href="#mapas"/);

const rainfall = await read("frontend/src/services/rainfall.js");
for (const snippet of [
  "getChuvaObservada24h",
  "CEMADEN",
  "INMET",
  "ANA",
  "SEMARH",
  "sourceBreakdown",
  "deduplicateRainStations",
  "Estações cadastradas",
  "Rede estadual em integração"
]) {
  assert.ok(rainfall.includes(snippet), `rainfall.js precisa conter ${snippet}`);
}

const cemaden = await read("frontend/src/services/cemaden.js");
assert.match(cemaden, /getChuvaObservada24h/);

const map = await read("frontend/src/components/maps/PublicMapSection.jsx");
assert.match(map, /sourceBreakdown/);
assert.match(map, /Por fonte/);
assert.match(map, /leitura indisponível|Rede estadual em integração|Fonte em integração/);

const center = await read("frontend/src/components/dashboard/PublicationsCenter.jsx");
assert.match(center, /Publicações do Centro de Monitoramento/);
assert.match(center, /Boletins informativos/);
assert.match(center, /Boletins hidrometeorológicos/);
assert.match(center, /Relatórios técnicos/);
assert.match(center, /Mapas e produtos geoespaciais/);
assert.match(center, /PDF ainda não disponível/);
const publicationsService = await read("frontend/src/services/publications.js");
assert.match(publicationsService, /publicacoes\.json/);

await access(new URL("frontend/public/data/publicacoes.json", root));
await access(new URL("frontend/public/docs/relatorios/relatorio-incendios-florestais-tocantins-2025.pdf", root));
await access(new URL("frontend/public/docs/boletins", root));
await access(new URL("frontend/public/docs/mapas", root));

const publications = JSON.parse(await read("frontend/public/data/publicacoes.json"));
assert.ok(publications.destaque?.rota?.includes("www.to.gov.br/defesacivil/noticias/defesa-civil-do-tocantins-divulga-relatorio-tecnico"));
assert.ok(Array.isArray(publications.publicacoes));
assert.ok(publications.publicacoes.some((item) => item.categoria === "Boletins hidrometeorológicos"));

const readme = await read("README.md");
assert.match(readme, /Como adicionar novo relatÃ³rio ou boletim|Como adicionar novo relatório ou boletim/);
assert.match(readme, /public\/docs\/relatorios/);
assert.match(readme, /public\/data\/publicacoes\.json/);

console.log("Home limpa, chuva multi-fonte e publicações dinâmicas validadas.");

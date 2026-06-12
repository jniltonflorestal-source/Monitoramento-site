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
  "Fonte em integra",
  "Sem leitura",
  "validCount",
  "registeredCount"
]) {
  assert.ok(rainfall.includes(snippet), `rainfall.js precisa conter ${snippet}`);
}

const cemaden = await read("frontend/src/services/cemaden.js");
assert.match(cemaden, /getChuvaObservada24h/);

const map = await read("frontend/src/components/maps/PublicMapSection.jsx");
assert.match(map, /sourceBreakdown/);
assert.match(map, /Por fonte/);
assert.match(map, /com leitura|Sem leitura|Fonte em integra/);

const center = await read("frontend/src/components/dashboard/PublicationsCenter.jsx");
assert.match(center, /Publica/);
assert.match(center, /Relat/);
assert.match(center, /Boletins da Defesa Civil/);
assert.match(center, /HydroBulletinPdfGenerator/);
assert.match(center, /library-primary-grid/);
assert.match(center, /library-primary-card report/);
assert.match(center, /library-primary-card bulletin/);
assert.match(center, /Ver relat/);
assert.match(center, /Ler relat/);
assert.doesNotMatch(center, /Pesquisar por/);
assert.doesNotMatch(center, /library-toolbar/);
assert.doesNotMatch(center, /library-results/);
assert.doesNotMatch(center, /library-explainers/);
assert.doesNotMatch(center, /Relat.rio t.cnico em destaque/);

const generator = await read("frontend/src/components/dashboard/HydroBulletinPdfGenerator.jsx");
assert.match(generator, /Gerar Boletim Hidrometeorol/);
assert.match(generator, /window\.print/);
assert.match(generator, /fetchMonitoringSnapshot/);
assert.match(generator, /getMeteorologiaTocantins/);
assert.match(generator, /N.o dispon.vel no momento da gera/);

const publicationsService = await read("frontend/src/services/publications.js");
assert.match(publicationsService, /relatoriosTecnicos/);
assert.match(publicationsService, /boletinsDefesaCivil/);
assert.match(publicationsService, /publicacoes\.json/);

await access(new URL("frontend/public/data/publicacoes.json", root));
await access(new URL("frontend/public/data/boletins.json", root));
await access(new URL("frontend/public/data/relatorios-tecnicos.json", root));
await access(new URL("frontend/public/docs/boletins", root));
await access(new URL("frontend/public/docs/mapas", root));

const publications = JSON.parse(await read("frontend/public/data/publicacoes.json"));
assert.ok(Array.isArray(publications.relatoriosTecnicos));
assert.ok(Array.isArray(publications.boletinsDefesaCivil));
assert.ok(publications.relatoriosTecnicos.some((item) => item.rota?.includes("www.to.gov.br/defesacivil/noticias/defesa-civil-do-tocantins-divulga-relatorio-tecnico")));
assert.ok(publications.boletinsDefesaCivil.some((item) => item.subtipo === "Boletim HidrometeorolÃ³gico" || item.subtipo === "Boletim Hidrometeorológico"));
assert.ok(publications.boletinsDefesaCivil.every((item) => item.rota !== "#boletim-hidrometeorologico"));

const readme = await read("README.md");
assert.match(readme, /Como adicionar novo relat/);
assert.match(readme, /Como adicionar boletim da Defesa Civil/);
assert.match(readme, /public\/docs\/relatorios/);
assert.match(readme, /public\/data\/publicacoes\.json/);
assert.match(readme, /Relat/);
assert.match(readme, /Boletins da Defesa Civil/);

console.log("Home limpa, chuva multi-fonte e publicacoes em dois cards validadas.");

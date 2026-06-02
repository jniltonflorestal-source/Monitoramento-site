import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

await access(new URL("frontend/public/data/boletim-atual.json", root));
await access(new URL("frontend/public/data/boletins.json", root));
await access(new URL("frontend/public/data/relatorios-tecnicos.json", root));
await access(new URL("frontend/public/data/tocantins_municipios.geojson", root));
const boletim = JSON.parse(await read("frontend/public/data/boletim-atual.json"));

for (const field of [
  "numero",
  "dataEmissao",
  "periodoReferencia",
  "status",
  "responsavel",
  "resumoExecutivo",
  "situacaoGeral",
  "alertas",
  "chuva",
  "rios",
  "usinas",
  "focosCalor",
  "seca",
  "recomendacoes",
  "fontes"
]) {
  assert.ok(field in boletim, `boletim-atual.json precisa conter ${field}`);
}

assert.ok(Array.isArray(boletim.usinas));
assert.ok(Array.isArray(boletim.recomendacoes));
assert.ok(Array.isArray(boletim.fontes));

const component = await read("frontend/src/components/dashboard/HydroBulletinPdfGenerator.jsx");
for (const snippet of [
  "Boletim Hidrometeorológico",
  "Gerar Boletim Hidrometeorológico em PDF",
  "Resumo executivo",
  "Mapa de chuva observada 24h",
  "Mapa de rios monitorados",
  "Mapa de focos de calor",
  "Mapa de seca",
  "Maiores acumulados",
  "Meteorologia por municípios estratégicos",
  "Fontes oficiais consultadas",
  "TocantinsMiniMap",
  "BulletinMapCard",
  "tocantins_municipios.geojson",
  "getBoletimAtual",
  "window.print"
]) {
  assert.ok(component.includes(snippet), `Componente precisa conter ${snippet}`);
}

const dashboard = await read("frontend/src/components/dashboard/SituationDashboard.jsx");
assert.doesNotMatch(dashboard, /HydrometeorologicalBulletin/);
assert.match(dashboard, /PublicationsCenter/);

const publications = JSON.parse(await read("frontend/public/data/publicacoes.json"));
assert.ok(publications.boletinsDefesaCivil.some((item) => item.subtipo === "Boletim Hidrometeorológico"));
assert.ok(publications.boletinsDefesaCivil.every((item) => item.rota !== "#boletim-hidrometeorologico"));
assert.ok(publications.relatoriosTecnicos.some((item) => item.tipo === "Relatório Técnico"));

const styles = await read("frontend/src/styles.css");
for (const snippet of [
  ".bulletin-generator-panel",
  ".generated-bulletin-root",
  "@media print",
  "size: A4",
  ".generated-bulletin-grid",
  ".generated-map-card",
  ".generated-mini-map",
  ".generated-map-legend",
  ".generated-table",
  ".page-break-before"
]) {
  assert.ok(styles.includes(snippet), `styles.css precisa conter ${snippet}`);
}

const script = await read("scripts/update-boletim-data.js");
assert.match(script, /status: "rascunho"/);
assert.match(script, /boletim-atual\.json/);

const workflow = await read(".github/workflows/update-boletim.yml");
assert.match(workflow, /Preparar boletim hidrometeorologico/);
assert.match(workflow, /revisao humana/);

const generateScript = await read("scripts/generate-boletim.js");
assert.match(generateScript, /boletim-atual\.json/);
assert.match(generateScript, /rascunho/);

const generateWorkflow = await read(".github/workflows/generate-boletim.yml");
assert.match(generateWorkflow, /Gerar boletim diario/);
assert.match(generateWorkflow, /revisao|validacao humana/);

const readme = await read("README.md");
assert.match(readme, /Como atualizar o Boletim Hidrometeorológico digital/);
assert.match(readme, /Gerar Boletim Hidrometeorológico em PDF/);
assert.match(readme, /Salvar como PDF/);
assert.match(readme, /scripts\/update-boletim-data\.js/);
assert.match(readme, /scripts\/generate-boletim\.js/);

console.log("Boletim Hidrometeorológico digital validado.");

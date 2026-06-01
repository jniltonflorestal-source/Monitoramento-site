import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

await access(new URL("frontend/public/data/boletim-atual.json", root));
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

const component = await read("frontend/src/components/dashboard/HydrometeorologicalBulletin.jsx");
for (const snippet of [
  "Boletim Hidrometeorológico",
  "Imprimir / Salvar PDF",
  "Resumo executivo",
  "Usinas e vazões",
  "Fontes oficiais consultadas",
  "getBoletimAtual"
]) {
  assert.ok(component.includes(snippet), `Componente precisa conter ${snippet}`);
}

const dashboard = await read("frontend/src/components/dashboard/SituationDashboard.jsx");
assert.match(dashboard, /HydrometeorologicalBulletin/);

const publications = JSON.parse(await read("frontend/public/data/publicacoes.json"));
assert.ok(publications.boletins.some((item) => item.arquivo === "#boletim-hidrometeorologico"));

const styles = await read("frontend/src/styles.css");
for (const snippet of [".hydro-bulletin", ".bulletin-paper", "@media print", ".bulletin-metrics"]) {
  assert.ok(styles.includes(snippet), `styles.css precisa conter ${snippet}`);
}

const script = await read("scripts/update-boletim-data.js");
assert.match(script, /status: "rascunho"/);
assert.match(script, /boletim-atual\.json/);

const workflow = await read(".github/workflows/update-boletim.yml");
assert.match(workflow, /Preparar boletim hidrometeorologico/);
assert.match(workflow, /revisao humana/);

const readme = await read("README.md");
assert.match(readme, /Como atualizar o Boletim Hidrometeorológico manualmente/);
assert.match(readme, /scripts\/update-boletim-data\.js/);

console.log("Boletim Hidrometeorológico digital validado.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const component = await read("frontend/src/components/dashboard/HydroBulletinPdfGenerator.jsx");
const styles = await read("frontend/src/styles.css");

for (const snippet of [
  "Página 1 - Capa / Síntese Executiva",
  "Página 2 - Panorama Geral",
  "Página 3 - Chuva Observada 24h",
  "Página 4 - Rios Monitorados / Situação Geral",
  "Página 5 - Principais Rios Estratégicos",
  "Página 6 - Fogo e Queimadas",
  "Página 7 - Seca",
  "Página 8 - Meteorologia Regional",
  "Página 9 - Emergência e Calamidade / S2ID",
  "Página 10 - Fontes e Metodologia",
  "Panorama Geral do Monitoramento",
  "Principais Rios Estratégicos",
  "Emergência e Calamidade / S2ID",
  "Fontes e Metodologia",
  "generated-page-shell",
  "generated-cover-kpis",
  "generated-hero-map-layout",
  "generated-river-priority-table",
  "generated-weather-cards",
  "generated-s2id-cards",
  "generated-methodology-grid"
]) {
  assert.ok(component.includes(snippet), `HydroBulletinPdfGenerator.jsx precisa conter ${snippet}`);
}

assert.ok(
  component.indexOf("Página 4 - Rios Monitorados / Situação Geral") < component.indexOf("Página 5 - Principais Rios Estratégicos"),
  "A página geral de rios deve vir antes da tabela de rios estratégicos"
);

for (const snippet of [
  ".generated-page-shell",
  "min-height: 277mm",
  ".generated-hero-map-layout",
  ".generated-full-map-card",
  ".generated-cover-kpis",
  ".generated-river-priority-table",
  ".generated-weather-cards",
  ".generated-s2id-cards",
  ".generated-methodology-grid",
  "table-layout: fixed",
  "break-before: page",
  "@media print"
]) {
  assert.ok(styles.includes(snippet), `styles.css precisa conter ${snippet}`);
}

console.log("Layout editorial do boletim hidrometeorológico validado.");

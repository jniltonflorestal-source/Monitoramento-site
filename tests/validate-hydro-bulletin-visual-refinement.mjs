import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const component = await read("frontend/src/components/dashboard/HydroBulletinPdfGenerator.jsx");
const styles = await read("frontend/src/styles.css");

for (const snippet of [
  "generated-cover-accent",
  "generated-map-insight",
  "generated-river-priority-table",
  "generated-page-footer",
  "generated-full-map-card",
  "generated-print-kicker"
]) {
  assert.ok(component.includes(snippet), `Componente precisa conter ${snippet}`);
}

for (const snippet of [
  "@page",
  "margin: 10mm",
  "min-height: 277mm",
  ".generated-page-shell",
  ".generated-page-footer",
  "align-items: end",
  ".generated-cover-accent",
  ".generated-cover-page",
  ".generated-cover-title h1",
  ".generated-hero-map-layout .generated-map-card",
  "min-height: 205mm",
  ".generated-hero-map-layout .generated-mini-map",
  "min-height: 136mm",
  ".generated-river-priority-table .generated-table th:nth-child(1)",
  ".generated-river-priority-table .generated-table th:nth-child(2)",
  ".generated-river-priority-table .generated-table td",
  "overflow-wrap: normal",
  ".generated-map-insight",
  ".generated-print-kicker",
  "break-after: page"
]) {
  assert.ok(styles.includes(snippet), `styles.css precisa conter ${snippet}`);
}

assert.ok(styles.indexOf(".generated-cover-page") < styles.indexOf(".generated-cover-title h1"), "estilos da capa devem vir antes da tipografia da capa");
assert.ok(styles.indexOf(".generated-river-priority-table") < styles.indexOf(".generated-river-priority-table .generated-table th:nth-child(1)"), "larguras da tabela de rios devem especializar o bloco correto");

console.log("Refinamento visual do PDF hidrometeorológico validado.");

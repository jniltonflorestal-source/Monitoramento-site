import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const rainfall = await read("frontend/src/services/rainfall.js");
for (const snippet of [
  "incluirSemLeitura",
  "statusLeitura",
  "motivoIndisponibilidade",
  "ultimaTentativa",
  "allStations",
  "visibleStations",
  "sem_leitura",
  "integracao",
  "semLeituraCount",
  "errorCount",
  "integrationCount"
]) {
  assert.ok(rainfall.includes(snippet), `rainfall.js precisa conter ${snippet}`);
}

const map = await read("frontend/src/components/maps/PublicMapSection.jsx");
for (const snippet of [
  "visibleRainStations",
  "selectedRainSource",
  "selectedRainStatus",
  "Esta",
  "Mostrar no mapa",
  "Limpar filtro",
  "Sem leitura 24h",
  "Erro de consulta",
  "Fonte em integra",
  "As esta",
  "tamb",
  "aparecem no mapa",
  "rain-diagnostics",
  "statusLeitura",
  "motivoIndisponibilidade",
  "ultimaTentativa",
  "rain-station-marker",
  "rain-source-filter"
]) {
  assert.ok(map.includes(snippet), `PublicMapSection.jsx precisa conter ${snippet}`);
}
assert.match(map, /visibleRainStations\.map\(\(station\) => \(/, "Mapa deve desenhar estacoes visiveis, incluindo sem leitura");
assert.doesNotMatch(map, /O mapa principal mostra apenas leituras/, "Interface nao deve esconder estacoes sem leitura do mapa");

const styles = await read("frontend/src/styles.css");
for (const snippet of [
  ".rain-source-actions",
  ".rain-stations-panel",
  ".rain-stations-table",
  ".rain-status-legend",
  ".rain-station-status-chip",
  ".rain-source-filter"
]) {
  assert.ok(styles.includes(snippet), `styles.css precisa conter ${snippet}`);
}

const monitoring = await read("scripts/update-monitoring.mjs");
for (const snippet of [
  "/diaria/",
  "CHAVE INV",
  "statusLeitura",
  "motivoIndisponibilidade",
  "ultimaTentativa",
  "allStations",
  "semLeituraCount"
]) {
  assert.ok(monitoring.includes(snippet), `update-monitoring.mjs precisa conter ${snippet}`);
}

console.log("Visibilidade de estacoes de chuva e endpoints INMET validados.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const inmet = await read("frontend/src/services/inmetPrevisao.js");
for (const snippet of [
  "https://apiprevmet3.inmet.gov.br/previsao/",
  "MUNICIPIOS_ESTRATEGICOS_TO",
  "getPrevisaoMunicipioInmet",
  "getPrevisaoTocantinsInmet",
  "getPrevisao24hTocantins",
  "getPrevisao48hTocantins",
  "hasPrevisaoChuva",
  "localStorage",
  "INMET"
]) {
  assert.ok(inmet.includes(snippet), `inmetPrevisao.js precisa conter ${snippet}`);
}

const forecast = await read("frontend/src/services/rainForecast.js");
assert.match(forecast, /getPrevisao24hTocantins/);
assert.match(forecast, /getPrevisao48hTocantins/);
assert.match(forecast, /source: "INMET"/);
assert.doesNotMatch(forecast, /Open-Meteo/);

const map = await read("frontend/src/components/maps/PublicMapSection.jsx");
for (const snippet of [
  "Diagnóstico das fontes",
  "Atualizar previsão",
  "Previsão INMET 24h",
  "Previsão INMET 48h",
  "condicaoPredominante",
  "comPossibilidadeChuva",
  "forecastState.refreshKey",
  "Fonte: INMET",
  "Estações da camada"
]) {
  assert.ok(map.includes(snippet), `PublicMapSection.jsx precisa conter ${snippet}`);
}
assert.ok(map.indexOf("Diagnóstico das fontes") < map.indexOf("Estações da camada"), "diagnóstico deve agrupar a tabela técnica");

const styles = await read("frontend/src/styles.css");
for (const snippet of [
  ".rain-diagnostics",
  ".forecast-refresh-button",
  ".forecast-condition-list"
]) {
  assert.ok(styles.includes(snippet), `styles.css precisa conter ${snippet}`);
}

console.log("Camada de chuva limpa e previsão INMET validadas.");

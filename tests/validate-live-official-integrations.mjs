import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeAnaStations, computeRiverTrend } from "../frontend/src/services/anaParser.js";
import {
  parseAlertIndicator,
  parseDroughtIndicator,
  parseEmergencyIndicator,
  parseFireIndicator
} from "../frontend/src/services/publishedSnapshotParser.js";

const fallback = {
  value: "Dados em integracao",
  description: "Consulta automatica em desenvolvimento.",
  source: "Fonte prevista"
};

const published = {
  atualizado_em: "2026-05-26T01:00:00.000Z",
  resumo: {
    alertas_cemaden_to: 0,
    avisos_inmet_to_hoje: 1,
    avisos_inmet_detalhes: [{ title: "Chuva intensa", detail: "Perigo", location: "Palmas" }],
    focos_calor_24h: 2,
    municipios_s2id_vigentes: 2
  },
  focos_calor: {
    status: "ok",
    quantidade24h: 2,
    quantidadeMapa: 2,
    atualizadoEm: new Date().toISOString(),
    pontos_24h: [
      { latitude: -10.1, longitude: -48.3, municipio: "Palmas" },
      { latitude: -9.3, longitude: -48.5, municipio: "Rio dos Bois" }
    ]
  },
  area_queimada: {
    area_queimada_ha: 13035.81,
    ano_referencia: 2026,
    periodo: "Janeiro a abril de 2026",
    raster_url: "https://earthengine.googleapis.com/example/tiles/{z}/{x}/{y}",
    fonte: "MapBiomas Monitor do Fogo"
  },
  s2id: {
    reconhecimentos_vigentes: [
      { municipio: "Palmas", situacao: "Situacao de Emergencia (SE)", latitude: -10.1, longitude: -48.3 },
      { municipio: "Talisma", situacao: "Estado de Calamidade Publica (ECP)", latitude: -12.8, longitude: -49.1 }
    ],
    resumo: { se: 1, ecp: 1, federal: 2 }
  },
  seca: {
    situacao_geral: "Severa",
    tendencia: "Melhora",
    resumo: { com_seca: 114, severa_ou_extrema: 2, municipios_criticos: ["Lagoa da Confusao"] }
  }
};

const fire = parseFireIndicator(published, fallback);
assert.equal(fire.state, "ready");
assert.equal(fire.value, "2 focos");
assert.equal(fire.points.length, 2);
assert.match(fire.source, /INPE/);
assert.equal(fire.burnedArea.hectares, 13035.81);
assert.equal(fire.burnedArea.year, 2026);
assert.match(fire.burnedArea.period, /abril de 2026/);
assert.match(fire.burnedArea.rasterUrl, /earthengine/);

const alert = parseAlertIndicator(published, fallback);
assert.equal(alert.state, "ready");
assert.equal(alert.value, "1 ativo");
assert.equal(alert.details.length, 1);

const drought = parseDroughtIndicator(published, fallback);
assert.equal(drought.state, "ready");
assert.equal(drought.value, "Severa");
assert.match(drought.description, /114/);

const emergency = parseEmergencyIndicator(published, fallback);
assert.equal(emergency.state, "ready");
assert.equal(emergency.value, "2 municípios");
assert.equal(emergency.se, 1);
assert.equal(emergency.ecp, 1);
assert.equal(emergency.points.length, 2);

const stations = normalizeAnaStations([
  { code: "123", name: "Porto Nacional", river: "Tocantins", city: "Porto Nacional", latitude: "-10.70", longitude: "-48.42" },
  { code: "", name: "Invalida", latitude: "-10", longitude: "-48" }
]);
assert.equal(stations.length, 1);
assert.equal(stations[0].code, "123");

assert.deepEqual(computeRiverTrend(203, 198), { label: "Subindo", direction: "up", arrow: "↑" });
assert.deepEqual(computeRiverTrend(198, 203), { label: "Descendo", direction: "down", arrow: "↓" });
assert.deepEqual(computeRiverTrend(200, 200), { label: "Estável", direction: "stable", arrow: "→" });

const updateScript = await readFile(new URL("../scripts/update-monitoring.mjs", import.meta.url), "utf8");
assert.match(updateScript, /pontos_24h/);
assert.match(updateScript, /rest\/portal\/reconhecimentos/);
assert.match(updateScript, /plataforma\.monitorfogo\.mapbiomas\.org\/api/);
assert.match(updateScript, /maps\/fire\/monthly/);

const map = await readFile(new URL("../frontend/src/components/maps/PublicMapSection.jsx", import.meta.url), "utf8");
const mapBiomasOverlay = await readFile(new URL("../frontend/src/components/maps/MapBiomasFireOverlay.jsx", import.meta.url), "utf8");
assert.match(map, /riverStations/);
assert.match(map, /firePoints/);
assert.match(map, /emergencyPoints/);
assert.match(map, /activeLayer/);
assert.match(map, /MapBiomasFireOverlay/);
assert.match(mapBiomasOverlay, /burnedArea\?\.rasterUrl/);
assert.match(map, /trend\.arrow/);

const styles = await readFile(new URL("../frontend/src/styles.css", import.meta.url), "utf8");
assert.match(styles, /\.tone-normal/);
assert.match(styles, /\.tone-emergency/);
assert.match(styles, /status-chip/);

console.log("Integracoes oficiais INPE, ANA, S2ID e MapBiomas validadas.");

import assert from 'node:assert/strict';
import { parseEmergencyIndicator } from '../frontend/src/services/publishedSnapshotParser.js';
import { buildStateDashboard } from '../frontend/src/services/stateDashboard.js';
import { monitoringFallback } from '../frontend/src/data/monitoringFallback.js';

const now = new Date().toISOString();
const confirmed = new Date(Date.now() - 3600000).toISOString();
const product = {
  atualizadoEm: confirmed, fonte: 'S2ID / SEDEC-MIDR',
  resumo: { federal: 2, se: 2, ecp: 0 },
  reconhecimentos_vigentes: [
    { municipio: 'Filadélfia', latitude: -7.33, longitude: -47.50 },
    { municipio: 'Formoso do Araguaia', latitude: -11.80, longitude: -49.53 }
  ]
};
const failed = {
  atualizado_em: now, s2id: product,
  qualidade_fontes: { s2id: { status: 'erro', ultimoSucesso: confirmed, ultimaTentativa: now, erro: 'Portal S2ID indisponível (HTTP 403)' } },
  erros_atualizacao: { s2id: 'Portal S2ID indisponível (HTTP 403)' }
};
const indicator = parseEmergencyIndicator(failed, monitoringFallback.emergency);
assert.equal(indicator.lastConfirmed?.federal, 2, 'Preserve a dated last confirmation separately from the failed current query');
assert.equal(indicator.state, 'error');
assert.equal(indicator.federal, null, 'Previous count cannot be an active federal total');
assert.deepEqual(indicator.points, [], 'Previous records cannot color the active recognition layer');
const card = buildStateDashboard({ ...monitoringFallback, emergency: indicator }).cards.find(item => item.id === 'emergency');
assert.match(card.value, /2.*última consulta/i);
assert.equal(card.statusLabel, 'Atualização pendente');
assert.match(card.description, /vigência.*fonte oficial/i);
assert(card.facts.some(item => /Última tentativa/.test(item.label) && item.value !== 'Horário não informado'));
assert.equal(card.stampLabel, 'Última confirmação');

for (const metadata of [{}, { ultimoSucesso: '2020-01-01T00:00:00Z' }, { ultimoSucesso: new Date(Date.now() + 3600000).toISOString() }]) {
  const item = parseEmergencyIndicator({ ...failed, qualidade_fontes: { s2id: { status: 'erro', ultimaTentativa: now, ...metadata } } }, monitoringFallback.emergency);
  assert.equal(item.lastConfirmed, undefined, 'Global timestamp, old or future dates cannot confirm stored counts');
}
const nullCount = parseEmergencyIndicator({ ...failed, s2id: { ...product, resumo: { federal: null } } }, monitoringFallback.emergency);
assert.equal(nullCount.lastConfirmed, undefined);
const empty = parseEmergencyIndicator({ ...failed, erros_atualizacao: {}, s2id: { ...product, resumo: { federal: 0, se: 0, ecp: 0 }, reconhecimentos_vigentes: [] }, qualidade_fontes: { s2id: { status: 'ok', ultimoSucesso: now } } }, monitoringFallback.emergency);
assert.equal(empty.state, 'ready');
assert.equal(empty.federal, 0, 'A successful empty query is a confirmed zero');
const unqueried = parseEmergencyIndicator({ atualizado_em: now, s2id: product }, monitoringFallback.emergency);
assert.equal(unqueried.state, 'error', 'A global update without S2ID provenance cannot confirm recognitions');
console.log('S2ID recovery: current/last-confirmed separation, errors, dates, missing values and confirmed zero passed.');

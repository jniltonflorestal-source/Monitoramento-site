import assert from 'node:assert/strict';
import { buildStateDashboard } from '../frontend/src/services/stateDashboard.js';
import { monitoringFallback } from '../frontend/src/data/monitoringFallback.js';
import { parseFireIndicator } from '../frontend/src/services/publishedSnapshotParser.js';

const empty = buildStateDashboard(monitoringFallback);
assert.equal(empty.cards.length, 8);
assert.deepEqual(empty.cards.map(card=>card.id), ['alerts','rain','rivers','fire','burned','drought','emergency','health']);
assert(!empty.cards.some(card=>card.value === '0'), 'Missing data cannot become an occurrence count');
const now = new Date().toISOString();
const data = {
  ...monitoringFallback, attemptedAt:now,
  alerts:{...monitoringFallback.alerts,state:'ready',cemadenCount:0,inmetCount:0,observedAt:now,details:[]},
  rain:{...monitoringFallback.rain,state:'ready',updatedAt:now,stations:[{amount:0,city:'Palmas',statusLeitura:'valida'}],sourceBreakdown:{CEMADEN:{status:'ready',registeredCount:1,validCount:1}}},
  rivers:{...monitoringFallback.rivers,state:'ready',quality:{status:'catalog'},stations:[{code:'1'}]},
  fire:{...monitoringFallback.fire,state:'error',burnedArea:{hectares:0,period:'Janeiro a agosto de 2026',source:'MapBiomas',quality:{status:'current'}}},
};
const model = buildStateDashboard(data);
assert.equal(model.cards.find(c=>c.id==='alerts').value, '0');
assert.equal(model.cards.find(c=>c.id==='rain').value,'0,0 mm');
assert.equal(model.cards.find(c=>c.id==='burned').value,'0 ha', 'Burned area is independent of INPE availability');
assert.equal(model.cards.find(c=>c.id==='rivers').statusLabel,'Cadastro');
assert.equal(model.cards.find(c=>c.id==='fire').value,'Indisponível');
assert(model.health.available < model.health.total, 'Inventory must not count as a current measurement');
const fire = buildStateDashboard({...data,fire:{...data.fire,state:'ready',value:'3 focos',period:'Arquivo diario INPE',referenceFile:'20261005',points:[{city:'Palmas'},{city:'Palmas'},{city:'Gurupi'}]}}).cards.find(c=>c.id==='fire');
assert.match(fire.description,/arquivo diário/i);
assert(fire.facts.some(fact=>fact.value.includes('Palmas')));
console.log('State dashboard: eight cards, nulls, zero, independent products and honest periods passed.');
const independent = parseFireIndicator({atualizado_em:now, erros_atualizacao:{focos_calor_inpe:'unavailable'},area_queimada:{area_queimada_ha:12,periodo:'Janeiro a agosto de 2026'}},monitoringFallback.fire);
assert.equal(independent.state,'error');
assert.equal(independent.burnedArea.hectares,12);
assert.equal(independent.burnedArea.quality.status,'current');
const incomplete=buildStateDashboard({...data,alerts:{...data.alerts,cemadenCount:null}}).cards[0];
assert.equal(incomplete.statusLabel,'Consulta parcial');
assert.doesNotMatch(incomplete.description,/Nenhum aviso/);

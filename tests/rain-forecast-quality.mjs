import assert from 'node:assert/strict';
import {getPrevisaoTocantinsInmet} from '../frontend/src/services/inmetPrevisao.js';
let calls=0;
const first=new Date(),second=new Date(Date.now()+86400000),fmt=day=>day.toLocaleDateString('pt-BR');
globalThis.fetch=async(url,options)=>{
 calls++;assert.ok(options?.signal,'Forecast requests need a deadline');
 const code=url.split('/').at(-1);
 return {ok:true,json:async()=>({[code]:{[fmt(first)]:{manha:{resumo:'Pancadas de chuva',temp_min:null,temp_max:'32'}},[fmt(second)]:{manha:{resumo:'Nublado',temp_min:'24',temp_max:'30'}}}})};
};
const [forecast24,forecast48]=await Promise.all([getPrevisaoTocantinsInmet('forecast24'),getPrevisaoTocantinsInmet('forecast48')]);
assert.equal(calls,10,'Same city query is shared between periods');
assert.equal(forecast24.above10,null,'Textual rain forecasts cannot imply millimetre thresholds');
assert.equal(forecast24.above30,null);
assert.equal(forecast24.points[0].tempMin,null,'Missing temperature is not zero');
assert.equal(forecast48.points[0].tempMin,24);
console.log('Rain forecast quality: bounded requests, shared queries, null temperatures and no invented mm thresholds passed.');

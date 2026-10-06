import assert from 'node:assert/strict';
import {fetchSource} from '../scripts/source-fetch.mjs';
let calls=0;
await fetchSource('https://example.test',{},async()=>{if(!calls++)throw Error('timeout');return new Response('{}');},async()=>{});
assert.equal(calls,2);
for(const code of [401,403,404]){calls=0;const r=await fetchSource('https://example.test',{},async()=>{calls++;return new Response('',{status:code});},async()=>{});assert.equal(r.status,code);assert.equal(calls,1);}
calls=0;
const result=await fetchSource('https://example.test',{},async()=>new Response('',{status:++calls===1?503:200}),async()=>{});
assert.equal(result.status,200);
assert.equal(calls,2);
console.log('Source retry: bounded transient failures; no auth or missing-endpoint retry.');

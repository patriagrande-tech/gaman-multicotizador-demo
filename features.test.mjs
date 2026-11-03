import {test} from 'node:test';
import assert from 'node:assert/strict';
import {offersFor,selection} from './model.mjs';
test('partial results preserve the successful company and distinguish failures',()=>{
 assert.equal(offersFor('A','partial').offers.length,3);
 assert.equal(offersFor('B','partial').offers.length,0);
 assert.notEqual(offersFor('B','partial').status,offersFor('C','partial').status);
});
test('selection permits removal at the three-offer limit',()=>{
 assert.deepEqual(selection(['A-rc','B-rc','C-rc'],'A-tr'),['A-rc','B-rc','C-rc']);
 assert.deepEqual(selection(['A-rc','B-rc','C-rc'],'B-rc'),['A-rc','C-rc']);
});
test('offers have independent identifiers across companies and stable period',()=>{
 const offers=['A','B','C'].flatMap(c=>offersFor(c,'normal').offers);
 assert.equal(new Set(offers.map(o=>o.id)).size,9);
 assert(offers.every(o=>o.period==='Mensual de ejemplo'&&o.validity.includes('sin validez comercial')));
});

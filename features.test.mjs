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
test('price depends on the risk: age, use and zone',()=>{
 const price=r=>offersFor('A','normal',r).offers.find(o=>o.id==='A-tr').price;
 const base={marca:'Toyota',anio:'2022',uso:'Particular',localidad:'1640'};
 assert.notEqual(price(base),price({...base,anio:'2010'}));
 assert(price({...base,uso:'Comercial'})>price(base));
 assert(price({...base,localidad:'1001'})>price({...base,localidad:'5000'}));
 assert(offersFor('A','normal',{...base,anio:'2010'}).offers[0].sum<offersFor('A','normal',base).offers[0].sum);
});
test('no single company is cheapest in every plan',()=>{
 const risk={marca:'Toyota',anio:'2022',uso:'Particular',localidad:'1640'};
 const all=['A','B','C'].flatMap(c=>offersFor(c,'normal',risk).offers);
 const winners=new Set(['rc','tc','tr'].map(id=>all.filter(o=>o.id.endsWith(id)).sort((a,b)=>a.price-b.price)[0].company));
 assert.equal(winners.size,3);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {offersFor, selection, plans} from './model.mjs';

const base = {marca: 'Toyota', anio: '2022', uso: 'Particular', localidad: '1640'};
const price = (risk, id = 'tr', company = 'A') => offersFor(company, 'normal', risk).offers.find(o => o.id === `${company}-${id}`).price;

test('partial results preserve the successful company and distinguish failures', () => {
  assert.equal(offersFor('A', 'partial').offers.length, plans.length);
  assert.equal(offersFor('B', 'partial').offers.length, 0);
  assert.notEqual(offersFor('B', 'partial').status, offersFor('C', 'partial').status);
});
test('selection permits removal at the three-offer limit', () => {
  assert.deepEqual(selection(['A-rc', 'B-rc', 'C-rc'], 'A-tr'), ['A-rc', 'B-rc', 'C-rc']);
  assert.deepEqual(selection(['A-rc', 'B-rc', 'C-rc'], 'B-rc'), ['A-rc', 'C-rc']);
});
test('offers have independent identifiers, a quote number and a price breakdown', () => {
  const results = ['A', 'B', 'C'].map(c => offersFor(c, 'normal', base));
  const offers = results.flatMap(r => r.offers);
  assert.equal(new Set(offers.map(o => o.id)).size, 3 * plans.length);
  assert.equal(new Set(results.map(r => r.number)).size, 3);
  for (const o of offers) {
    assert.equal(o.period, 'por mes');
    assert.ok(o.net < o.premium && o.cash < o.premium);
    assert.equal(o.premium, o.price * 12);
  }
});
test('price depends on the risk: age, use and zone', () => {
  assert.notEqual(price(base), price({...base, anio: '2010'}));
  assert(price({...base, uso: 'Comercial'}) > price(base));
  assert(price({...base, localidad: '1001'}) > price({...base, localidad: '5000'}));
  assert(offersFor('A', 'normal', {...base, anio: '2010'}).offers[0].sum < offersFor('A', 'normal', base).offers[0].sum);
});
test('no single company is cheapest in every plan', () => {
  const all = ['A', 'B', 'C'].flatMap(c => offersFor(c, 'normal', base).offers);
  const winners = new Set(plans.map(p => all.filter(o => o.id.endsWith('-' + p.id)).sort((a, b) => a.price - b.price)[0].company));
  assert.equal(winners.size, 3);
});
test('additional coverages move the price the way the contract implies', () => {
  assert(price({...base, ajuste: '20%'}) > price(base));
  assert.equal(price({...base, ajuste: '20%'}, 'rc'), price(base, 'rc'));
  assert(price({...base, rc_ampliada: '100%'}, 'rc') > price(base, 'rc'));
  assert(price({...base, conosur: 'Sí'}) > price(base));
  assert(price({...base, alarma: 'Sí'}) < price(base));
  assert(price({...base, pago: 'Efectivo'}) > price(base));
  assert.equal(offersFor('A', 'normal', {...base, pago: 'Efectivo'}).offers[0].cash, null);
});
test('semester billing quotes six months with a small discount', () => {
  const semester = offersFor('A', 'normal', {...base, facturacion: 'Semestral'}).offers.find(o => o.id === 'A-tr');
  assert.equal(semester.period, 'por semestre');
  assert(semester.price < price(base) * 6 && semester.price > price(base) * 5.5);
});

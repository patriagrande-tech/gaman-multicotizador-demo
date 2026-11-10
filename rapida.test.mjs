import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, riskFrom, quote, proposalText, whatsappUrl, PLAN_ORDER} from './rapida.mjs';
import {plateLookup} from './vehicles.mjs';

test('entiende patente y código postal en un mismo mensaje', () => {
  assert.deepEqual(parse('ab 123 cd 2000'), {plate: 'AB123CD', cp: '2000'});
  assert.equal(parse('cotizame ABC-123, cp 1425').cp, '1425');
  assert.equal(parse('ABC123').plate, 'ABC123');
});

test('un número suelto es código postal solo si se lo pidió', () => {
  assert.equal(parse('2015').cp, undefined);
  assert.equal(parse('5000', {expect: 'cp'}).cp, '5000');
  assert.equal(parse('S2000ABC', {expect: 'cp'}).cp, '2000');
  assert.equal(parse('0999', {expect: 'cp'}).cp, undefined);
});

test('reconoce uso, cliente y confirmaciones', () => {
  assert.equal(parse('lo usa para Uber').uso, 'Comercial');
  assert.equal(parse('AB123CD para Juan Pérez').cliente, 'Juan Pérez');
  assert.equal(parse('para uso particular').cliente, undefined);
  assert.equal(parse('Sí, es ese').yes, true);
  assert.equal(parse('no').no, true);
});

test('cotiza en todas las compañías y elige la mejor por cobertura', () => {
  const v = plateLookup('AB123CD');
  const risk = riskFrom({vehicle: v, plate: 'AB123CD', cp: '2000'});
  assert.equal(risk.uso, 'Particular');
  assert.equal(risk.patente, 'AB 123 CD');
  const {all, best} = quote(risk);
  assert.equal(all.length, 12);
  assert.deepEqual(best.map(o => o.id.split('-')[1]), PLAN_ORDER);
  for (const o of best) assert.ok(all.filter(x => x.id.endsWith(o.id.slice(1))).every(x => x.price >= o.price));
});

test('arma el mensaje y el enlace de WhatsApp', () => {
  const risk = riskFrom({vehicle: plateLookup('AB123CD'), plate: 'AB123CD', cp: '2000', cliente: 'Juan Pérez'});
  const text = proposalText(risk, quote(risk).best, 'Ana');
  assert.match(text, /^¡Hola Juan! Te paso las opciones para tu Toyota Corolla/);
  assert.match(text, /ficticios/);
  assert.equal(whatsappUrl('hola', '341 555-1234'), 'https://wa.me/5493415551234?text=hola');
  assert.equal(whatsappUrl('hola', '+54 341 5551234'), 'https://wa.me/5493415551234?text=hola');
  assert.equal(whatsappUrl('a b'), 'https://wa.me/?text=a%20b');
});

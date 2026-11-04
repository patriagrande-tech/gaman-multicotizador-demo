import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatPlate, plateKind, plateLookup, postcodePlace, referenceValue, versions, brands, THIS_YEAR} from './vehicles.mjs';

test('plates are formatted while typing and validated in both formats', () => {
  assert.equal(formatPlate('ab123cd'), 'AB 123 CD');
  assert.equal(formatPlate('abc-123'), 'ABC 123');
  assert.equal(formatPlate('ab1'), 'AB 1');
  assert.equal(plateKind('AB 123 CD'), 'mercosur');
  assert.equal(plateKind('abc123'), 'anterior');
  assert.equal(plateKind('A1'), null);
});

test('plate lookup is deterministic and consistent with the catalog year', () => {
  assert.deepEqual(plateLookup('AB123CD'), plateLookup('ab 123 cd'));
  for (const p of ['AF123BC', 'AA001AA', 'KLM456', 'PQR999']) {
    const v = plateLookup(p);
    assert.ok(v, p);
    assert.ok(versions(v.marca, v.modelo, v.anio).includes(v.version), p);
    assert.ok(plateKind(p) === 'mercosur' ? v.anio >= 2016 : v.anio <= 2016, p);
  }
  assert.equal(plateLookup('nada'), null);
});

test('catalog cascades by year and gives a reference value', () => {
  assert.ok(brands(THIS_YEAR).length > 3);
  assert.ok(!versions('Ford', 'Ka', THIS_YEAR).length);
  const nuevo = referenceValue({marca: 'Toyota', modelo: 'Corolla', version: 'XEI 2.0 CVT', anio: THIS_YEAR});
  const usado = referenceValue({marca: 'Toyota', modelo: 'Corolla', version: 'XEI 2.0 CVT', anio: THIS_YEAR - 6});
  assert.ok(nuevo > usado && usado > 0);
  assert.equal(referenceValue({marca: 'Toyota', modelo: 'Corolla', version: 'Inexistente', anio: 2020}), null);
});

test('postcodes resolve to a place and reject invalid input', () => {
  assert.equal(postcodePlace('1640'), 'Martínez, Buenos Aires');
  assert.equal(postcodePlace('B1640ABC'), 'Martínez, Buenos Aires');
  assert.equal(postcodePlace('1425'), 'Ciudad de Buenos Aires');
  assert.equal(postcodePlace('zzz'), null);
  assert.equal(postcodePlace('0123'), null);
});

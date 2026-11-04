// Catálogo ficticio de vehículos (tipo InfoAuto) y búsqueda simulada por patente.
// Cada versión: [nombre, año desde, año hasta, valor 0 km de referencia en ARS].
export const CATALOG = {
  Chevrolet: {
    Corsa: [['Classic 1.4', 1995, 2016, 13e6], ['Classic 1.4 Super', 1995, 2016, 14e6]],
    Onix: [['LT 1.0T', 2020, 2027, 24e6], ['Premier 1.0T AT', 2020, 2027, 29e6]],
    Cruze: [['LT 1.4T', 2016, 2025, 33e6], ['Premier 1.4T AT', 2016, 2025, 39e6]],
    Tracker: [['LT 1.2T', 2020, 2027, 32e6], ['Premier 1.2T AT', 2020, 2027, 38e6]],
  },
  Fiat: {
    Palio: [['Fire 1.4', 1997, 2017, 12e6], ['Attractive 1.4', 1997, 2017, 13e6]],
    Cronos: [['Drive 1.3', 2018, 2027, 24e6], ['Precision 1.8 AT', 2018, 2027, 29e6]],
    Argo: [['Drive 1.3', 2018, 2025, 21e6], ['HGT 1.8', 2018, 2025, 25e6]],
    Toro: [['Freedom 1.8 4x2', 2016, 2027, 36e6], ['Volcano 2.0 4x4 AT', 2016, 2027, 46e6]],
  },
  Ford: {
    Focus: [['S 1.6', 1999, 2019, 20e6], ['Titanium 2.0 AT', 1999, 2019, 25e6]],
    Ka: [['S 1.5', 2015, 2021, 14e6], ['SEL 1.5', 2015, 2021, 16e6]],
    Ranger: [['XL 2.2 4x2', 2012, 2027, 40e6], ['XLT 3.2 4x4', 2012, 2023, 52e6], ['Limited 3.0 V6 4x4', 2023, 2027, 72e6]],
    Territory: [['Trend 1.5T', 2021, 2027, 40e6], ['Titanium 1.5T', 2021, 2027, 46e6]],
  },
  Peugeot: {
    '206': [['XR 1.4', 1999, 2015, 12e6], ['XS 1.6', 1999, 2015, 14e6]],
    '208': [['Active 1.6', 2013, 2027, 23e6], ['Feline 1.6 AT', 2013, 2027, 28e6]],
    '2008': [['Allure 1.6', 2016, 2027, 31e6], ['GT 1.0T AT', 2016, 2027, 37e6]],
    Partner: [['Confort 1.6 HDi', 2010, 2027, 26e6]],
  },
  Renault: {
    Clio: [['Mío 1.2', 1995, 2016, 11e6], ['RL 1.6', 1995, 2016, 12e6]],
    Sandero: [['Life 1.6', 2012, 2025, 19e6], ['Intens 1.6 CVT', 2012, 2025, 23e6]],
    Kangoo: [['Life 1.6', 2010, 2027, 25e6], ['Zen 1.6 5 asientos', 2010, 2027, 27e6]],
    Duster: [['Intens 1.6 4x2', 2012, 2027, 30e6], ['Iconic 1.3T 4x4', 2012, 2027, 37e6]],
  },
  Toyota: {
    Etios: [['X 1.5', 2013, 2023, 18e6], ['XLS 1.5 AT', 2013, 2023, 21e6]],
    Corolla: [['XEi 1.8', 1995, 2013, 26e6], ['SEG 1.8 AT', 1995, 2013, 30e6], ['XLI 2.0 CVT', 2014, 2027, 38e6], ['XEI 2.0 CVT', 2014, 2027, 42e6], ['SEG 2.0 CVT', 2014, 2027, 47e6], ['Hybrid SEG', 2020, 2027, 52e6]],
    Hilux: [['DX 2.4 4x2', 2016, 2027, 45e6], ['SR 2.8 4x2 AT', 2016, 2027, 55e6], ['SRV 2.8 4x4 AT', 2016, 2027, 63e6]],
  },
  Volkswagen: {
    Gol: [['1.6 Power', 1995, 2014, 12e6], ['1.6 GLD', 1995, 2014, 13e6]],
    'Gol Trend': [['Trendline 1.6', 2009, 2023, 16e6], ['Comfortline 1.6', 2009, 2023, 18e6], ['Highline 1.6', 2009, 2023, 20e6]],
    Polo: [['Track 1.6', 2018, 2027, 24e6], ['Highline 1.0T AT', 2018, 2027, 30e6]],
    Amarok: [['Trendline 2.0 4x2', 2010, 2027, 44e6], ['Highline V6 4x4 AT', 2017, 2027, 66e6]],
  },
};

export const THIS_YEAR = new Date().getFullYear();
export function years() { return Array.from({length: THIS_YEAR + 2 - 1995}, (_, i) => THIS_YEAR + 1 - i); }
export function brands(year) { return Object.keys(CATALOG).filter(b => models(b, year).length); }
export function models(brand, year) { return Object.keys(CATALOG[brand] || {}).filter(m => versions(brand, m, year).length); }
export function versions(brand, model, year) {
  return ((CATALOG[brand] || {})[model] || []).filter(([, from, to]) => !year || (year >= from && year <= to)).map(([name]) => name);
}
// Valor de referencia ficticio: precio 0 km con depreciación por antigüedad.
export function referenceValue({marca, modelo, version, anio}) {
  const row = ((CATALOG[marca] || {})[modelo] || []).find(([name]) => name === version);
  if (!row || !anio) return null;
  const age = Math.max(0, THIS_YEAR - Number(anio));
  return Math.round(row[3] * Math.max(0.28, 1 - age * 0.065) / 100000) * 100000;
}

export function normalizePlate(text) { return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7); }
export function formatPlate(text) {
  const p = normalizePlate(text);
  if (/^[A-Z]{2}\d/.test(p)) return [p.slice(0, 2), p.slice(2, 5), p.slice(5, 7)].filter(Boolean).join(' ');
  if (/^[A-Z]{3}/.test(p)) return [p.slice(0, 3), p.slice(3, 6)].filter(Boolean).join(' ');
  return p;
}
export function plateKind(text) {
  const p = normalizePlate(text);
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(p)) return 'mercosur';
  if (/^[A-Z]{3}\d{3}$/.test(p)) return 'anterior';
  return null;
}

const SAMPLES = {
  AB123CD: {marca: 'Toyota', modelo: 'Corolla', version: 'XEI 2.0 CVT', anio: 2022},
  ABC123: {marca: 'Volkswagen', modelo: 'Gol Trend', version: 'Trendline 1.6', anio: 2015},
  AD456FG: {marca: 'Ford', modelo: 'Ranger', version: 'XLT 3.2 4x4', anio: 2020},
  AE789HJ: {marca: 'Fiat', modelo: 'Cronos', version: 'Drive 1.3', anio: 2023},
};
export const SAMPLE_PLATES = Object.keys(SAMPLES);

// Simula al proveedor de patentes: devuelve marca, modelo y año; la versión siempre se confirma.
export function plateLookup(text) {
  const p = normalizePlate(text), kind = plateKind(p);
  if (!kind) return null;
  if (SAMPLES[p]) return {...SAMPLES[p], plate: p, sample: true};
  let h = 0;
  for (const ch of p) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // El año sale de la serie de la patente: las Mercosur avanzan por la segunda letra desde 2016.
  const year = kind === 'mercosur'
    ? Math.min(THIS_YEAR, 2016 + Math.floor((p.charCodeAt(1) - 65) * 1.4))
    : Math.min(2016, 1995 + Math.floor((p.charCodeAt(0) - 65) * 1.3));
  const options = [];
  for (const marca of Object.keys(CATALOG)) for (const modelo of models(marca, year)) for (const version of versions(marca, modelo, year)) options.push({marca, modelo, version});
  if (!options.length) return null;
  return {...options[h % options.length], anio: year, plate: p, sample: false};
}

// Localidad de referencia para el código postal (muestra, no padrón completo).
const PLACES = {
  1640: 'Martínez, Buenos Aires', 1636: 'Olivos, Buenos Aires', 1642: 'San Isidro, Buenos Aires', 1704: 'Ramos Mejía, Buenos Aires',
  1708: 'Morón, Buenos Aires', 1824: 'Lanús, Buenos Aires', 1878: 'Quilmes, Buenos Aires', 1900: 'La Plata, Buenos Aires',
  7600: 'Mar del Plata, Buenos Aires', 8000: 'Bahía Blanca, Buenos Aires', 2000: 'Rosario, Santa Fe', 3000: 'Santa Fe, Santa Fe',
  5000: 'Córdoba, Córdoba', 5500: 'Mendoza, Mendoza', 4000: 'San Miguel de Tucumán, Tucumán', 4400: 'Salta, Salta',
  8300: 'Neuquén, Neuquén', 3100: 'Paraná, Entre Ríos', 9000: 'Comodoro Rivadavia, Chubut', 1629: 'Pilar, Buenos Aires',
};
const REGIONS = {1: 'Gran Buenos Aires', 2: 'Santa Fe / norte de Buenos Aires', 3: 'Litoral y NEA', 4: 'NOA', 5: 'Córdoba y Cuyo', 6: 'Oeste de Buenos Aires / La Pampa', 7: 'Sur de Buenos Aires', 8: 'Patagonia norte', 9: 'Patagonia sur'};
export function postcodePlace(text) {
  const t = String(text || '').trim().toUpperCase();
  const digits = /^\d{4}$/.test(t) ? t : /^[A-Z]\d{4}[A-Z]{3}$/.test(t) ? t.slice(1, 5) : null;
  if (!digits) return null;
  const n = Number(digits);
  if (n < 1000) return null;
  if (PLACES[n]) return PLACES[n];
  if (n >= 1000 && n < 1500) return 'Ciudad de Buenos Aires';
  return REGIONS[digits[0]] || null;
}

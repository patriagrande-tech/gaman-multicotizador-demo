// Red ficticia y determinística para la demo: mismas cifras en cada carga.
// Proporciones inspiradas en lo que publica Gaman (≈2.100 PAS, 40 PEG, 26 InHouse, 24 socios federales, 58 organizadores).

function rng(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

const FIRST = ['Martín', 'Lucía', 'Sebastián', 'Carolina', 'Diego', 'Florencia', 'Javier', 'Valeria', 'Pablo', 'Mariana', 'Gustavo', 'Romina', 'Hernán', 'Paula', 'Federico', 'Natalia', 'Alejandro', 'Silvina', 'Matías', 'Gabriela', 'Nicolás', 'Andrea', 'Ezequiel', 'Laura', 'Rodrigo', 'Daniela', 'Gonzalo', 'Verónica', 'Leandro', 'Soledad'];
const LAST = ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Díaz', 'Pérez', 'Sánchez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Gutiérrez', 'Pereyra', 'Molina', 'Castro', 'Ortiz', 'Silva', 'Núñez', 'Rojas'];
const CITIES = [['CABA', 'Buenos Aires'], ['La Plata', 'Buenos Aires'], ['Mar del Plata', 'Buenos Aires'], ['Bahía Blanca', 'Buenos Aires'], ['Quilmes', 'Buenos Aires'], ['Lomas de Zamora', 'Buenos Aires'], ['Morón', 'Buenos Aires'], ['San Isidro', 'Buenos Aires'], ['Pilar', 'Buenos Aires'], ['Tandil', 'Buenos Aires'], ['Junín', 'Buenos Aires'], ['Pergamino', 'Buenos Aires'], ['Olavarría', 'Buenos Aires'], ['Luján', 'Buenos Aires'], ['Zárate', 'Buenos Aires'], ['Rosario', 'Santa Fe'], ['Santa Fe', 'Santa Fe'], ['Rafaela', 'Santa Fe'], ['Venado Tuerto', 'Santa Fe'], ['Reconquista', 'Santa Fe'], ['Córdoba', 'Córdoba'], ['Río Cuarto', 'Córdoba'], ['Villa María', 'Córdoba'], ['San Francisco', 'Córdoba'], ['Villa Carlos Paz', 'Córdoba'], ['Mendoza', 'Mendoza'], ['San Rafael', 'Mendoza'], ['Tucumán', 'Tucumán'], ['Salta', 'Salta'], ['Jujuy', 'Jujuy'], ['Neuquén', 'Neuquén'], ['Cipolletti', 'Río Negro'], ['Bariloche', 'Río Negro'], ['Paraná', 'Entre Ríos'], ['Concordia', 'Entre Ríos'], ['Gualeguaychú', 'Entre Ríos'], ['Corrientes', 'Corrientes'], ['Resistencia', 'Chaco'], ['Posadas', 'Misiones'], ['Oberá', 'Misiones'], ['Santiago del Estero', 'Santiago del Estero'], ['San Juan', 'San Juan'], ['San Luis', 'San Luis'], ['Villa Mercedes', 'San Luis'], ['La Rioja', 'La Rioja'], ['Catamarca', 'Catamarca'], ['Formosa', 'Formosa'], ['Santa Rosa', 'La Pampa'], ['General Pico', 'La Pampa'], ['Comodoro Rivadavia', 'Chubut'], ['Trelew', 'Chubut'], ['Puerto Madryn', 'Chubut'], ['Río Gallegos', 'Santa Cruz'], ['Ushuaia', 'Tierra del Fuego'], ['Campana', 'Buenos Aires'], ['Necochea', 'Buenos Aires'], ['Azul', 'Buenos Aires'], ['Chivilcoy', 'Buenos Aires']];

export const COMPANIES = ['Compañía A', 'Compañía B', 'Compañía C', 'Compañía D', 'Compañía E', 'Compañía F'];
export const SEGMENTS = {peg: 'PEG', inhouse: 'InHouse', federal: 'Socio federal', pas: 'PAS'};
export const UNITS = ['Prevención', 'Salud', 'Soluciones'];
export const MONTHS = (() => {
  const out = [], d = new Date();
  d.setDate(1);
  for (let i = 11; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(m.toLocaleDateString('es-AR', {month: 'short', year: '2-digit'}).replace('.', '')); }
  return out;
})();
// Estacionalidad suave y crecimiento: forma común de la producción mensual.
const SHAPE = MONTHS.map((_, i) => (0.86 + i * 0.022) * (1 + 0.06 * Math.sin((i + 2) / 12 * 2 * Math.PI)));

export const ORGANIZERS = CITIES.map(([city, province], i) => ({id: `O${String(i + 1).padStart(2, '0')}`, name: `Organización ${city}`, city, province}));
export const DEMO_ORGANIZER = ORGANIZERS[15].id; // Organización Rosario

let cache = null;
export function network() {
  if (cache) return cache;
  const r = rng(2026);
  const total = 2140;
  const segments = [...Array(40).fill('peg'), ...Array(26).fill('inhouse'), ...Array(24).fill('federal'), ...Array(total - 90).fill('pas')];
  for (let i = segments.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [segments[i], segments[j]] = [segments[j], segments[i]]; }
  const producers = segments.map((segment, i) => {
    const boost = {peg: 3.2, inhouse: 1.6, federal: 2.1, pas: 1}[segment];
    const organizer = segment === 'inhouse' ? null : ORGANIZERS[Math.floor(Math.pow(r(), 1.4) * ORGANIZERS.length)];
    const policies = Math.round(Math.exp(3.4 + r() * 2) * boost);
    const premium = 110000 + r() * 90000;
    // Participación de mercado ficticia: la cartera se concentra en pocas compañías.
    const weights = [0.3, 0.22, 0.17, 0.14, 0.1, 0.07].map(s => s * (0.4 + r() * 1.2));
    const sum = weights.reduce((a, b) => a + b, 0);
    const inactive = r() < 0.11;
    const quotes = inactive ? Math.round(r() * 3) : Math.round(policies * (0.12 + r() * 0.35));
    return {
      id: `P${String(i + 1).padStart(4, '0')}`,
      name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
      license: String(41000 + i * 7 + Math.floor(r() * 7)),
      segment, organizer: organizer?.id || null, city: organizer?.city || 'CABA', province: organizer?.province || 'Buenos Aires',
      policies, annualPremium: Math.round(policies * premium * 12),
      retention: Math.min(98, Math.round(72 + r() * 22 + (segment === 'peg' ? 4 : 0))),
      renewals30: Math.round(policies * (0.06 + r() * 0.04)),
      quotes, issued: Math.round(quotes * (0.18 + r() * 0.22)),
      rejections: Math.round(policies * r() * 0.035),
      lastActive: inactive ? 31 + Math.round(r() * 90) : Math.round(r() * 9),
      mix: weights.map(w => w / sum),
      noise: MONTHS.map(() => 0.9 + r() * 0.2),
    };
  });
  const units = ['Prevención', 'Salud', 'Soluciones'], states = ['Nueva', 'Contactada', 'Propuesta enviada', 'Ganada', 'Ganada', 'Perdida'];
  const referrals = Array.from({length: 36}, (_, i) => {
    const p = producers[Math.floor(r() * producers.length)];
    const company = `${pick(r, ['Metalúrgica', 'Logística', 'Agro', 'Construcciones', 'Alimentos', 'Transporte', 'Textil', 'Química'])} ${pick(r, ['del Sur', 'Norte', 'Pampa', 'Andina', 'Litoral', 'Central'])} S.A.`;
    return {id: `D${100 + i}`, producer: p.id, client: company, employees: 20 + Math.round(r() * 380), unit: pick(r, units), state: pick(r, states), days: Math.round(r() * 60)};
  });
  cache = {producers, referrals};
  return cache;
}

export function monthly(producers) {
  return MONTHS.map((month, i) => ({month, value: producers.reduce((s, p) => s + p.annualPremium / 12 * SHAPE[i] * p.noise[i], 0)}));
}
export function byCompany(producers) {
  return COMPANIES.map((name, i) => ({name, value: producers.reduce((s, p) => s + p.policies * p.mix[i], 0)})).sort((a, b) => b.value - a.value);
}
export function producerById(id) { return network().producers.find(p => p.id === id); }
export function organizerById(id) { return ORGANIZERS.find(o => o.id === id); }

// Meta PEG ficticia: prima anual y retención.
export const PEG_GOAL = {premium: 1_000_000_000, retention: 90};
export function pegProgress(p) {
  return Math.min(100, Math.round((Math.min(1, p.annualPremium / PEG_GOAL.premium) * 0.7 + Math.min(1, p.retention / PEG_GOAL.retention) * 0.3) * 100));
}

const RAMOS = ['Automotores', 'Automotores', 'Automotores', 'Hogar', 'Moto', 'Vida', 'Comercio'];
const BUSINESS = ['Panadería', 'Ferretería', 'Estudio contable', 'Taller', 'Distribuidora', 'Farmacia', 'Kiosco', 'Veterinaria'];
const VEHICLES = ['Toyota Corolla', 'Volkswagen Gol', 'Fiat Cronos', 'Ford Ranger', 'Renault Sandero', 'Peugeot 208', 'Chevrolet Onix', 'Toyota Hilux'];
function day(offset) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toLocaleDateString('en-CA'); }

// Cartera ficticia de un productor (muestra de clientes, no la cartera completa).
export function clientsOf(producer) {
  const r = rng(Number(producer.id.slice(1)) * 97 + 13);
  const count = Math.min(40, Math.max(6, Math.round(producer.policies / 4)));
  return Array.from({length: count}, (_, i) => {
    const company = r() < 0.2;
    const name = company ? `${pick(r, BUSINESS)} ${pick(r, LAST)}` : `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const n = 1 + Math.floor(Math.pow(r(), 2) * 3);
    const policies = Array.from({length: n}, (_, j) => {
      const ramo = company && j === 0 ? 'Comercio' : pick(r, RAMOS);
      const pay = r();
      return {
        number: `${String.fromCharCode(65 + Math.floor(r() * 6))}-${100000 + Math.floor(r() * 899999)}`,
        ramo, company: COMPANIES[Math.floor(r() * COMPANIES.length)],
        detail: /Auto|Moto/.test(ramo) ? `${pick(r, VEHICLES)} ${2012 + Math.floor(r() * 13)} · ${String.fromCharCode(65 + Math.floor(r() * 26), 65 + Math.floor(r() * 26))}${100 + Math.floor(r() * 899)}${String.fromCharCode(65 + Math.floor(r() * 26), 65 + Math.floor(r() * 26))}` : ramo === 'Hogar' ? 'Vivienda familiar' : ramo === 'Vida' ? 'Vida individual' : 'Integral de comercio',
        expires: day(Math.round(-15 + r() * 345)),
        premium: Math.round((/Auto/.test(ramo) ? 95000 : 22000) + r() * 80000),
        payment: pay < 0.88 ? 'Al día' : pay < 0.95 ? 'Pendiente' : 'Rechazo de pago',
      };
    });
    const claims = r() < 0.18 ? [{date: day(-Math.round(r() * 200)), type: pick(r, ['Choque', 'Robo parcial', 'Granizo', 'Cristales']), state: pick(r, ['Denunciado', 'En inspección', 'En taller', 'Cerrado'])}] : [];
    const doc = company ? `CUIT 30-${String(Math.floor(r() * 1e8)).padStart(8, '0').slice(0, 2)}.***.***-${Math.floor(r() * 10)}` : `DNI ${20 + Math.floor(r() * 25)}.***.**${Math.floor(r() * 10)}`;
    return {
      index: i, name, type: company ? 'PJ' : 'PF', doc,
      email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}***@mail.com`,
      phone: `+54 9 ${['11', '341', '351', '221', '261'][Math.floor(r() * 5)]} ****-${1000 + Math.floor(r() * 8999)}`,
      since: 2010 + Math.floor(r() * 16), policies, claims,
    };
  });
}

// Ramos que un cliente suele necesitar y todavía no tiene: oportunidades de venta cruzada.
export function opportunities(client) {
  const has = new Set(client.policies.map(p => p.ramo));
  const wanted = client.type === 'PJ' ? ['Comercio', 'ART', 'Automotores', 'Vida'] : ['Automotores', 'Hogar', 'Vida'];
  return wanted.filter(r => !has.has(r));
}

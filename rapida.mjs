// Cotización rápida: lógica de la conversación sin interfaz, para poder probarla.
// En la demo el texto se interpreta con reglas; en el producto real un LLM en el servidor
// extrae los mismos campos de texto libre. Los precios salen siempre del cotizador, nunca del texto.
import {companies, offersFor} from './model.mjs';
import {formatPlate, normalizePlate, plateKind, postcodePlace, referenceValue} from './vehicles.mjs';

export const PLAN_ORDER = ['tr', 'cf', 'tc', 'rc'];
// Los mismos valores por defecto que "Más opciones" en el cotizador completo.
export const DEFAULT_RISK = {
  uso: 'Particular', alarma: 'No', rastreador: 'No', gnc: 'No', grua: 'Sí', ajuste: 'Sin ajuste', rc_ampliada: 'Sin ampliación',
  conosur: 'No', facturacion: 'Mensual', pago: 'Débito automático', iva: 'Consumidor final', persona: 'Física', escenario: 'normal',
};

const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Extrae lo que se pueda de un mensaje: patente, código postal, uso, cliente y la intención.
// expect = 'cp' cuando la última pregunta fue el código postal (un número suelto de 4 cifras es el CP, no un año).
export function parse(text, {expect} = {}) {
  const raw = String(text || '').trim(), up = fold(raw), out = {};
  const plate = up.match(/\b([A-Z]{2})[\s.-]*(\d{3})[\s.-]*([A-Z]{2})\b/) || up.match(/\b([A-Z]{3})[\s.-]*(\d{3})\b/);
  if (plate && plateKind(plate.slice(1).join(''))) out.plate = plate.slice(1).join('');
  const rest = plate ? up.replace(plate[0], ' ') : up;
  const explicit = rest.match(/\b(?:CP|C\.P\.|CODIGO POSTAL)\s*:?\s*([A-Z]?\d{4}(?:[A-Z]{3})?)\b/);
  const loose = rest.match(/\b([A-Z]\d{4}[A-Z]{3}|\d{4})\b/);
  const cp = explicit?.[1] || ((expect === 'cp' || out.plate) && loose?.[1]);
  if (cp && postcodePlace(cp)) out.cp = /^[A-Z]/.test(cp) ? cp.slice(1, 5) : cp;
  if (/\b(COMERCIAL|UBER|CABIFY|DIDI|REMIS|TAXI|REPARTO|TRABAJO)\b/.test(rest)) out.uso = 'Comercial';
  else if (/\bPARTICULAR\b/.test(rest)) out.uso = 'Particular';
  const name = raw.match(/\b[Pp]ara\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/);
  if (name) out.cliente = name[1];
  if (/^(SI|DALE|OK|CORRECTO|ESA|ESE|ES ESA|ES ESE|PERFECTO|CONFIRMO)\b/.test(up)) out.yes = true;
  else if (/^NO\b/.test(up)) out.no = true;
  if (/\bCOTIZ/.test(up)) out.quote = true;
  if (/\b(NUEVA|OTRA COTIZACION|DE NUEVO|EMPEZAR)\b/.test(up)) out.restart = true;
  return out;
}

export function today() { return new Date().toLocaleDateString('en-CA'); }
export const vehicleName = d => [d.marca, d.modelo, d.version].filter(Boolean).join(' ');
export const placeOf = cp => postcodePlace(cp);

// Arma el riesgo con la misma forma que guarda el cotizador completo, para poder retomarlo allí.
export function riskFrom({vehicle, plate, cp, uso, cliente}) {
  const d = {...DEFAULT_RISK, ...vehicle, uso: uso || DEFAULT_RISK.uso, localidad: cp, fecha: today(), cliente: cliente || '', patente: formatPlate(plate)};
  d.anio = String(d.anio);
  d.valor = referenceValue(d) || '';
  return d;
}

// Consulta las compañías y elige la oferta más barata de cada cobertura.
export function quote(risk) {
  const all = [], results = [];
  for (const company of companies) {
    const result = offersFor(company, risk.escenario, risk);
    results.push({company, ...result});
    all.push(...result.offers);
  }
  const best = PLAN_ORDER.map(plan => all.filter(o => o.id.endsWith('-' + plan)).sort((a, b) => a.price - b.price)[0]).filter(Boolean);
  return {all, best, results};
}

const money = n => new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS', maximumFractionDigits: 0}).format(n);

// Texto listo para que el productor lo mande desde su propio WhatsApp.
export function proposalText(d, offers, producer = 'tu productor asesor') {
  const hello = d.cliente ? `¡Hola ${d.cliente.split(' ')[0]}!` : '¡Hola!';
  const lines = offers.map(o => `• ${o.name}: ${money(o.price)} ${o.period} (Compañía ${o.company})`);
  return [
    `${hello} Te paso las opciones para tu ${vehicleName(d)} ${d.anio}${d.patente ? ` (${d.patente})` : ''}:`,
    '', ...lines, '',
    `Uso ${d.uso.toLowerCase()}, vigencia desde el ${d.fecha.split('-').reverse().join('/')}. Precios de referencia, sujetos a la emisión.`,
    `Cualquier duda te ayudo. ${producer}`,
    '(Demo Portal Gaman: compañías y precios ficticios)',
  ].join('\n');
}

// Enlace de WhatsApp: abre el chat del productor con el texto escrito. Sin número, WhatsApp pide elegir el contacto.
export function whatsappUrl(text, phone = '') {
  let digits = String(phone).replace(/\D/g, '').replace(/^0/, '');
  if (digits.length === 10) digits = '549' + digits;          // celular argentino sin prefijo internacional
  else if (/^54(?!9)\d{10}$/.test(digits)) digits = '549' + digits.slice(2);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function samePlate(a, b) { return normalizePlate(a) === normalizePlate(b); }

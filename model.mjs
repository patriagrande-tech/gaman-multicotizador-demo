// Tarifador ficticio. Planes, adicionales y desglose siguen la estructura del contrato de cotización de
// Federación Patronal (v2.1.1): familias de planes, grúa, ajuste automático, RC ampliada, cobertura en países
// limítrofes, refacturación, pago contado y respuesta con prima, premio, cuota y pago contado. Valores ficticios.
export const companies = ['A', 'B', 'C'];
const YES = 'Incluido', NO = 'No incluido';
export const plans = [
  {id: 'rc', name: 'Responsabilidad civil', base: 38500, rc: 'Límite máximo', theft: NO, partial: NO, hail: NO, glass: NO, own: NO, deductible: 'No aplica'},
  {id: 'tc', name: 'Terceros completo', base: 64900, rc: 'Límite máximo', theft: 'Total y parcial', partial: YES, hail: NO, glass: NO, own: 'Solo destrucción total', deductible: 'No aplica'},
  {id: 'cf', name: 'Terceros completo full', base: 74800, rc: 'Límite máximo', theft: 'Total y parcial', partial: YES, hail: YES, glass: 'Cristales y cerraduras', own: 'Solo destrucción total', deductible: 'No aplica'},
  {id: 'tr', name: 'Todo riesgo con franquicia', base: 98700, rc: 'Límite máximo', theft: 'Total y parcial', partial: YES, hail: YES, glass: 'Cristales y cerraduras', own: 'Total y parcial', deductible: '$ 350.000 ficticios'},
];
// Cada compañía es más competitiva en un plan distinto, como en el mercado real.
const appetite = {A: {rc: 1, tc: 1.06, cf: 1.03, tr: 1.05}, B: {rc: 1.07, tc: .98, cf: 1.05, tr: 1.09}, C: {rc: 1.12, tc: 1.04, cf: .99, tr: .96}};
const brandValue = {Toyota: 1.15, Volkswagen: 1, Renault: .9, Ford: 1, Fiat: .85};
const CASCO = {rc: 0, tc: .5, cf: .65, tr: 1}; // peso del valor del auto en cada plan

// Tarifa ficticia pero sensible al riesgo: antigüedad, uso, zona de guarda y valor.
export function riskFactors(risk = {}, now = new Date().getFullYear()) {
  const age = Math.max(0, now - Number(risk.anio || now));
  // Con valor de referencia del catálogo se usa ese; si no, una estimación por marca y antigüedad.
  const sum = Number(risk.valor) > 0 ? Number(risk.valor) : Math.round(28000000 * (brandValue[risk.marca] ?? 1) * Math.max(.25, 1 - age * .06) / 100000) * 100000;
  const cp = String(risk.localidad || '').replace(/\D/g, '');
  const zone = /^1[0-4]/.test(cp) ? 1.25 : /^1[5-9]/.test(cp) ? 1.1 : /^[2-3]/.test(cp) ? 1 : .92;
  const use = risk.uso === 'Comercial' ? 1.3 : 1;
  // GNC suma riesgo; alarma y rastreador lo reducen en los planes que cubren robo.
  const extras = (risk.gnc === 'Sí' ? 1.04 : 1) * (risk.rastreador === 'Sí' ? .95 : 1) * (risk.alarma === 'Sí' ? .97 : 1);
  return {sum, location: zone * use, value: (.6 + .4 * sum / 28000000) * extras};
}

// Adicionales del contrato: recargos sobre la prima según lo elegido.
function surcharge(plan, risk) {
  let f = 1;
  const ajuste = Number(String(risk.ajuste || '').replace(/\D/g, '')) || 0;
  if (plan !== 'rc') f *= 1 + ajuste / 200;                       // ajuste automático de suma (casco)
  f *= 1 + ({'50%': .03, '100%': .06, '150%': .09}[risk.rc_ampliada] || 0); // RC ampliada
  if (risk.conosur === 'Sí' && plan !== 'rc') f *= 1.04;            // casco en países limítrofes
  if (risk.grua === 'No') f *= .98;
  if (risk.pago === 'Efectivo') f *= 1.05;
  return f;
}

let quoteSeq = 129445000;
export function offersFor(company, scenario, risk = {}) {
  if (scenario === 'partial' && company !== 'A') return {status: company === 'B' ? 'Sin oferta para este riesgo (simulado)' : 'Error temporal (simulado)', offers: []};
  const {sum, location, value} = riskFactors(risk);
  const semestral = risk.facturacion === 'Semestral';
  const number = ++quoteSeq;
  return {status: 'Respuesta de ejemplo recibida', number, offers: plans.map(p => {
    // Zona y uso afectan a todos los planes; el valor del auto solo a los que cubren daños o robo.
    const monthly = p.base * location * (1 - CASCO[p.id] + CASCO[p.id] * value) * appetite[company][p.id] * surcharge(p.id, risk);
    const price = Math.round(monthly * (semestral ? 6 * .97 : 1) / 10) * 10;
    const yearly = price * (semestral ? 2 : 12);
    return {
      ...p, id: company + '-' + p.id, company, number, price, sum,
      period: semestral ? 'por semestre' : 'por mes',
      premium: Math.round(yearly / 10) * 10,                     // premio total anual (con impuestos)
      net: Math.round(yearly / 1.31 / 10) * 10,                   // prima de tarifa, sin impuestos ni recargos
      cash: risk.pago === 'Efectivo' ? null : Math.round(yearly * .9 / 10) * 10, // pago contado por débito
      validity: 'Solo demostración; sin validez comercial',
    };
  })};
}
export function selection(current, id) {
  if (current.includes(id)) return current.filter(x => x !== id);
  return current.length < 3 ? [...current, id] : current;
}

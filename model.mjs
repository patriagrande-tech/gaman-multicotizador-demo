export const companies = ['A','B','C'];
export const plans = [
 {id:'rc', name:'Responsabilidad civil', base:38500, theft:'No incluida', own:'No incluidos', deductible:'No aplica', glass:'No incluido'},
 {id:'tc', name:'Terceros completo', base:64900, theft:'Total y parcial (ejemplo)', own:'No incluidos', deductible:'Según condición de ejemplo', glass:'Con límite (ejemplo)'},
 {id:'tr', name:'Todo riesgo', base:98700, theft:'Total y parcial (ejemplo)', own:'Con franquicia (ejemplo)', deductible:'$ 350.000 ficticios', glass:'Con límite (ejemplo)'}
];
// Cada compañía es más competitiva en un plan distinto, como en el mercado real.
const appetite = {A:{rc:1, tc:1.06, tr:1.05}, B:{rc:1.07, tc:.98, tr:1.09}, C:{rc:1.12, tc:1.04, tr:.96}};
const brandValue = {Toyota:1.15, Volkswagen:1, Renault:.9, Ford:1, Fiat:.85};
// Tarifa ficticia pero sensible al riesgo: antigüedad, uso, zona de guarda y marca.
export function riskFactors(risk={}, now=new Date().getFullYear()) {
 const age = Math.max(0, now - Number(risk.anio || now));
 const sum = Math.round(28000000 * (brandValue[risk.marca] ?? 1) * Math.max(.25, 1 - age*.06) / 100000) * 100000;
 const cp = String(risk.localidad || '').replace(/\D/g,'');
 const zone = /^1[0-4]/.test(cp) ? 1.25 : /^1[5-9]/.test(cp) ? 1.1 : /^[2-3]/.test(cp) ? 1 : .92;
 const use = risk.uso === 'Comercial' ? 1.3 : 1;
 return {sum, location: zone * use, value: .6 + .4*sum/28000000};
}
export function offersFor(company, scenario, risk={}) {
 if (scenario==='partial' && company!=='A') return {status:company==='B'?'Sin oferta para este riesgo (simulado)':'Error temporal (simulado)',offers:[]};
 const {sum, location, value} = riskFactors(risk);
 // Zona y uso afectan a todos los planes; el valor del auto solo a los que cubren daños o robo.
 const weight = {rc:0, tc:.5, tr:1};
 return {status:'Respuesta de ejemplo recibida',offers:plans.map(p=>({...p,id:company+'-'+p.id,company,price:Math.round(p.base*location*(1-weight[p.id]+weight[p.id]*value)*appetite[company][p.id]/10)*10,sum,period:'Mensual de ejemplo',validity:'Solo demostración; sin validez comercial'}))};
}
export function selection(current, id) {
 if(current.includes(id)) return current.filter(x=>x!==id);
 return current.length<3?[...current,id]:current;
}

export const companies = ['A','B','C'];
export const plans = [
 {id:'rc', name:'Responsabilidad civil', base:38500, theft:'No incluida', own:'No incluidos', deductible:'No aplica', glass:'No incluido'},
 {id:'tc', name:'Terceros completo', base:64900, theft:'Total y parcial (ejemplo)', own:'No incluidos', deductible:'Según condición de ejemplo', glass:'Con límite (ejemplo)'},
 {id:'tr', name:'Todo riesgo', base:98700, theft:'Total y parcial (ejemplo)', own:'Con franquicia (ejemplo)', deductible:'$ 350.000 ficticios', glass:'Con límite (ejemplo)'}
];
export function offersFor(company, scenario) {
 if (scenario==='partial' && company!=='A') return {status:company==='B'?'Sin oferta para este riesgo (simulado)':'Error temporal (simulado)',offers:[]};
 return {status:'Respuesta de ejemplo recibida',offers:plans.map((p,i)=>({...p,id:company+'-'+p.id,company,price:Math.round(p.base*(1+companies.indexOf(company)*.07)),sum:15000000,period:'Mensual de ejemplo',validity:'Solo demostración; sin validez comercial'}))};
}
export function selection(current, id) {
 if(current.includes(id)) return current.filter(x=>x!==id);
 return current.length<3?[...current,id]:current;
}

export const fields={poliza:'Póliza',compania:'Compañía',ramo:'Ramo',cliente:'Referencia del cliente',productor:'Productor',vencimiento:'Vencimiento'};
export const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export const identity=r=>JSON.stringify([r.compania,r.ramo,r.poliza].map(normalize));
export function isoDate(value){
 const text=String(value??'').trim();let y,m,d;
 if(/^\d{4}-\d{2}-\d{2}$/.test(text))[y,m,d]=text.split('-').map(Number);
 else if(/^\d{2}\/\d{2}\/\d{4}$/.test(text))[d,m,y]=text.split('/').map(Number);
 else return null;
 const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null;
}
export function preview(rows,mapping,existing){
 const keys=Object.keys(fields),indexes=keys.map(k=>mapping[k]);
 if(indexes.some(i=>!Number.isInteger(i)||i<0)||new Set(indexes).size!==indexes.length)throw Error('Asigná una columna distinta a cada campo.');
 const seen=new Set(existing.map(identity));
 return rows.map((row,index)=>{
  const record=Object.fromEntries(keys.map(k=>[k,String(row[mapping[k]]??'').trim()]));
  const errors=keys.filter(k=>!record[k]).map(k=>`Falta ${fields[k]}`);
  if(keys.some(k=>record[k].length>150))errors.push('Hay campos de más de 150 caracteres');
  const date=isoDate(record.vencimiento);if(!date)errors.push('Fecha inválida: usá AAAA-MM-DD o DD/MM/AAAA');else record.vencimiento=date;
  const id=identity(record);if(seen.has(id))errors.push('Duplicado por compañía, ramo y póliza');
  if(!errors.length)seen.add(id);
  return {line:index+2,record,errors};
 });
}
export function daysTo(date,today=new Date().toLocaleDateString('en-CA')){
 const parsed=isoDate(date);if(!parsed)return null;
 return Math.round((Date.parse(parsed+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
}

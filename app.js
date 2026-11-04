import {companies, offersFor, selection} from './model.mjs';
const $ = s => document.querySelector(s);
const form=$('#form'), results=$('#results'), offers=$('#offers');
const key='gaman-demo-history-v1';
let records=[], current=null, chosen=[], available=[], running=false;
try { const saved=JSON.parse(localStorage.getItem(key)||'[]'); if(Array.isArray(saved)) records=saved.filter(r=>r&&typeof r.id==='string'&&r.data&&Array.isArray(r.offers)).slice(0,30); } catch (_) {}
function el(tag,cls,text) { const node=document.createElement(tag); if(cls)node.className=cls; if(text!==undefined)node.textContent=text; return node; }
function action(text,fn,cls='') {const b=el('button',cls,text); b.type='button'; b.addEventListener('click',fn);return b;}
function persist(){ try{localStorage.setItem(key,JSON.stringify(records.slice(0,30)));}catch(_){$('#form-status').textContent='No se pudo guardar en este navegador.';} renderHistory(); }
function data(){return Object.fromEntries([...new FormData(form)].filter(([k])=>k!=='company'));}
function updateRecord(status, preserveRisk=false){
 const d=data();
 if(!current){current={id:crypto.randomUUID(),created:new Date().toLocaleString('es-AR'),data:d,offers:[],status};records.unshift(current);}
 if(!preserveRisk)current.data=d;current.status=status;current.offers=available;current.selected=[...chosen];persist();
}
function fill(d){for(const [k,v] of Object.entries(d)){const input=form.elements.namedItem(k);if(input&&k!=='company')input.value=v;}}
function example(){fill({marca:'Toyota',modelo:'Corolla',version:'XEI CVT',anio:'2022',localidad:'1640',uso:'Particular',fecha:new Date().toLocaleDateString('en-CA'),productor:'Equipo Gaman · Demo',cliente:'Prospecto de ejemplo'});}
$('#fill-example').addEventListener('click',()=>{example();$('#plate').value='AB123CD';$('#plate-status').textContent='Ejemplo cargado. Los datos no pertenecen a un vehículo real.';});
$('#find-plate').addEventListener('click',()=>{
 const plate=$('#plate').value.toUpperCase().replace(/[\s-]/g,'');$('#plate').value=plate;
 if(!/^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(plate)){$('#plate-status').textContent='Revisá el formato: ABC123 o AB123CD.';return;}
 const samples={AB123CD:{marca:'Toyota',modelo:'Corolla',version:'XEI CVT',anio:'2022'},ABC123:{marca:'Volkswagen',modelo:'Gol',version:'Trend 1.6',anio:'2015'}};
 if(!samples[plate]){$('#plate-status').textContent='Esta demo solo reconoce AB123CD y ABC123. Podés cargar el vehículo manualmente.';return;}
 fill(samples[plate]);$('#plate-status').textContent='Vehículo ficticio cargado. Confirmá la versión y completá localidad de guarda y uso.';
});
document.querySelectorAll('[data-ramo]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-ramo]').forEach(x=>x.classList.toggle('chosen',x===b));const autos=b.dataset.ramo==='Automotores';document.querySelector('.workspace').style.display=autos?'':'none';if(!autos){results.hidden=true;$('#proposal-view').hidden=true;}$('#ramo-note').textContent=b.dataset.ramo==='Automotores'?'Automotores disponible para explorar.':`${b.dataset.ramo}: propuesta para una próxima etapa. Por ahora podés explorar automotores.`;}));
function syncButtons(){ $('#compare').disabled=chosen.length<2;$('#proposal').disabled=!chosen.length; }
function renderOffers(){
 offers.replaceChildren();
 for(const company of companies){
  const group=available.filter(o=>o.company===company);if(!group.length)continue;
  for(const item of group){
   const card=el('article','offer');card.append(el('div','company',`Compañía ficticia ${company}`),el('h3','',item.name),el('div','price',money(item.price)),el('p','period','Por mes · importe ficticio'));
   const list=el('ul');for(const text of [`Suma: ${money(item.sum)} (ficticia)`,`Franquicia: ${item.deductible}`,`Robo: ${item.theft}`])list.append(el('li','',text));card.append(list);
   const label=el('label','select-offer');const check=el('input');check.type='checkbox';check.checked=chosen.includes(item.id);
   check.addEventListener('change',()=>{const next=selection(chosen,item.id);if(check.checked&&!next.includes(item.id)){$('#form-status').textContent='Podés seleccionar hasta tres opciones.';check.checked=false;return;}chosen=next;$('#comparison').hidden=true;$('#proposal-view').hidden=true;syncButtons();if(current){current.selected=[...chosen];persist();}});
   label.append(check,document.createTextNode(' Incluir en la propuesta'));card.append(label);offers.append(card);
  }
 }syncButtons();
}
function money(n){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n);}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(running||!form.reportValidity())return;
 const selected=[...form.querySelectorAll('[name=company]:checked')].map(x=>x.value);
 if(!selected.length){$('#form-status').textContent='Elegí al menos una compañía.';return;}
 const scenario=data().escenario,risk=data();
 running=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;available=[];chosen=[];current=current?.status==='Borrador'?current:null;syncButtons();$('#comparison').hidden=true;$('#proposal-view').hidden=true;results.hidden=false;offers.replaceChildren();
 $('#risk-summary').textContent=`${data().marca} ${data().modelo} ${data().version} · ${data().anio} · ${data().localidad}`;
 const statuses=el('div','company-statuses');results.insertBefore(statuses,offers);const previous=results.querySelectorAll('.company-statuses');previous.forEach(n=>{if(n!==statuses)n.remove();});
 const states=selected.map(c=>{const node=el('p','',`Compañía ${c}: consultando (simulación)…`);statuses.append(node);return node;});
 const controls=[...form.querySelectorAll('input,select,button')];controls.forEach(n=>n.disabled=true);
 for(let i=0;i<selected.length;i++) {await new Promise(r=>setTimeout(r,450));const result=offersFor(selected[i],scenario,risk);states[i].textContent=`Compañía ${selected[i]}: ${result.status}`;available.push(...result.offers);renderOffers();}
 controls.forEach(n=>n.disabled=false);
 updateRecord('Cotizada');running=false;submit.disabled=false;$('#form-status').textContent='Ejemplo terminado y guardado en el historial de este navegador.';results.scrollIntoView({behavior:'smooth',block:'start'});
});
function selectedOffers(){return available.filter(o=>chosen.includes(o.id));}
function comparison(items){
 const table=el('table');const head=el('tr');head.append(el('th','','Condición'));items.forEach(o=>head.append(el('th','',`${o.company} · ${o.name}`)));table.append(head);
 const rows=[['Cuota ficticia',o=>money(o.price)],['Período',o=>o.period],['Suma ficticia',o=>money(o.sum)],['Franquicia',o=>o.deductible],['Robo',o=>o.theft],['Daños propios',o=>o.own],['Cristales',o=>o.glass],['Vigencia',o=>o.validity]];
 for(const [label,fn]of rows){const row=el('tr');row.append(el('th','',label));items.forEach(o=>row.append(el('td','',fn(o))));table.append(row);}return table;
}
$('#compare').addEventListener('click',()=>{const target=$('#comparison');target.replaceChildren(comparison(selectedOffers()));target.hidden=false;});
$('#proposal').addEventListener('click',()=>{
 if(running||!current)return;
 const view=$('#proposal-view');view.replaceChildren(el('div','eyebrow','GRUPO GAMAN · PROPUESTA DE DEMOSTRACIÓN'),el('h2','','Opciones para tu vehículo'),el('p','',`${current.data.cliente} · ${current.data.productor}`),el('p','',`${current.data.marca} ${current.data.modelo} ${current.data.version} · ${current.data.anio}`),comparison(selectedOffers()),el('p','disclaimer','Datos y valores ficticios. Sin validez comercial. No constituye cobertura ni recomendación de contratación.'));
 view.append(action('Imprimir / guardar PDF',()=>window.print()),action('Copiar resumen',async()=>{try{await navigator.clipboard.writeText(`DEMO SIN VALIDEZ COMERCIAL\n${current.data.marca} ${current.data.modelo}\n`+selectedOffers().map(o=>`Compañía ficticia ${o.company} · ${o.name} · ${money(o.price)} / mes ficticio`).join('\n'));$('#form-status').textContent='Resumen copiado para compartir manualmente.';}catch(_){$('#form-status').textContent='No se pudo copiar. Usá la propuesta imprimible.';}}));view.hidden=false;updateRecord('Propuesta preparada',true);view.scrollIntoView({behavior:'smooth'});
});
function renderHistory(){
 const list=$('#history-list');list.replaceChildren();const filter=$('#history-filter').value;
 const filtered=records.filter(r=>!filter||r.status===filter);
 if(!filtered.length)list.append(el('p','disclaimer','Todavía no hay cotizaciones con este filtro.'));
 for(const r of filtered){const card=el('div','history-row');card.append(el('b','',`${r.data.marca||'Borrador'} ${r.data.modelo||''}`),el('span','',`${r.created} · ${r.data.cliente||'Sin referencia'}`));
 const state=el('select');for(const name of ['Borrador','Cotizada','Propuesta preparada','En seguimiento','Cerrada']){const option=el('option','',name);option.selected=r.status===name;state.append(option);}state.setAttribute('aria-label','Estado de cotización');state.addEventListener('change',()=>{r.status=state.value;persist();});
 card.append(state,action('Retomar',()=>{location.hash='';current=r;fill(r.data);available=r.offers;chosen=(r.selected||[]).filter(id=>available.some(o=>o.id===id));renderOffers();results.hidden=!available.length;$('#comparison').hidden=true;$('#proposal-view').hidden=true;$('#inicio').scrollIntoView({behavior:'smooth'});}));list.append(card);
 }
}
$('#history-filter').addEventListener('change',renderHistory);
$('#clear-history').addEventListener('click',()=>{if(confirm('¿Borrar el historial de demostración de este navegador?')){records=[];current=null;persist();}});
form.querySelector('.form-bottom').prepend(action('Guardar borrador',()=>{const d=data();if(!d.marca&&!d.modelo&&!d.version){$('#form-status').textContent='Completá al menos marca o modelo para guardar un borrador.';return;}if(current?.status!=='Borrador')current=null;available=[];chosen=[];updateRecord('Borrador');results.hidden=true;$('#proposal-view').hidden=true;$('#form-status').textContent='Borrador guardado en este navegador.';},'secondary'));
$('#copy-feedback').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('Propuesta Gaman: búsqueda por patente, comparación de coberturas, propuesta PDF, historial y seguimiento. Futuro: nuevos ramos, emisión, inspecciones y reportes.');$('#copy-status').textContent='Ideas copiadas.';}catch(_){$('#copy-status').textContent='Podés seleccionar y copiar el texto de esta sección.';}});
// Validaciones del riesgo: vigencia desde hoy y hasta 60 días, año hasta el próximo modelo, CP de 4 dígitos o CPA.
{const f=form.elements;f.fecha.min=new Date().toLocaleDateString('en-CA');const max=new Date();max.setDate(max.getDate()+60);f.fecha.max=max.toLocaleDateString('en-CA');f.anio.max=String(new Date().getFullYear()+1);f.localidad.pattern='[0-9]{4}|[A-Za-z][0-9]{4}[A-Za-z]{3}';f.localidad.title='Código postal de 4 dígitos (1640) o CPA (B1640ABC)';}
renderHistory();

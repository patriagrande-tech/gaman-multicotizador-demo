import {companies, offersFor, selection} from './model.mjs';

const $ = s => document.querySelector(s);
const form = $('#form'), results = $('#results'), offers = $('#offers');
const key = 'gaman-demo-history-v1';
const STATES = ['Borrador', 'Cotizada', 'Propuesta preparada', 'En seguimiento', 'Cerrada'];
const STATE_TONE = {Borrador: 'neutral', Cotizada: 'info', 'Propuesta preparada': 'warn', 'En seguimiento': 'warn', Cerrada: 'ok'};
const NOT_INCLUDED = /^No (incluid|aplica)/;
let records = [], current = null, chosen = [], available = [], running = false, companyStates = {};

try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(saved)) records = saved.filter(r => r && typeof r.id === 'string' && r.data && Array.isArray(r.offers)).slice(0, 30);
} catch (_) {}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function action(text, fn, cls = '') {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', fn);
  return b;
}
function money(n) { return new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS', maximumFractionDigits: 0}).format(n); }
function status(text) { $('#form-status').textContent = text; }
function persist() {
  try { localStorage.setItem(key, JSON.stringify(records.slice(0, 30))); } catch (_) { status('No se pudo guardar en este navegador.'); }
  renderHistory();
}
function data() { return Object.fromEntries([...new FormData(form)].filter(([k]) => k !== 'company')); }
function updateRecord(state, preserveRisk = false) {
  const d = data();
  if (!current) { current = {id: crypto.randomUUID(), created: new Date().toLocaleString('es-AR'), data: d, offers: [], status: state}; records.unshift(current); }
  if (!preserveRisk) current.data = d;
  current.status = state; current.offers = available; current.selected = [...chosen];
  persist();
}
function fill(d) {
  for (const [k, v] of Object.entries(d)) { const input = form.elements.namedItem(k); if (input && k !== 'company') input.value = v; }
  renderSummary();
}
function vehicle(d) { return [d.marca, d.modelo, d.version].filter(Boolean).join(' '); }
function dateAR(iso) { return iso ? iso.split('-').reverse().join('/') : ''; }

// Resumen lateral que acompaña la carga.
function renderSummary() {
  const d = data(), picked = [...form.querySelectorAll('[name=company]:checked')].map(x => x.value);
  const rows = [['Vehículo', vehicle(d)], ['Año', d.anio], ['Uso', d.uso], ['Guarda', d.localidad && `CP ${d.localidad}`], ['Vigencia', dateAR(d.fecha)], ['Cliente', d.cliente], ['Compañías', picked.length ? picked.map(c => `Cía. ${c}`).join(' · ') : '']];
  $('#live-summary').replaceChildren(...rows.map(([label, value]) => {
    const line = el('div', 'summary-line');
    line.append(el('span', '', label), el('b', value ? '' : 'pending', value || 'Sin completar'));
    return line;
  }));
}
form.addEventListener('input', renderSummary);
form.addEventListener('change', renderSummary);

$('#fill-example').addEventListener('click', () => {
  fill({marca: 'Toyota', modelo: 'Corolla', version: 'XEI CVT', anio: '2022', localidad: '1640', uso: 'Particular', fecha: new Date().toLocaleDateString('en-CA'), cliente: 'Prospecto de ejemplo'});
  $('#plate').value = 'AB123CD';
  $('#plate-status').textContent = 'Ejemplo cargado. Los datos no pertenecen a un vehículo real.';
});
$('#find-plate').addEventListener('click', () => {
  const plate = $('#plate').value.toUpperCase().replace(/[\s-]/g, '');
  $('#plate').value = plate;
  if (!/^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(plate)) { $('#plate-status').textContent = 'Revisá el formato: ABC123 o AB123CD.'; return; }
  const samples = {AB123CD: {marca: 'Toyota', modelo: 'Corolla', version: 'XEI CVT', anio: '2022'}, ABC123: {marca: 'Volkswagen', modelo: 'Gol', version: 'Trend 1.6', anio: '2015'}};
  if (!samples[plate]) { $('#plate-status').textContent = 'Esta demo reconoce AB123CD y ABC123. Podés cargar el vehículo manualmente.'; return; }
  fill(samples[plate]);
  $('#plate-status').textContent = `${vehicle(samples[plate])} ${samples[plate].anio} encontrado. Confirmá la versión y completá guarda y uso.`;
});
$('#plate').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#find-plate').click(); } });

document.querySelectorAll('[data-ramo]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-ramo]').forEach(x => x.classList.toggle('chosen', x === b));
  const autos = b.dataset.ramo === 'Automotores';
  document.querySelector('.workspace').style.display = autos ? '' : 'none';
  if (!autos) { results.hidden = true; $('#proposal-view').hidden = true; }
  $('#ramo-note').textContent = autos ? '' : `${b.dataset.ramo} llega en una próxima etapa. Por ahora podés cotizar automotores.`;
}));

function syncButtons() {
  $('#compare').disabled = chosen.length < 2;
  $('#proposal').disabled = !chosen.length;
  const count = $('#selection-count');
  if (!chosen.length) count.replaceChildren('Elegí hasta ', el('b', '', '3 opciones'), ' para comparar o proponer');
  else count.replaceChildren(el('b', '', `${chosen.length} de 3`), ` seleccionada${chosen.length > 1 ? 's' : ''}`);
}

function offerCard(item, best) {
  const card = el('article', 'offer' + (chosen.includes(item.id) ? ' is-selected' : ''));
  if (best) card.append(el('span', 'best', 'Mejor precio'));
  card.append(el('h3', '', item.name), el('div', 'price', money(item.price)), el('p', 'period', 'por mes · importe ficticio'));
  const list = el('ul');
  for (const [label, value] of [['Suma asegurada', money(item.sum)], ['Robo', item.theft], ['Daños propios', item.own], ['Franquicia', item.deductible]]) {
    list.append(el('li', NOT_INCLUDED.test(value) ? 'no' : '', `${label}: ${value}`));
  }
  card.append(list);
  const label = el('label', 'select-offer'), check = el('input'), text = el('span', '', chosen.includes(item.id) ? 'En la propuesta' : 'Agregar a la propuesta');
  check.type = 'checkbox'; check.checked = chosen.includes(item.id);
  check.addEventListener('change', () => {
    const next = selection(chosen, item.id);
    if (check.checked && !next.includes(item.id)) { status('Podés seleccionar hasta tres opciones.'); check.checked = false; return; }
    chosen = next;
    $('#comparison').hidden = true; $('#proposal-view').hidden = true;
    renderOffers();
    if (current) { current.selected = [...chosen]; persist(); }
  });
  label.append(check, text);
  card.append(label);
  return card;
}

function renderOffers(states = companyStates) {
  offers.replaceChildren();
  // Mejor precio por plan entre las compañías que respondieron.
  const cheapest = {};
  for (const o of available) if (!cheapest[o.id.split('-')[1]] || o.price < cheapest[o.id.split('-')[1]]) cheapest[o.id.split('-')[1]] = o.price;
  const multi = new Set(available.map(o => o.company)).size > 1;
  for (const company of companies) {
    const group = available.filter(o => o.company === company);
    if (!group.length && !states[company]) continue;
    const col = el('div', 'company-col'), head = el('header');
    const name = el('div'); name.append(el('b', '', `Compañía ${company}`), el('small', '', group.length ? `${group.length} planes` : states[company]));
    head.append(el('span', `logo-mark ${company}`, company), name);
    col.append(head);
    if (!group.length) col.append(el('div', 'company-empty', states[company]));
    for (const item of group) col.append(offerCard(item, multi && item.price === cheapest[item.id.split('-')[1]]));
    offers.append(col);
  }
  syncButtons();
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (running || !form.reportValidity()) return;
  const selected = [...form.querySelectorAll('[name=company]:checked')].map(x => x.value);
  if (!selected.length) { status('Elegí al menos una compañía.'); return; }
  const risk = data(), scenario = risk.escenario;
  running = true; available = []; chosen = [];
  current = current?.status === 'Borrador' ? current : null;
  status('');
  $('#comparison').hidden = true; $('#proposal-view').hidden = true; results.hidden = false; offers.replaceChildren();
  $('#risk-summary').textContent = `${vehicle(risk)} · ${risk.anio} · ${risk.uso} · CP ${risk.localidad}`;
  results.querySelectorAll('.company-statuses').forEach(n => n.remove());
  const statuses = el('div', 'company-statuses');
  results.insertBefore(statuses, offers);
  const nodes = selected.map(c => { const node = el('p', '', `Compañía ${c}: consultando…`); statuses.append(node); return node; });
  const controls = [...form.querySelectorAll('input,select,button')];
  controls.forEach(n => n.disabled = true);
  results.scrollIntoView({behavior: 'smooth', block: 'start'});
  const states = companyStates = {};
  // Simula respuestas que llegan de a una.
  for (let i = 0; i < selected.length; i++) {
    await new Promise(r => setTimeout(r, 450));
    const result = offersFor(selected[i], scenario, risk);
    nodes[i].textContent = `Compañía ${selected[i]}: ${result.offers.length ? `${result.offers.length} planes` : result.status}`;
    nodes[i].className = result.offers.length ? 'done' : /Error/.test(result.status) ? 'error' : 'none';
    if (!result.offers.length) states[selected[i]] = result.status;
    available.push(...result.offers);
    renderOffers(states);
  }
  controls.forEach(n => n.disabled = false);
  updateRecord('Cotizada');
  running = false;
});

function selectedOffers() { return available.filter(o => chosen.includes(o.id)); }
function comparison(items) {
  const table = el('table'), head = el('tr');
  head.append(el('th', '', 'Condición'));
  items.forEach(o => head.append(el('th', '', `Compañía ${o.company} · ${o.name}`)));
  table.append(head);
  const rows = [['Cuota mensual', o => money(o.price)], ['Suma asegurada', o => money(o.sum)], ['Franquicia', o => o.deductible], ['Robo', o => o.theft], ['Daños propios', o => o.own], ['Cristales', o => o.glass], ['Período', o => o.period], ['Validez', o => o.validity]];
  for (const [label, fn] of rows) {
    const row = el('tr');
    row.append(el('th', '', label));
    items.forEach(o => row.append(el('td', '', fn(o))));
    table.append(row);
  }
  return table;
}
$('#compare').addEventListener('click', () => {
  const target = $('#comparison');
  target.replaceChildren(comparison(selectedOffers()));
  target.hidden = false;
  target.scrollIntoView({behavior: 'smooth', block: 'nearest'});
});

const LOGO = '<svg viewBox="0 0 206 44" role="img" aria-label="Grupo Gaman"><path d="M2 12C30 5 70 4 100 10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M47 6.4 52 12.5 57 6.2Z" fill="currentColor"/><text x="0" y="40" fill="currentColor" font-family="Lexend Deca, Inter, sans-serif" font-size="26" font-weight="500" letter-spacing=".4">GRUPO GAMAN</text></svg>';
$('#proposal').addEventListener('click', () => {
  if (running || !current) return;
  const d = current.data, view = $('#proposal-view');
  const head = el('div', 'proposal-head');
  head.innerHTML = LOGO;
  head.append(el('span', '', 'Propuesta de cobertura · demostración'));
  const body = el('div', 'proposal-body'), meta = el('div', 'proposal-meta');
  for (const [label, value] of [['Cliente', d.cliente], ['Vehículo', `${vehicle(d)} ${d.anio}`], ['Uso y guarda', `${d.uso} · CP ${d.localidad}`], ['Productor', d.productor]]) {
    const box = el('div'); box.append(el('span', '', label), el('b', '', value)); meta.append(box);
  }
  const tools = el('div', 'actions');
  tools.append(action('Imprimir / guardar PDF', () => window.print(), 'arrow'), action('Copiar resumen', async () => {
    try {
      await navigator.clipboard.writeText(`Propuesta (demo sin validez comercial)\n${vehicle(d)} ${d.anio}\n` + selectedOffers().map(o => `Compañía ${o.company} · ${o.name} · ${money(o.price)} por mes`).join('\n'));
      status('Resumen copiado para compartir.');
    } catch (_) { status('No se pudo copiar. Usá la propuesta imprimible.'); }
  }, 'secondary'));
  body.append(el('span', 'eyebrow', `Preparada el ${new Date().toLocaleDateString('es-AR')}`), el('h2', '', 'Opciones para tu vehículo'), meta, comparison(selectedOffers()),
    el('p', 'disclaimer', 'Datos y valores ficticios. Sin validez comercial. No constituye cobertura ni recomendación de contratación.'), tools);
  view.replaceChildren(head, body);
  view.hidden = false;
  updateRecord('Propuesta preparada', true);
  view.scrollIntoView({behavior: 'smooth'});
});

function renderHistory() {
  const list = $('#history-list'), filter = $('#history-filter').value;
  list.replaceChildren();
  const filtered = records.filter(r => !filter || r.status === filter);
  if (!filtered.length) list.append(el('p', 'disclaimer', 'Todavía no hay cotizaciones con este filtro.'));
  for (const r of filtered) {
    const row = el('div', 'history-row'), info = el('div', 'meta');
    info.append(el('b', '', vehicle(r.data) || 'Borrador sin vehículo'), el('span', '', `${r.data.cliente || 'Sin cliente'} · ${r.created}${r.offers.length ? ` · ${r.offers.length} opciones` : ''}`));
    const state = el('select');
    for (const name of STATES) { const option = el('option', '', name); option.selected = r.status === name; state.append(option); }
    state.setAttribute('aria-label', 'Estado de cotización');
    state.addEventListener('change', () => { r.status = state.value; persist(); });
    row.append(info, el('span', `badge ${STATE_TONE[r.status] || 'neutral'}`, r.status), state, action('Retomar', () => {
      location.hash = '';
      current = r; fill(r.data); available = r.offers; companyStates = {};
      chosen = (r.selected || []).filter(id => available.some(o => o.id === id));
      results.querySelectorAll('.company-statuses').forEach(n => n.remove());
      renderOffers(); results.hidden = !available.length;
      $('#comparison').hidden = true; $('#proposal-view').hidden = true;
      $('#inicio').scrollIntoView({behavior: 'smooth'});
    }, 'secondary'));
    list.append(row);
  }
}
$('#history-filter').addEventListener('change', renderHistory);
$('#clear-history').addEventListener('click', () => { if (confirm('¿Borrar el historial de demostración de este navegador?')) { records = []; current = null; persist(); } });

form.querySelector('.form-bottom').append(action('Guardar borrador', () => {
  const d = data();
  if (!d.marca && !d.modelo && !d.version) { status('Completá al menos marca o modelo para guardar un borrador.'); return; }
  if (current?.status !== 'Borrador') current = null;
  available = []; chosen = [];
  updateRecord('Borrador');
  results.hidden = true; $('#proposal-view').hidden = true;
  status('Borrador guardado. Lo encontrás en Historial de cotizaciones.');
}, 'secondary'));
// El botón principal queda último.
form.querySelector('.form-bottom').append(form.querySelector('[type=submit]'));

$('#copy-feedback').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('Portal Gaman: cotización por patente, comparación de coberturas, propuesta PDF, historial y cartera. Próximo: nuevos ramos, emisión, inspecciones, alertas y reportes.');
    $('#copy-status').textContent = 'Ideas copiadas.';
  } catch (_) { $('#copy-status').textContent = 'Podés seleccionar y copiar el texto de esta sección.'; }
});

// Validaciones del riesgo: vigencia desde hoy y hasta 60 días, año hasta el próximo modelo, CP de 4 dígitos o CPA.
{
  const f = form.elements, max = new Date();
  max.setDate(max.getDate() + 60);
  f.fecha.min = new Date().toLocaleDateString('en-CA');
  f.fecha.max = max.toLocaleDateString('en-CA');
  f.anio.max = String(new Date().getFullYear() + 1);
  f.localidad.pattern = '[0-9]{4}|[A-Za-z][0-9]{4}[A-Za-z]{3}';
  f.localidad.title = 'Código postal de 4 dígitos (1640) o CPA (B1640ABC)';
}
// El selector de escenarios queda para quien presenta la demo: ?escenarios
if (new URLSearchParams(location.search).has('escenarios')) form.querySelector('.scenario').hidden = false;
// Desde la ficha de cliente: cotizar para ese cliente.
if (new URLSearchParams(location.search).get('cliente')) form.elements.cliente.value = new URLSearchParams(location.search).get('cliente');
renderSummary();
renderHistory();

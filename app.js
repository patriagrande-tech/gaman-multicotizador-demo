import {companies, plans, offersFor, selection} from './model.mjs';
import {THIS_YEAR, years, brands, models, versions, referenceValue, formatPlate, normalizePlate, plateKind, plateLookup, postcodePlace} from './vehicles.mjs';

const $ = s => document.querySelector(s);
const form = $('#form'), results = $('#results'), offers = $('#offers'), F = form.elements;
const KEY = 'gaman-demo-history-v1', DRAFT = 'gaman-demo-quote-draft';
const STATES = ['Borrador', 'Cotizada', 'Propuesta preparada', 'En seguimiento', 'Cerrada'];
const STATE_TONE = {Borrador: 'neutral', Cotizada: 'info', 'Propuesta preparada': 'warn', 'En seguimiento': 'warn', Cerrada: 'ok'};
const NOT_INCLUDED = /^No (incluid|aplica)/;
const PLAN_ORDER = ['tr', 'cf', 'tc', 'rc'];
// Valores por defecto de Más opciones: lo distinto se cuenta y se muestra en el resumen.
const DEFAULTS = {alarma: 'No', rastreador: 'No', gnc: 'No', grua: 'Sí', ajuste: 'Sin ajuste', rc_ampliada: 'Sin ampliación', conosur: 'No', facturacion: 'Mensual', pago: 'Débito automático', iva: 'Consumidor final', persona: 'Física'};
let records = [], current = null, chosen = [], available = [], running = false, companyStates = {}, quotedKey = '';

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(saved)) records = saved.filter(r => r && typeof r.id === 'string' && r.data && Array.isArray(r.offers)).slice(0, 30);
} catch (_) {}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function action(text, fn, cls = '') { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
const money = n => new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS', maximumFractionDigits: 0}).format(n);
function status(text) { $('#form-status').textContent = text; }
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(records.slice(0, 30))); } catch (_) { status('No se pudo guardar en este navegador.'); }
  renderHistory();
}
const iso = d => d.toLocaleDateString('en-CA');
function addDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
const longDate = s => new Date(s + 'T12:00:00').toLocaleDateString('es-AR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
const vehicle = d => [d.marca, d.modelo, d.version].filter(Boolean).join(' ');

// ---------- Datos del formulario ----------
function data() {
  const d = Object.fromEntries([...new FormData(form)].filter(([k]) => !['company', 'vigencia', 'cerokm'].includes(k)));
  d.valor = referenceValue(d) || '';
  d.patente = $('#zero-km').checked ? '0 km' : formatPlate($('#plate').value);
  return d;
}
const riskKey = () => JSON.stringify([data(), [...form.querySelectorAll('[name=company]:checked')].map(x => x.value)]);

// ---------- Vehículo: catálogo en cascada ----------
function options(select, list, placeholder, value) {
  select.replaceChildren(Object.assign(el('option', '', placeholder), {value: ''}), ...list.map(v => Object.assign(el('option', '', String(v)), {value: String(v)})));
  select.disabled = !list.length;
  if (value != null && list.map(String).includes(String(value))) select.value = String(value);
}
function cascade(from) {
  const y = Number(F.anio.value) || null;
  if (from <= 0) options(F.marca, y ? brands(y) : [], y ? 'Elegí la marca' : 'Primero el año', F.marca.value);
  if (from <= 1) options(F.modelo, F.marca.value ? models(F.marca.value, y) : [], F.marca.value ? 'Elegí el modelo' : 'Primero la marca', F.modelo.value);
  if (from <= 2) {
    const list = F.modelo.value ? versions(F.marca.value, F.modelo.value, y) : [];
    options(F.version, list, F.modelo.value ? 'Elegí la versión' : 'Primero el modelo', F.version.value);
    if (list.length === 1) F.version.value = list[0];
  }
  vehicleNote();
}
function setVehicle(v) {
  F.anio.value = String(v.anio || ''); cascade(0);
  F.marca.value = v.marca || ''; cascade(1);
  F.modelo.value = v.modelo || ''; cascade(2);
  if (v.version && versions(F.marca.value, F.modelo.value, Number(F.anio.value)).includes(v.version)) F.version.value = v.version;
  vehicleNote();
}
function vehicleNote() {
  const note = $('#vehicle-note'), d = data(), value = referenceValue(d);
  F.version.classList.toggle('confirm', F.version.dataset.confirm === '1' && !!F.version.value);
  note.hidden = !value;
  if (value) note.replaceChildren('Valor de referencia ', el('b', '', money(value)), ' · ficticio, se usa como suma asegurada sugerida.');
}
options(F.anio, years(), 'Elegí el año');
cascade(0);
F.anio.addEventListener('change', () => cascade(0));
F.marca.addEventListener('change', () => cascade(1));
F.modelo.addEventListener('change', () => cascade(2));
F.version.addEventListener('change', () => { F.version.dataset.confirm = ''; vehicleNote(); });

// ---------- Patente ----------
const plate = $('#plate'), plateStatus = $('#plate-status');
let lookupTimer = null, lastLookup = '';
function lookup() {
  const p = normalizePlate(plate.value);
  if (!plateKind(p)) {
    plateStatus.textContent = p ? 'Revisá la patente: tiene que ser AB 123 CD o ABC 123.' : 'Escribí la patente para buscar el vehículo.';
    plate.closest('.plate').classList.toggle('invalid', !!p);
    plate.focus();
    return;
  }
  lastLookup = p;
  plate.closest('.plate').classList.remove('invalid');
  plateStatus.textContent = 'Buscando…';
  setTimeout(() => {
    const found = plateLookup(p);
    if (!found) { plateStatus.textContent = 'No encontramos esa patente. Cargá el vehículo a mano más abajo.'; F.anio.focus(); return; }
    setVehicle(found);
    const many = versions(found.marca, found.modelo, found.anio).length > 1;
    F.version.dataset.confirm = many ? '1' : '';
    vehicleNote();
    plateStatus.replaceChildren(el('b', '', `${found.marca} ${found.modelo} ${found.anio}`), many ? ' · Confirmá la versión: la patente no la informa.' : ' · Vehículo completo.', found.sample ? '' : ' (resultado simulado)');
    if (many) F.version.focus(); else F.localidad.focus();
    refresh();
  }, 350);
}
plate.addEventListener('input', () => {
  const pos = plate.value.length;
  plate.value = formatPlate(plate.value);
  if (pos === plate.value.length) plate.setSelectionRange(pos, pos);
  plate.closest('.plate').classList.remove('invalid');
  clearTimeout(lookupTimer);
  const p = normalizePlate(plate.value);
  // Busca solo al completar una patente válida.
  if (plateKind(p) && p !== lastLookup) lookupTimer = setTimeout(lookup, 300);
});
plate.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(lookupTimer); lookup(); } });
$('#find-plate').addEventListener('click', () => { clearTimeout(lookupTimer); lookup(); });
document.querySelectorAll('[data-plate]').forEach(b => b.addEventListener('click', () => { plate.value = formatPlate(b.dataset.plate); lastLookup = ''; lookup(); }));
$('#zero-km').addEventListener('change', e => {
  const zero = e.target.checked;
  plate.disabled = zero; $('#find-plate').disabled = zero;
  plate.closest('.plate-search').classList.toggle('is-zero', zero);
  if (zero) { setVehicle({anio: THIS_YEAR}); plateStatus.textContent = '0 km: elegí marca, modelo y versión.'; F.marca.focus(); }
  else plateStatus.textContent = 'Escribí la patente para buscar el vehículo.';
  refresh();
});

// ---------- Vigencia y código postal ----------
function syncDate() {
  const mode = form.querySelector('[name=vigencia]:checked').value;
  F.fecha.min = addDays(0); F.fecha.max = addDays(60);
  if (mode === 'hoy') F.fecha.value = addDays(0);
  if (mode === 'manana') F.fecha.value = addDays(1);
  F.fecha.hidden = mode !== 'otra';
  if (mode === 'otra' && (!F.fecha.value || F.fecha.value < F.fecha.min)) F.fecha.value = addDays(2);
  $('#date-text').textContent = F.fecha.value ? `Desde el ${longDate(F.fecha.value)}.` : '';
}
form.querySelectorAll('[name=vigencia]').forEach(r => r.addEventListener('change', () => {
  if (r.value === 'otra' && F.fecha.value <= addDays(1)) F.fecha.value = addDays(2);
  syncDate();
  if (r.value === 'otra') F.fecha.focus();
}));
F.fecha.addEventListener('change', syncDate);
function cpCheck() {
  const place = postcodePlace(F.localidad.value), text = F.localidad.value.trim(), hint = $('#cp-place');
  F.localidad.classList.toggle('invalid', !!text && !place && text.length >= 4);
  hint.className = 'hint' + (place ? ' ok' : '');
  hint.textContent = place ? `✓ ${place}` : text.length >= 4 ? 'Revisá el código postal: 4 números (1640) o CPA (B1640ABC).' : 'Donde duerme el vehículo.';
}
F.localidad.addEventListener('input', cpCheck);

// ---------- Compañías ----------
function syncCompanies() {
  const all = [...form.querySelectorAll('[name=company]')], on = all.filter(c => c.checked).length;
  $('#toggle-companies').textContent = on === all.length ? 'Quitar todas' : 'Elegir todas';
}
$('#toggle-companies').addEventListener('click', () => {
  const all = [...form.querySelectorAll('[name=company]')], on = all.every(c => c.checked);
  all.forEach(c => { c.checked = !on; });
  refresh();
});

// ---------- Qué falta, resumen y borrador ----------
function missing() {
  const out = [];
  if (!F.anio.value) out.push(['año', F.anio]);
  if (!F.marca.value) out.push(['marca', F.marca]);
  if (!F.modelo.value) out.push(['modelo', F.modelo]);
  if (!F.version.value) out.push(['versión', F.version]);
  if (!postcodePlace(F.localidad.value)) out.push(['código postal', F.localidad]);
  if (!F.fecha.value || F.fecha.value < F.fecha.min || F.fecha.value > F.fecha.max) out.push(['inicio de vigencia', F.fecha]);
  if (!form.querySelector('[name=company]:checked')) out.push(['una compañía', form.querySelector('[name=company]')]);
  return out;
}
function listText(items) { return items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items.at(-1)}` : items[0]; }
function renderSummary() {
  const d = data(), picked = [...form.querySelectorAll('[name=company]:checked')].map(x => x.value), place = postcodePlace(d.localidad);
  const extras = [d.alarma === 'Sí' && 'Alarma', d.rastreador === 'Sí' && 'Rastreador', d.gnc === 'Sí' && 'GNC', d.grua === 'No' && 'Sin grúa',
    d.ajuste && d.ajuste !== 'Sin ajuste' && `Ajuste ${d.ajuste}`, d.rc_ampliada && d.rc_ampliada !== 'Sin ampliación' && `RC +${d.rc_ampliada}`, d.conosur === 'Sí' && 'Países limítrofes'].filter(Boolean).join(' · ');
  const rows = [['Patente', d.patente], ['Vehículo', vehicle(d)], ['Año', d.anio], ['Valor ref.', d.valor && money(d.valor)], ['Uso', d.uso], ['Guarda', place && `${d.localidad} · ${place}`],
    ['Vigencia', d.fecha && new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-AR')], ['Adicionales', extras || 'Los habituales'], ['Pago', `${d.pago} · ${(d.facturacion || 'Mensual').toLowerCase()}`], ['Compañías', picked.length ? picked.map(c => `Cía. ${c}`).join(' · ') : '']];
  $('#live-summary').replaceChildren(...rows.map(([label, value]) => {
    const line = el('div', 'summary-line');
    line.append(el('span', '', label), el('b', value ? '' : 'pending', value || '—'));
    return line;
  }));
}
function refresh() {
  const miss = missing().map(([name]) => name), box = $('#missing');
  box.className = 'missing' + (miss.length ? '' : ' ready');
  box.textContent = miss.length ? `Falta: ${listText(miss)}.` : '✓ Listo para cotizar';
  $('#step-vehicle').classList.toggle('done', !miss.some(m => ['año', 'marca', 'modelo', 'versión'].includes(m)));
  $('#step-risk').classList.toggle('done', !miss.some(m => ['código postal', 'inicio de vigencia'].includes(m)));
  $('#step-companies').classList.toggle('done', !miss.includes('una compañía'));
  syncCompanies();
  renderSummary();
  const changed = Object.entries(DEFAULTS).filter(([k, v]) => F[k] && F[k].value !== v).length;
  const more = $('#more-summary');
  more.replaceChildren(changed ? Object.assign(el('span', 'more-count', `${changed} cambio${changed > 1 ? 's' : ''}`), {}) : 'Equipamiento, coberturas adicionales, facturación y contratante');
  if (!results.hidden && available.length && !running) $('#stale').hidden = riskKey() === quotedKey;
  try { localStorage.setItem(DRAFT, JSON.stringify({d: data(), plate: plate.value, zero: $('#zero-km').checked, vigencia: form.querySelector('[name=vigencia]:checked').value})); } catch (_) {}
}
form.addEventListener('input', refresh);
form.addEventListener('change', refresh);

function fill(d, extra = {}) {
  if (extra.zero != null) { $('#zero-km').checked = extra.zero; plate.disabled = extra.zero; $('#find-plate').disabled = extra.zero; plate.closest('.plate-search').classList.toggle('is-zero', extra.zero); }
  plate.value = extra.plate ?? (d.patente && d.patente !== '0 km' ? d.patente : '');
  lastLookup = normalizePlate(plate.value);
  setVehicle(d);
  for (const k of ['localidad', 'cliente', ...Object.keys(DEFAULTS)]) if (d[k] != null && F[k]) F[k].value = d[k];
  if (d.uso) F.uso.value = d.uso;
  // Una fecha pasada vuelve a "hoy".
  const keep = d.fecha && d.fecha >= addDays(0) && d.fecha <= addDays(60);
  const mode = !keep || d.fecha === addDays(0) ? 'hoy' : d.fecha === addDays(1) ? 'manana' : 'otra';
  form.querySelector(`[name=vigencia][value=${extra.vigencia && keep ? extra.vigencia : mode}]`).checked = true;
  if (keep) F.fecha.value = d.fecha;
  syncDate(); cpCheck(); refresh();
}

// ---------- Ramo ----------
document.querySelectorAll('[data-ramo]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-ramo]').forEach(x => x.classList.toggle('chosen', x === b));
  const autos = b.dataset.ramo === 'Automotores';
  document.querySelector('.workspace').style.display = autos ? '' : 'none';
  if (!autos) { results.hidden = true; $('#proposal-view').hidden = true; }
  $('#ramo-note').textContent = autos ? '' : `${b.dataset.ramo} llega en una próxima etapa. Por ahora podés cotizar automotores.`;
}));

// ---------- Resultados ----------
function syncButtons() {
  $('#compare').disabled = chosen.length < 2;
  $('#proposal').disabled = !chosen.length;
  const count = $('#selection-count');
  if (!chosen.length) count.replaceChildren('Elegí hasta ', el('b', '', '3 opciones'), ' para comparar o proponer');
  else count.replaceChildren(el('b', '', `${chosen.length} de 3`), ` seleccionada${chosen.length > 1 ? 's' : ''}`);
}
function offerCard(item, {byCoverage, best}) {
  const card = el('article', 'offer' + (chosen.includes(item.id) ? ' is-selected' : ''));
  if (best) card.append(el('span', 'best', 'Mejor precio'));
  if (byCoverage) {
    const head = el('div', 'offer-company');
    head.append(el('span', `logo-mark ${item.company}`, item.company), el('b', '', `Compañía ${item.company}`));
    card.append(head);
  } else card.append(el('h3', '', item.name));
  card.append(el('div', 'price', money(item.price)), el('p', 'period', `${item.period || 'por mes'} · importe ficticio`));
  if (item.premium) {
    const br = el('p', 'breakdown');
    br.append('Premio anual ', el('b', '', money(item.premium)), item.cash ? ` · contado ${money(item.cash)}` : '');
    card.append(br);
  }
  const list = el('ul');
  for (const [label, value] of [['Suma asegurada', money(item.sum)], ['Robo e incendio', item.theft], ['Granizo', item.hail || 'No incluido'], ['Cristales', item.glass], ['Daños propios', item.own], ['Franquicia', item.deductible]]) {
    list.append(el('li', NOT_INCLUDED.test(value) ? 'no' : '', `${label}: ${value}`));
  }
  card.append(list);
  const label = el('label', 'select-offer'), check = el('input');
  check.type = 'checkbox'; check.checked = chosen.includes(item.id);
  check.addEventListener('change', () => {
    const next = selection(chosen, item.id);
    if (check.checked && !next.includes(item.id)) { check.checked = false; $('#selection-count').replaceChildren(el('b', '', 'Máximo 3 opciones.'), ' Quitá una para sumar otra.'); return; }
    chosen = next;
    $('#comparison').hidden = true; $('#proposal-view').hidden = true;
    renderOffers();
    if (current) { current.selected = [...chosen]; persist(); }
  });
  label.append(check, el('span', '', chosen.includes(item.id) ? 'En la propuesta' : 'Agregar a la propuesta'));
  card.append(label);
  if (item.number) card.append(el('p', 'quote-number', `Cotización N° ${item.number}`));
  return card;
}
function renderOffers() {
  const byCoverage = $('#view-mode [name=vista]:checked').value === 'cobertura';
  offers.className = 'offer-grid' + (byCoverage ? ' by-coverage' : '');
  offers.replaceChildren();
  const multi = new Set(available.map(o => o.company)).size > 1;
  if (byCoverage) {
    for (const id of PLAN_ORDER) {
      const group = available.filter(o => o.id.endsWith('-' + id)).sort((a, b) => a.price - b.price);
      if (!group.length) continue;
      const row = el('div', 'coverage-row'), head = el('header');
      head.append(el('b', '', plans.find(p => p.id === id).name), el('small', '', `desde ${money(group[0].price)} por mes`));
      const cards = el('div', 'coverage-cards');
      group.forEach((item, i) => cards.append(offerCard(item, {byCoverage, best: multi && i === 0})));
      row.append(head, cards);
      offers.append(row);
    }
    const failed = Object.entries(companyStates);
    if (failed.length) offers.append(el('p', 'company-empty', failed.map(([c, s]) => `Compañía ${c}: ${s}`).join(' · ')));
  } else {
    const cheapest = {};
    for (const o of available) { const k = o.id.split('-')[1]; if (!cheapest[k] || o.price < cheapest[k]) cheapest[k] = o.price; }
    for (const company of companies) {
      const group = available.filter(o => o.company === company).sort((a, b) => PLAN_ORDER.indexOf(a.id.split('-')[1]) - PLAN_ORDER.indexOf(b.id.split('-')[1]));
      if (!group.length && !companyStates[company]) continue;
      const col = el('div', 'company-col'), head = el('header'), name = el('div');
      name.append(el('b', '', `Compañía ${company}`), el('small', '', group.length ? `${group.length} planes` : companyStates[company]));
      head.append(el('span', `logo-mark ${company}`, company), name);
      col.append(head);
      if (!group.length) col.append(el('div', 'company-empty', companyStates[company]));
      for (const item of group) col.append(offerCard(item, {byCoverage, best: multi && item.price === cheapest[item.id.split('-')[1]]}));
      offers.append(col);
    }
  }
  syncButtons();
}
$('#view-mode').addEventListener('change', renderOffers);

function updateRecord(state, preserveRisk = false) {
  const d = data();
  if (!current) { current = {id: crypto.randomUUID(), created: new Date().toLocaleString('es-AR'), data: d, offers: [], status: state}; records.unshift(current); }
  if (!preserveRisk) current.data = d;
  current.status = state; current.offers = available; current.selected = [...chosen];
  persist();
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (running) return;
  const miss = missing();
  if (miss.length) {
    status(`Para cotizar falta: ${listText(miss.map(([n]) => n))}.`);
    miss[0][1].focus();
    miss.forEach(([, field]) => field.classList.add('invalid'));
    setTimeout(() => miss.forEach(([, field]) => field.classList.remove('invalid')), 1800);
    return;
  }
  const risk = data(), scenario = risk.escenario, selected = [...form.querySelectorAll('[name=company]:checked')].map(x => x.value);
  running = true; available = []; chosen = []; companyStates = {};
  current = current?.status === 'Borrador' ? current : null;
  status('');
  $('#comparison').hidden = true; $('#proposal-view').hidden = true; $('#stale').hidden = true; results.hidden = false; offers.replaceChildren();
  $('#risk-summary').textContent = `${vehicle(risk)} ${risk.anio} · ${risk.uso} · CP ${risk.localidad} · desde ${new Date(risk.fecha + 'T12:00:00').toLocaleDateString('es-AR')}`;
  results.querySelectorAll('.company-statuses').forEach(n => n.remove());
  const statuses = el('div', 'company-statuses');
  results.insertBefore(statuses, $('#stale'));
  const nodes = selected.map(c => { const node = el('p', '', `Compañía ${c}: consultando…`); statuses.append(node); return node; });
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true; submit.textContent = 'Cotizando…';
  results.scrollIntoView({behavior: 'smooth', block: 'start'});
  // Simula respuestas que llegan de a una.
  for (let i = 0; i < selected.length; i++) {
    await new Promise(r => setTimeout(r, 450));
    const result = offersFor(selected[i], scenario, risk);
    nodes[i].textContent = `Compañía ${selected[i]}: ${result.offers.length ? `${result.offers.length} planes · N° ${result.number}` : result.status}`;
    nodes[i].className = result.offers.length ? 'done' : /Error/.test(result.status) ? 'error' : 'none';
    if (!result.offers.length) companyStates[selected[i]] = result.status;
    available.push(...result.offers);
    renderOffers();
  }
  submit.disabled = false; submit.textContent = 'Cotizar';
  quotedKey = riskKey();
  updateRecord('Cotizada');
  running = false;
});
$('#requote').addEventListener('click', () => form.requestSubmit());
$('#edit-risk').addEventListener('click', () => { $('#inicio').scrollIntoView({behavior: 'smooth'}); setTimeout(() => F.localidad.focus({preventScroll: true}), 400); });

function selectedOffers() { return available.filter(o => chosen.includes(o.id)); }
function comparison(items) {
  const table = el('table'), head = el('tr');
  head.append(el('th', '', 'Condición'));
  items.forEach(o => head.append(el('th', '', `Compañía ${o.company} · ${o.name}`)));
  table.append(head);
  const opt = (v, f = x => x) => v == null ? '—' : f(v);
  const rows = [['Cuota', o => `${money(o.price)} ${o.period || 'por mes'}`], ['Premio total anual', o => opt(o.premium, money)], ['Pago contado', o => o.cash ? money(o.cash) : 'No disponible'], ['Prima de tarifa', o => opt(o.net, money)],
    ['Suma asegurada', o => money(o.sum)], ['Responsabilidad civil', o => opt(o.rc)], ['Robo e incendio', o => o.theft], ['Granizo', o => opt(o.hail)], ['Cristales y cerraduras', o => o.glass], ['Daños propios', o => o.own], ['Franquicia', o => o.deductible],
    ['N° de cotización', o => opt(o.number, String)], ['Validez', o => o.validity]];
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
  const d = current.data, view = $('#proposal-view'), head = el('div', 'proposal-head');
  head.innerHTML = LOGO;
  head.append(el('span', '', 'Propuesta de cobertura · demostración'));
  const body = el('div', 'proposal-body'), meta = el('div', 'proposal-meta'), clientBox = el('div'), clientName = el('b', '', d.cliente || 'A completar');
  clientBox.append(el('span', '', 'Cliente'), clientName);
  meta.append(clientBox);
  for (const [label, value] of [['Vehículo', `${vehicle(d)} ${d.anio}`], ['Uso y guarda', `${d.uso} · CP ${d.localidad}`], ['Productor', d.productor]]) {
    const box = el('div'); box.append(el('span', '', label), el('b', '', value)); meta.append(box);
  }
  // El cliente se pide recién acá: no hace falta para cotizar.
  const who = el('label', 'proposal-client', '¿Para quién es la propuesta?'), input = el('input');
  input.value = d.cliente || ''; input.placeholder = 'Nombre del cliente';
  input.addEventListener('input', () => { clientName.textContent = input.value || 'A completar'; d.cliente = input.value; F.cliente.value = input.value; persist(); refresh(); });
  who.append(input);
  const tools = el('div', 'actions');
  tools.append(action('Imprimir / guardar PDF', () => window.print(), 'arrow'), action('Copiar resumen', async () => {
    try {
      await navigator.clipboard.writeText(`Propuesta${d.cliente ? ` para ${d.cliente}` : ''} (demo sin validez comercial)\n${vehicle(d)} ${d.anio}\n` + selectedOffers().map(o => `Compañía ${o.company} · ${o.name} · ${money(o.price)} ${o.period || 'por mes'}`).join('\n'));
      status('Resumen copiado para compartir.');
    } catch (_) { status('No se pudo copiar. Usá la propuesta imprimible.'); }
  }, 'secondary'));
  body.append(el('span', 'eyebrow', `Preparada el ${new Date().toLocaleDateString('es-AR')}`), el('h2', '', 'Opciones para tu vehículo'), who, meta, comparison(selectedOffers()),
    el('p', 'disclaimer', 'Datos y valores ficticios. Sin validez comercial. No constituye cobertura ni recomendación de contratación.'), tools);
  view.replaceChildren(head, body);
  view.hidden = false;
  updateRecord('Propuesta preparada', true);
  view.scrollIntoView({behavior: 'smooth'});
  if (!d.cliente) setTimeout(() => input.focus({preventScroll: true}), 500);
});

// ---------- Historial ----------
function renderHistory() {
  const list = $('#history-list'), filter = $('#history-filter').value;
  list.replaceChildren();
  const filtered = records.filter(r => !filter || r.status === filter);
  if (!filtered.length) list.append(el('p', 'disclaimer', 'Todavía no hay cotizaciones con este filtro.'));
  for (const r of filtered) {
    const row = el('div', 'history-row'), info = el('div', 'meta');
    info.append(el('b', '', [vehicle(r.data), r.data.anio].filter(Boolean).join(' ') || 'Borrador sin vehículo'), el('span', '', `${r.data.cliente || 'Sin cliente'} · ${r.created}${r.offers.length ? ` · ${r.offers.length} opciones` : ''}`));
    const state = el('select');
    for (const name of STATES) { const option = el('option', '', name); option.selected = r.status === name; state.append(option); }
    state.setAttribute('aria-label', 'Estado de cotización');
    state.addEventListener('change', () => { r.status = state.value; persist(); });
    row.append(info, el('span', `badge ${STATE_TONE[r.status] || 'neutral'}`, r.status), state, action('Retomar', () => resume(r), 'secondary'));
    list.append(row);
  }
}
function resume(r) {
  location.hash = '';
  current = r; fill(r.data, {zero: r.data.patente === '0 km'}); available = r.offers; companyStates = {};
  chosen = (r.selected || []).filter(id => available.some(o => o.id === id));
  results.querySelectorAll('.company-statuses').forEach(n => n.remove());
  quotedKey = riskKey();
  renderOffers(); results.hidden = !available.length; $('#stale').hidden = true;
  $('#comparison').hidden = true; $('#proposal-view').hidden = true;
  (available.length ? results : $('#inicio')).scrollIntoView({behavior: 'smooth'});
}
$('#history-filter').addEventListener('change', renderHistory);
$('#clear-history').addEventListener('click', () => { if (confirm('¿Borrar el historial de demostración de este navegador?')) { records = []; current = null; persist(); } });

const bottom = form.querySelector('.form-bottom');
bottom.insertBefore(action('Empezar de nuevo', () => {
  try { localStorage.removeItem(DRAFT); } catch (_) {}
  form.reset(); current = null; plate.value = ''; lastLookup = ''; plate.disabled = false; $('#find-plate').disabled = false;
  plate.closest('.plate-search').classList.remove('is-zero');
  F.version.dataset.confirm = '';
  options(F.anio, years(), 'Elegí el año'); cascade(0); syncDate(); cpCheck(); refresh();
  plateStatus.textContent = 'Escribí la patente para buscar el vehículo.';
  results.hidden = true; $('#proposal-view').hidden = true; status('');
  plate.focus();
}, 'link'), bottom.querySelector('[type=submit]'));
bottom.insertBefore(action('Guardar borrador', () => {
  const d = data();
  if (!d.marca && !d.modelo && !normalizePlate(plate.value)) { status('Cargá al menos la patente o el vehículo para guardar un borrador.'); return; }
  if (current?.status !== 'Borrador') current = null;
  available = []; chosen = [];
  updateRecord('Borrador');
  results.hidden = true; $('#proposal-view').hidden = true;
  status('Borrador guardado. Lo encontrás en Historial de cotizaciones.');
}, 'secondary'), bottom.querySelector('[type=submit]'));

$('#copy-feedback').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('Portal Gaman: cotización por patente, comparación de coberturas, propuesta PDF, historial y cartera. Próximo: nuevos ramos, emisión, inspecciones, alertas y reportes.');
    $('#copy-status').textContent = 'Ideas copiadas.';
  } catch (_) { $('#copy-status').textContent = 'Podés seleccionar y copiar el texto de esta sección.'; }
});

// ---------- Inicio ----------
const params = new URLSearchParams(location.search);
if (params.has('escenarios')) form.querySelector('.scenario').hidden = false;
let draft = null;
try { draft = JSON.parse(localStorage.getItem(DRAFT)); } catch (_) {}
if (draft?.d) fill(draft.d, {plate: draft.plate, zero: draft.zero, vigencia: draft.vigencia});
else { syncDate(); cpCheck(); refresh(); }
// Desde la ficha de cliente: cotizar para ese cliente.
if (params.get('cliente')) { F.cliente.value = params.get('cliente'); refresh(); }
renderHistory();
// Desde la cotización rápida: abrir esa cotización con la comparación completa.
const resumed = records.find(r => r.id === params.get('retomar'));
if (resumed) resume(resumed);
else if (!location.hash && !$('#zero-km').checked) plate.focus({preventScroll: true});

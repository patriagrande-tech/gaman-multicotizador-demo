import {fields, normalize, preview, daysTo, cellValue} from './portfolio.mjs';

const $ = s => document.querySelector(s), KEY = 'gaman-portfolio-v2';
const today = () => new Date().toLocaleDateString('en-CA');
function future(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-CA'); }
const seed = () => ({records: [
  {id: 'seed1', poliza: 'DEMO-001', compania: 'Compañía ficticia A', cliente: 'Cliente de ejemplo 1', ramo: 'Automotores', productor: 'Productor demo', vencimiento: future(12), source: 'Datos ficticios iniciales'},
  {id: 'seed2', poliza: 'DEMO-002', compania: 'Compañía ficticia B', cliente: 'Cliente de ejemplo 2', ramo: 'Hogar', productor: 'Productor demo', vencimiento: future(-5), source: 'Datos ficticios iniciales'},
  {id: 'seed3', poliza: 'DEMO-003', compania: 'Compañía ficticia C', cliente: 'Cliente de ejemplo 3', ramo: 'Comercio', productor: 'Productor demo', vencimiento: future(80), source: 'Datos ficticios iniciales'}
], tasks: [], audit: []});
let state = seed(), workbook = null, rows = [], checked = [], source = '';
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (s && Array.isArray(s.records) && Array.isArray(s.tasks) && Array.isArray(s.audit)) state = s;
  // La ficha de cliente lee la cartera guardada: persistir el ejemplo desde el primer ingreso.
  else localStorage.setItem(KEY, JSON.stringify(state));
} catch (_) {}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function button(text, fn, cls = '') { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
function message(text) { $('#message').textContent = text; }
function save(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); state = next; render(); return true; }
  catch (_) { message('No se pudo guardar. Revisá el espacio o los permisos de almacenamiento del navegador.'); return false; }
}
function changeEvent(text) { return {date: new Date().toLocaleString('es-AR'), text}; }
function dateAR(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : iso; }

// Estado del vencimiento: tono del badge y texto relativo.
function dueBadge(date) {
  const days = daysTo(date);
  if (days === null) return el('span', 'badge neutral', 'Sin fecha');
  if (days < 0) return el('span', 'badge bad', `Vencida hace ${-days} día${days === -1 ? '' : 's'}`);
  if (days === 0) return el('span', 'badge bad', 'Vence hoy');
  if (days <= 30) return el('span', 'badge warn', `Vence en ${days} día${days === 1 ? '' : 's'}`);
  return el('span', 'badge ok', 'Vigente');
}

function render() {
  const soon = state.records.filter(r => daysTo(r.vencimiento) >= 0 && daysTo(r.vencimiento) <= 30).length;
  const expired = state.records.filter(r => daysTo(r.vencimiento) < 0).length;
  $('#metrics').replaceChildren(...[['Pólizas en cartera', state.records.length, 'info'], ['Vencen en 30 días', soon, 'warn'], ['Vencidas', expired, 'bad'], ['Tareas abiertas', state.tasks.filter(t => !t.done).length, 'ok']].map(([label, value, tone]) => {
    const card = el('div', `metric ${tone}`);
    card.append(el('span', '', label), el('b', '', String(value)));
    return card;
  }));

  const q = normalize($('#search').value), filter = $('#situation').value;
  const filtered = state.records.filter(r => {
    const days = daysTo(r.vencimiento);
    return normalize([r.poliza, r.compania, r.cliente, r.ramo, r.productor, r.vencimiento].join(' ')).includes(q)
      && (!filter || (filter === 'expired' && days < 0) || (filter === 'soon' && days >= 0 && days <= 30) || (filter === 'later' && days > 30));
  }).sort((a, b) => String(a.vencimiento).localeCompare(String(b.vencimiento)));
  $('#empty').hidden = !!filtered.length;
  $('#policies').replaceChildren(...filtered.map(r => {
    const tr = el('tr'), policy = el('td'), due = el('td'), open = el('td');
    policy.append(el('b', '', r.poliza), el('small', '', r.compania));
    due.append(dueBadge(r.vencimiento));
    open.append(button('Ver ficha', () => showDetail(r), 'secondary'));
    const who = el('td'), link = el('a', 'person', r.cliente);
    const release = new URLSearchParams(location.search).get('release');
    link.href = `cliente.html?local=${encodeURIComponent(r.cliente)}${release ? `&release=${release}` : ''}`;
    who.append(link);
    tr.append(policy, who, el('td', '', r.ramo), el('td', '', dateAR(r.vencimiento)), due, open);
    return tr;
  }));

  const select = $('#task-policy'), old = select.value;
  select.replaceChildren(...state.records.map(r => { const o = el('option', '', `${r.poliza} · ${r.cliente}`); o.value = r.id; return o; }));
  if (state.records.some(r => r.id === old)) select.value = old;

  $('#task-list').replaceChildren();
  for (const t of [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.date.localeCompare(b.date))) {
    const row = el('div', 'task-row' + (t.done ? ' done' : '')), r = state.records.find(x => x.id === t.policy), info = el('div');
    const toggle = button('✓', () => save({...state, tasks: state.tasks.map(x => x.id === t.id ? {...x, done: !x.done} : x), audit: [changeEvent(`Tarea ${t.done ? 'reabierta' : 'completada'}: ${t.title}`), ...state.audit].slice(0, 100)}), 'task-check');
    toggle.setAttribute('aria-label', t.done ? `Reabrir ${t.title}` : `Completar ${t.title}`);
    info.append(el('b', '', t.title), el('span', '', `${r?.poliza || 'Póliza no disponible'} · ${r?.cliente || ''} · ${t.owner}`));
    row.append(toggle, info, t.done ? el('span', 'badge ok', 'Completada') : dueBadge(t.date));
    $('#task-list').append(row);
  }
  if (!state.tasks.length) $('#task-list').append(el('p', 'disclaimer', 'Todavía no hay tareas. Creá una con el formulario o desde la ficha de una póliza.'));
  $('#audit').replaceChildren(...state.audit.slice(0, 20).map(a => el('p', '', `${a.date} · ${a.text}`)));
  if (!state.audit.length) $('#audit').append(el('p', '', 'Sin movimientos todavía.'));
}

function showDetail(r) {
  const detail = $('#detail'), grid = el('div', 'detail-grid'), actions = el('div', 'actions');
  for (const [label, value] of [['Cliente', r.cliente], ['Compañía', r.compania], ['Ramo', r.ramo], ['Productor', r.productor], ['Vencimiento', dateAR(r.vencimiento)], ['Origen', r.source || 'Importación local']]) {
    const box = el('div'); box.append(el('span', '', label), el('b', '', value)); grid.append(box);
  }
  actions.append(button('Eliminar póliza', () => {
    if (!confirm(`¿Eliminar ${r.poliza} y sus tareas de esta demo?`)) return;
    if (save({...state, records: state.records.filter(x => x.id !== r.id), tasks: state.tasks.filter(x => x.policy !== r.id), audit: [changeEvent(`Póliza eliminada: ${r.poliza} · ${r.compania}`), ...state.audit].slice(0, 100)})) {
      detail.hidden = true; message('Póliza eliminada de la cartera local.');
    }
  }), button('Preparar tarea de renovación', () => {
    $('#task-policy').value = r.id; $('#task-title').value = 'Preparar renovación'; $('#task-owner').value = r.productor; $('#task-date').value = today();
    location.hash = 'tasks';
  }, 'arrow'));
  const title = el('h3', '', `${r.poliza} · ${r.compania}`);
  detail.replaceChildren(title, dueBadge(r.vencimiento), grid, actions);
  detail.hidden = false;
  detail.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

$('#search').addEventListener('input', render);
$('#situation').addEventListener('change', render);
$('#task-form').addEventListener('submit', e => {
  e.preventDefault();
  if (!e.target.reportValidity()) return;
  const task = {id: crypto.randomUUID(), policy: $('#task-policy').value, title: $('#task-title').value.trim(), date: $('#task-date').value, owner: $('#task-owner').value.trim(), done: false};
  if (!task.title || !task.owner || !state.records.some(r => r.id === task.policy)) return;
  if (save({...state, tasks: [...state.tasks, task], audit: [changeEvent(`Tarea creada: ${task.title}`), ...state.audit].slice(0, 100)})) { e.target.reset(); message('Tarea guardada en este navegador.'); }
});
$('#reset').addEventListener('click', () => {
  if (confirm('¿Restablecer los datos de ejemplo y borrar las importaciones y tareas de esta demo?') && save(seed())) {
    invalidate(); $('#detail').hidden = true; message('Datos de ejemplo restablecidos.');
  }
});

function invalidate() { checked = []; $('#preview-area').hidden = true; $('#confirm').disabled = true; }
function sheetRows() {
  invalidate();
  const sheet = workbook.Sheets[$('#sheet').value];
  const opts = {header: 1, defval: '', blankrows: true};
  const text = XLSX.utils.sheet_to_json(sheet, {...opts, raw: false}), raw = XLSX.utils.sheet_to_json(sheet, {...opts, raw: true});
  const all = text.map((row, i) => row.map((v, j) => cellValue(raw[i]?.[j], v)));
  while (all.length && all[all.length - 1].every(v => String(v).trim() === '')) all.pop();
  if (all.length < 2 || all.length > 501) throw Error('La hoja debe tener encabezados y entre 1 y 500 filas de datos.');
  if (all[0].length > 60) throw Error('La hoja admite hasta 60 columnas.');
  const headers = all[0];
  rows = all.slice(1);
  $('#mapping').replaceChildren();
  for (const [field, label] of Object.entries(fields)) {
    const wrap = el('label', '', label), select = el('select'), empty = el('option', '', 'Elegí una columna');
    select.dataset.field = field; empty.value = ''; select.append(empty);
    headers.forEach((h, i) => {
      const o = el('option', '', `${i + 1}. ${h || 'Sin nombre'}`);
      o.value = String(i);
      if (normalize(h) === normalize(label) || normalize(h) === field) o.selected = true;
      select.append(o);
    });
    select.addEventListener('change', invalidate);
    wrap.append(select);
    $('#mapping').append(wrap);
  }
  $('#mapping-area').hidden = false;
}
function loadBook(book, name) {
  workbook = book; source = name; invalidate();
  $('#mapping').replaceChildren();
  $('#sheet').replaceChildren(...book.SheetNames.map(n => { const o = el('option', '', n); o.value = n; return o; }));
  $('#mapping-area').hidden = false;
  sheetRows();
}
$('#file').addEventListener('change', async e => {
  invalidate(); $('#mapping-area').hidden = true;
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 2 * 1024 * 1024) throw Error('Elegí un Excel o CSV de hasta 2 MB.');
    // CSV como texto: evita que 05/01 se lea en formato estadounidense y que 001 pierda los ceros.
    const book = XLSX.read(await file.arrayBuffer(), {type: 'array', sheetRows: 502, cellFormula: false, cellDates: true, raw: /\.csv$/i.test(file.name)});
    loadBook(book, file.name);
    message(`${file.name} leído en tu navegador. Revisá la correspondencia de columnas.`);
  } catch (err) { message(`No se pudo leer: ${err.message}`); }
});
$('#sheet').addEventListener('change', () => { $('#mapping').replaceChildren(); rows = []; try { sheetRows(); } catch (err) { message(err.message); } });
$('#validate').addEventListener('click', () => {
  invalidate();
  try {
    const mapping = Object.fromEntries([...$('#mapping').querySelectorAll('select')].map(n => [n.dataset.field, n.value === '' ? -1 : Number(n.value)]));
    checked = preview(rows, mapping, state.records);
    const valid = checked.filter(r => !r.errors.length).length;
    $('#preview-summary').textContent = `${valid} fila${valid === 1 ? '' : 's'} lista${valid === 1 ? '' : 's'} para importar · ${checked.length - valid} con errores o duplicadas`;
    const table = el('table'), head = el('tr');
    ['Fila', 'Póliza', 'Compañía', 'Cliente', 'Vencimiento', 'Resultado'].forEach(v => head.append(el('th', '', v)));
    table.append(head);
    for (const r of checked.slice(0, 50)) {
      const tr = el('tr');
      [r.line, r.record.poliza, r.record.compania, r.record.cliente, dateAR(r.record.vencimiento)].forEach(v => tr.append(el('td', '', String(v))));
      tr.append(el('td', r.errors.length ? 'row-bad' : 'row-ok', r.errors.join(' · ') || 'Lista para importar'));
      table.append(tr);
    }
    $('#preview-table').replaceChildren(table);
    $('#preview-area').hidden = false;
    $('#confirm').disabled = !valid;
    $('#confirm').textContent = valid ? `Confirmar ${valid} fila${valid === 1 ? '' : 's'}` : 'Sin filas válidas';
  } catch (err) { message(err.message); }
});
$('#confirm').addEventListener('click', () => {
  const valid = checked.filter(r => !r.errors.length);
  if (!valid.length) return;
  const now = new Date().toLocaleString('es-AR');
  const incoming = valid.map(r => ({...r.record, id: crypto.randomUUID(), source: `${source} · fila ${r.line} · ${now}`}));
  if (save({...state, records: [...state.records, ...incoming], audit: [changeEvent(`${incoming.length} pólizas importadas desde ${source}`), ...state.audit].slice(0, 100)})) {
    invalidate();
    message(`${incoming.length} pólizas agregadas a tu cartera. Las filas con errores no se importaron.`);
  }
});
function sampleRows() {
  return [['poliza', 'compania', 'ramo', 'cliente', 'productor', 'vencimiento'],
    ['NUEVA-001', 'Compañía ficticia A', 'Automotores', 'Prospecto ficticio', 'Productor demo', future(20)],
    ['NUEVA-001', 'Compañía ficticia A', 'Automotores', 'Duplicado ficticio', 'Productor demo', future(20)],
    ['NUEVA-002', 'Compañía ficticia B', 'Hogar', 'Ejemplo fecha inválida', 'Productor demo', '31/02/2027']];
}
$('#example').addEventListener('click', () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sampleRows()), 'Ejemplo');
  try { loadBook(book, 'Ejemplo ficticio'); message('Ejemplo cargado: una fila válida, una duplicada y una con fecha inválida.'); } catch (err) { message(err.message); }
});
$('#template').addEventListener('click', () => {
  const csv = '﻿' + sampleRows().slice(0, 2).map(r => r.join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'})), link = el('a');
  link.href = url; link.download = 'plantilla-cartera.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
render();

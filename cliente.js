import {DEMO_ORGANIZER, UNITS, producerById, clientsOf, opportunities} from './network.mjs';
import {el, number, money, href, metric, dueBadge, dateAR} from './charts.mjs';

const $ = s => document.querySelector(s);
const role = document.documentElement.dataset.role;
const params = new URLSearchParams(location.search);
const content = $('#content');

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } }
function panel(eyebrow, title, ...body) {
  const s = el('section', 'panel'), head = el('div', 'panel-head'), h = el('div'), eb = el('span', 'eyebrow');
  eb.append(el('i'), eyebrow);
  h.append(eb, el('h2', '', title));
  head.append(h); s.append(head, ...body);
  return s;
}
function link(text, path, cls = 'btn secondary') { const a = el('a', cls, text); a.href = href(path); return a; }

// Arma un cliente con la misma forma venga de la red ficticia o de la cartera local del productor.
function load() {
  if (params.has('p')) {
    const producer = producerById(params.get('p'));
    if (!producer) return null;
    if (role === 'organizador' && producer.organizer !== DEMO_ORGANIZER) return {denied: true};
    const c = clientsOf(producer)[Number(params.get('c'))];
    if (!c) return null;
    const crumb = $('#crumb');
    crumb.replaceChildren(link('Productores', 'red.html#productores', ''), ' / ', link(producer.name, `productor.html?id=${producer.id}`, ''), ' / ', c.name);
    return {...c, producer: producer.name, tasks: [], quotes: []};
  }
  const name = params.get('local');
  const portfolio = read('gaman-portfolio-v2', {records: [], tasks: []});
  const records = (portfolio.records || []).filter(r => r.cliente === name);
  if (!name || !records.length) return null;
  const ids = new Set(records.map(r => r.id));
  const quotes = (read('gaman-demo-history-v1', []) || []).filter(q => q.data?.cliente === name);
  $('#crumb').lastChild.textContent = ` ${name}`;
  return {
    name, type: 'PF', doc: 'Documento no cargado', email: '', phone: '', since: null, producer: records[0].productor,
    policies: records.map(r => ({number: r.poliza, ramo: r.ramo, company: r.compania, detail: r.source || '', expires: r.vencimiento, premium: null, payment: null})),
    claims: [], tasks: (portfolio.tasks || []).filter(t => ids.has(t.policy)), quotes, local: true,
  };
}

const client = load();
if (!client) content.append(Object.assign(el('section', 'panel empty-state'), {innerHTML: '<h2>No encontramos ese cliente</h2><p>Volvé a la cartera y elegilo desde la lista.</p>'}));
else if (client.denied) content.append(Object.assign(el('section', 'panel empty-state'), {innerHTML: '<h2>Este cliente no pertenece a tu organización</h2><p>Cada organizador accede solo a la cartera de sus productores, según los permisos que defina Gaman.</p>'}));
else render(client);

function render(c) {
  document.title = `${c.name} | Portal Gaman`;
  const head = el('section', 'profile-head'), id = el('div', 'profile-id'), info = el('div'), tags = el('div', 'tags');
  tags.append(el('span', 'badge neutral', c.type === 'PJ' ? 'Empresa' : 'Persona'));
  if (c.since) tags.append(el('span', 'badge info', `Cliente desde ${c.since}`));
  info.append(el('h1', '', c.name), el('p', '', [c.doc, c.email, c.phone].filter(Boolean).join(' · ')), el('p', 'muted', `Productor: ${c.producer}`), tags);
  id.append(el('span', 'avatar', c.name.split(' ').map(w => w[0]).join('').slice(0, 2)), info);
  const actions = el('div', 'actions');
  actions.append(link('Cotizar', `cotizador.html?cliente=${encodeURIComponent(c.name)}`, 'btn arrow'));
  if (c.local) actions.append(link('Nueva tarea', 'cartera.html#tasks'));
  const wa = el('button', 'secondary', 'WhatsApp'); wa.disabled = true; wa.title = 'Próxima etapa: conversaciones integradas';
  actions.append(wa);
  head.append(id, actions);

  const priced = c.policies.filter(p => p.premium != null), bad = c.policies.filter(p => p.payment && p.payment !== 'Al día');
  const kpis = el('div', 'metrics');
  kpis.append(metric('Pólizas', number(c.policies.length)), metric('Premio mensual', priced.length ? money(priced.reduce((s, p) => s + p.premium, 0)) : '—'),
    metric('Siniestros', number(c.claims.length), c.claims.length ? 'warn' : 'ok'), metric('Pagos', bad.length ? bad[0].payment : c.local ? 'Sin dato' : 'Al día', bad.length ? 'bad' : 'ok'));

  // Cobertura actual y oportunidades de venta cruzada.
  const chips = el('div', 'chips');
  for (const r of new Set(c.policies.map(p => p.ramo))) chips.append(el('span', 'chip have', `✓ ${r}`));
  for (const r of opportunities(c)) { const a = link(`+ Cotizar ${r}`, `cotizador.html?cliente=${encodeURIComponent(c.name)}`, 'chip want'); chips.append(a); }
  const coverage = panel('Cobertura', 'Lo que tiene y lo que le falta', chips, el('p', 'disclaimer', 'Las oportunidades salen de comparar sus ramos con los habituales para su perfil.'));

  const referral = el('div', 'referral');
  if (c.type === 'PJ') {
    referral.append(el('p', '', 'Este cliente es una empresa. Podés derivarlo a otra unidad de Gaman y seguir siendo su interlocutor.'));
    const row = el('div', 'actions');
    for (const unit of UNITS) row.append(Object.assign(el('button', 'secondary', `Derivar a ${unit}`), {type: 'button', onclick: () => { $('#message').textContent = `Derivación a ${unit} registrada para ${c.name} (demo). El equipo de ${unit} lo contactará y vas a ver el estado en tu panel.`; window.scrollTo({top: 0, behavior: 'smooth'}); }}));
    referral.append(row);
  } else referral.append(el('p', 'disclaimer', 'Las derivaciones a Prevención, Salud y Soluciones aplican a clientes empresa.'));
  const unitsPanel = panel('Un único interlocutor', 'Unidades Gaman', referral);

  const table = el('table'), body = el('tbody');
  table.innerHTML = '<thead><tr><th>Póliza</th><th>Riesgo</th><th>Vencimiento</th><th>Premio</th><th>Pago</th><th>Documentación</th></tr></thead>';
  for (const p of c.policies) {
    const tr = el('tr'), pol = el('td'), due = el('td'), pay = el('td'), docs = el('td', 'docs');
    pol.append(el('b', '', p.number), el('small', '', `${p.company} · ${p.ramo}`));
    due.append(el('span', '', dateAR(p.expires)), el('br'), dueBadge(p.expires));
    pay.append(p.payment ? el('span', `badge ${p.payment === 'Al día' ? 'ok' : p.payment === 'Pendiente' ? 'warn' : 'bad'}`, p.payment) : el('span', 'muted', 'Sin dato'));
    // Los mismos reportes que entrega la API de emisión de Federación Patronal.
    for (const d of ['Póliza', 'Certificado', ...(/Auto|Moto/.test(p.ramo) ? ['Tarjeta obligatoria'] : []), 'Cupón']) {
      const b = el('button', 'doc', d); b.type = 'button'; b.disabled = true; b.title = 'Se descarga desde la compañía cuando la integración esté activa';
      docs.append(b);
    }
    tr.append(pol, el('td', '', p.detail), due, el('td', 'num', p.premium != null ? money(p.premium) : '—'), pay, docs);
    body.append(tr);
  }
  table.append(body);
  const wrap = el('div', 'table-wrap'); wrap.append(table);
  const policies = panel('Pólizas', 'Pólizas vigentes', wrap);

  // Actividad: siniestros, cotizaciones, tareas y altas en una sola línea de tiempo.
  const events = [
    ...c.claims.map(s => ({date: s.date, text: `Siniestro · ${s.type}`, tag: s.state, tone: s.state === 'Cerrado' ? 'ok' : 'warn'})),
    ...c.quotes.map(q => ({date: new Date().toLocaleDateString('en-CA'), text: `Cotización · ${[q.data.marca, q.data.modelo].filter(Boolean).join(' ') || 'borrador'}`, tag: q.status, tone: 'info', raw: q.created})),
    ...c.tasks.map(t => ({date: t.date, text: `Tarea · ${t.title}`, tag: t.done ? 'Completada' : 'Pendiente', tone: t.done ? 'ok' : 'warn'})),
    ...(c.since ? [{date: `${c.since}-03-01`, text: 'Alta como cliente', tag: 'Cartera', tone: 'neutral'}] : []),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const timeline = el('ol', 'timeline-v');
  for (const e of events) { const li = el('li'); li.append(el('span', 'when', e.raw || dateAR(e.date)), el('b', '', e.text), el('span', `badge ${e.tone}`, e.tag)); timeline.append(li); }
  if (!events.length) timeline.append(el('li', 'muted', 'Sin actividad registrada todavía.'));
  const activity = panel('Historial', 'Actividad', timeline);

  const cols = el('div', 'cols-2');
  cols.append(coverage, unitsPanel);
  content.append(head, kpis, cols, policies, activity);
}

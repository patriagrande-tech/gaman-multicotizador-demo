import {SEGMENTS, DEMO_ORGANIZER, PEG_GOAL, monthly, byCompany, organizerById, producerById, pegProgress, clientsOf} from './network.mjs';
import {el, number, compact, money, href, metric, columnChart, hbars, dueBadge} from './charts.mjs';

const $ = s => document.querySelector(s);
const role = document.documentElement.dataset.role;
const p = producerById(new URLSearchParams(location.search).get('id') || 'P0001');
const content = $('#content');
const SEG_TONE = {peg: 'info', federal: 'warn', inhouse: 'ok', pas: 'neutral'};

function panel(eyebrow, title, ...body) {
  const s = el('section', 'panel'), head = el('div', 'panel-head'), h = el('div');
  h.append(Object.assign(el('span', 'eyebrow'), {innerHTML: '<i></i>'}), el('h2', '', title));
  h.firstChild.append(eyebrow);
  head.append(h); s.append(head, ...body);
  return s;
}

if (!p) {
  content.append(el('p', 'empty-state', 'No encontramos ese productor.'));
} else if (role === 'organizador' && p.organizer !== DEMO_ORGANIZER) {
  // El permiso se ve en la demo: un organizador solo abre a los productores de su organización.
  const box = el('section', 'panel empty-state');
  box.append(el('h2', '', 'Este productor no pertenece a tu organización'), el('p', '', 'Cada organizador ve únicamente a sus productores. El equipo Gaman define estos permisos.'));
  content.append(box);
} else {
  $('#crumb-name').textContent = p.name;
  document.title = `${p.name} | Portal Gaman`;
  const org = organizerById(p.organizer);
  const head = el('section', 'profile-head'), id = el('div', 'profile-id'), avatar = el('span', 'avatar', p.name.split(' ').map(w => w[0]).join('').slice(0, 2));
  const info = el('div'), tags = el('div', 'tags');
  tags.append(el('span', `badge ${SEG_TONE[p.segment]}`, SEGMENTS[p.segment]), p.lastActive > 30 ? el('span', 'badge bad', `${p.lastActive} días sin actividad`) : el('span', 'badge ok', 'Activo'));
  info.append(el('h1', '', p.name), el('p', '', `Matrícula ${p.license} · ${p.city}, ${p.province} · ${org ? org.name : 'Productor InHouse'}`), tags);
  id.append(avatar, info);
  const actions = el('div', 'actions');
  const contact = el('button', 'secondary', 'Enviar mensaje'); contact.disabled = true; contact.title = 'Próxima etapa: comunicación con la red';
  actions.append(contact);
  head.append(id, actions);

  const kpis = el('div', 'metrics metrics-6');
  kpis.append(metric('Pólizas vigentes', number(p.policies)), metric('Prima anual', compact(p.annualPremium)), metric('Retención', `${p.retention}%`, 'ok'),
    metric('Renovaciones 30 días', number(p.renewals30), 'warn'), metric('Cotizaciones del mes', number(p.quotes), 'info', `${number(p.issued)} emitidas`),
    metric('Rechazos de pago', number(p.rejections), p.rejections ? 'bad' : 'ok'));

  const progress = pegProgress(p), peg = el('div', 'peg-box');
  if (p.segment === 'peg') peg.append(el('b', '', 'Productor Elite Gaman'), el('p', '', 'Mantiene los beneficios del segmento mientras sostenga prima y retención.'));
  else {
    const bar = el('div', 'progress'), fill = el('span'); fill.style.width = `${progress}%`; bar.append(fill);
    peg.append(el('b', '', `${progress}% del camino a PEG`), bar,
      el('p', '', `Meta ilustrativa: ${compact(PEG_GOAL.premium)} de prima anual (hoy ${compact(p.annualPremium)}) y ${PEG_GOAL.retention}% de retención (hoy ${p.retention}%).`));
  }

  const charts = el('div', 'cols-2');
  charts.append(panel('Producción', 'Prima emitida por mes', columnChart(monthly([p]), {label: 'Prima emitida'})),
    panel('Compañías', 'Pólizas por compañía', hbars(byCompany([p]).map(d => ({...d, value: Math.round(d.value)})).filter(d => d.value > 0)), peg));

  const clients = clientsOf(p), search = el('input'), body = el('tbody'), table = el('table'), wrap = el('div', 'table-wrap'), label = el('label', '', 'Buscar cliente');
  search.placeholder = 'Nombre, DNI/CUIT, patente o póliza';
  label.append(search);
  table.innerHTML = '<thead><tr><th>Cliente</th><th>Pólizas</th><th>Próximo vencimiento</th><th>Premio mensual</th><th>Pagos</th></tr></thead>';
  table.append(body); wrap.append(table);
  function renderClients() {
    const q = search.value.trim().toLowerCase();
    body.replaceChildren(...clients.filter(c => !q || [c.name, c.doc, ...c.policies.map(x => `${x.number} ${x.detail}`)].join(' ').toLowerCase().includes(q)).map(c => {
      const tr = el('tr'), who = el('td'), next = [...c.policies].sort((a, b) => a.expires.localeCompare(b.expires))[0], due = el('td'), pay = el('td');
      const a = el('a', 'person', c.name); a.href = href(`cliente.html?p=${p.id}&c=${c.index}`);
      who.append(a, el('small', '', `${c.type === 'PJ' ? 'Empresa' : 'Persona'} · ${c.doc}`));
      due.append(dueBadge(next.expires));
      const bad = c.policies.find(x => x.payment !== 'Al día');
      pay.append(el('span', `badge ${!bad ? 'ok' : bad.payment === 'Pendiente' ? 'warn' : 'bad'}`, bad ? bad.payment : 'Al día'));
      tr.append(who, el('td', '', Object.entries(c.policies.reduce((m, x) => ({...m, [x.ramo]: (m[x.ramo] || 0) + 1}), {})).map(([r, n]) => n > 1 ? `${r} ×${n}` : r).join(' · ')), due, el('td', 'num', money(c.policies.reduce((s, x) => s + x.premium, 0))), pay);
      return tr;
    }));
  }
  search.addEventListener('input', renderClients);
  renderClients();
  const cartera = panel('Cartera', 'Clientes', el('p', 'disclaimer', `Muestra de ${clients.length} clientes de ${number(p.policies)} pólizas. El acceso del organizador y de Gaman a la cartera se configura según la política que definan.`), label, wrap);
  content.append(head, kpis, charts, cartera);
}

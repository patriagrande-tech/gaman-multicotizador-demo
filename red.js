import {network, ORGANIZERS, DEMO_ORGANIZER, SEGMENTS, monthly, byCompany, organizerById, producerById, pegProgress} from './network.mjs';
import {el, number, compact, href, metric, columnChart, hbars} from './charts.mjs';

const $ = s => document.querySelector(s);
const role = document.documentElement.dataset.role;
const {producers: all, referrals} = network();
const own = role === 'organizador' ? all.filter(p => p.organizer === DEMO_ORGANIZER) : all;
const SEG_TONE = {peg: 'info', federal: 'warn', inhouse: 'ok', pas: 'neutral'};
const STATE_TONE = {Nueva: 'info', Contactada: 'neutral', 'Propuesta enviada': 'warn', Ganada: 'ok', Perdida: 'bad'};
let page = 25;

if (role === 'organizador') {
  $('#scope-label').textContent = organizerById(DEMO_ORGANIZER).name;
  $('#scope-text').textContent = `Los ${own.length} productores de tu organización: producción, cartera y alertas. Últimos 12 meses.`;
  $('#f-organizer-wrap').hidden = true;
  document.querySelector('.crumb').lastChild.textContent = ' Mi organización';
} else {
  $('#f-organizer').append(...ORGANIZERS.map(o => { const op = el('option', '', o.name); op.value = o.id; return op; }));
  const inhouse = el('option', '', 'InHouse (sin organizador)'); inhouse.value = 'none'; $('#f-organizer').append(inhouse);
}

function view() {
  const seg = $('#f-segment').value, org = $('#f-organizer').value;
  return own.filter(p => (!seg || p.segment === seg) && (!org || (org === 'none' ? !p.organizer : p.organizer === org)));
}
function producerLink(p) {
  const a = el('a', 'person', p.name);
  a.href = href(`productor.html?id=${p.id}`);
  const cell = el('td'); cell.append(a, el('small', '', `Mat. ${p.license} · ${p.city}`));
  return cell;
}
function activity(p) {
  return p.lastActive > 30 ? el('span', 'badge bad', `${p.lastActive} días sin actividad`) : el('span', 'badge ok', p.lastActive ? `Hace ${p.lastActive} d` : 'Hoy');
}
function row(p) {
  const tr = el('tr'), seg = el('td'), act = el('td');
  seg.append(el('span', `badge ${SEG_TONE[p.segment]}`, SEGMENTS[p.segment]));
  act.append(activity(p));
  tr.append(producerLink(p), el('td', '', organizerById(p.organizer)?.name.replace('Organización ', '') || 'InHouse'), seg,
    el('td', 'num', number(p.policies)), el('td', 'num', compact(p.annualPremium)), el('td', 'num', `${p.retention}%`), act);
  return tr;
}

function renderOverview() {
  const v = view(), sum = f => v.reduce((s, p) => s + f(p), 0), policies = sum(p => p.policies);
  const active = v.filter(p => p.lastActive <= 30).length, quotes = sum(p => p.quotes), issued = sum(p => p.issued);
  $('#kpis').replaceChildren(
    metric('Productores activos', number(active), 'info', `de ${number(v.length)} · ${Math.round(active / Math.max(1, v.length) * 100)}% con actividad en 30 días`),
    metric('Pólizas vigentes', number(policies), 'info'),
    metric('Prima anual', compact(sum(p => p.annualPremium)), 'info'),
    metric('Retención', `${Math.round(sum(p => p.retention * p.policies) / Math.max(1, policies))}%`, 'ok', 'ponderada por pólizas'),
    metric('Renovaciones 30 días', number(sum(p => p.renewals30)), 'warn'),
    metric('Cotizaciones del mes', number(quotes), 'info', `${Math.round(issued / Math.max(1, quotes) * 100)}% terminó en emisión`));
  $('#chart-month').replaceChildren(v.length ? columnChart(monthly(v), {label: 'Prima emitida'}) : el('p', 'disclaimer', 'Sin productores con estos filtros.'));
  $('#chart-company').replaceChildren(v.length ? hbars(byCompany(v).map(d => ({...d, value: Math.round(d.value)}))) : el('p'));

  $('#segments').replaceChildren(...Object.entries(SEGMENTS).map(([key, name]) => {
    const g = v.filter(p => p.segment === key), share = g.reduce((s, p) => s + p.annualPremium, 0) / Math.max(1, sum(p => p.annualPremium));
    const card = el('div', `segment ${key}`);
    card.append(el('span', `badge ${SEG_TONE[key]}`, name), el('b', '', number(g.length)), el('small', '', `${Math.round(share * 100)}% de la prima`));
    return card;
  }));

  const inactive = v.filter(p => p.lastActive > 30).sort((a, b) => b.policies - a.policies);
  const rejections = v.filter(p => p.rejections > 0).sort((a, b) => b.rejections - a.rejections);
  const nearPeg = v.filter(p => p.segment !== 'peg' && pegProgress(p) >= 75).sort((a, b) => pegProgress(b) - pegProgress(a));
  const alerts = [
    ['bad', `${inactive.length} productores sin actividad hace más de 30 días`, `Representan ${number(inactive.reduce((s, p) => s + p.policies, 0))} pólizas en riesgo de no renovarse.`, inactive],
    ['warn', `${number(rejections.reduce((s, p) => s + p.rejections, 0))} rechazos de pago en la cartera`, 'Cuotas rechazadas que conviene gestionar antes de la anulación.', rejections],
    ['info', `${nearPeg.length} productores cerca de ser PEG`, 'Superan el 75% de la meta de prima y retención.', nearPeg],
  ];
  $('#alerts').replaceChildren(...alerts.map(([tone, title, text, list]) => {
    const box = el('div', `alert ${tone}`), names = el('div', 'alert-people');
    for (const p of list.slice(0, 3)) { const a = el('a', '', p.name); a.href = href(`productor.html?id=${p.id}`); names.append(a); }
    box.append(el('b', '', title), el('p', '', text), names);
    return box;
  }));
  $('#top').replaceChildren(...[...v].sort((a, b) => b.annualPremium - a.annualPremium).slice(0, 8).map(row));
}

function renderList() {
  const q = $('#p-search').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const state = $('#p-state').value, sort = $('#p-sort').value;
  const list = view().filter(p => (!q || `${p.name} ${p.license} ${p.city}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
    && (!state || (state === 'active' && p.lastActive <= 30) || (state === 'inactive' && p.lastActive > 30) || (state === 'rejections' && p.rejections > 0)));
  const key = p => sort === 'peg' ? pegProgress(p) : p[sort];
  list.sort((a, b) => key(b) - key(a));
  $('#p-count').textContent = `${number(list.length)} productores · mostrando ${number(Math.min(page, list.length))}`;
  $('#p-rows').replaceChildren(...list.slice(0, page).map(row));
  $('#p-more').hidden = list.length <= page;
}

function renderReferrals() {
  const ids = new Set(view().map(p => p.id)), list = referrals.filter(r => ids.has(r.producer)).sort((a, b) => a.days - b.days);
  $('#units').replaceChildren(...['Prevención', 'Salud', 'Soluciones'].map(u => {
    const g = list.filter(r => r.unit === u);
    return metric(u, number(g.length), 'info', `${g.filter(r => r.state === 'Ganada').length} ganadas`);
  }), metric('Tasa de cierre', `${Math.round(list.filter(r => r.state === 'Ganada').length / Math.max(1, list.length) * 100)}%`, 'ok'));
  $('#ref-rows').replaceChildren(...list.map(r => {
    const p = producerById(r.producer), tr = el('tr'), unit = el('td'), state = el('td');
    unit.append(el('span', 'badge info', r.unit)); state.append(el('span', `badge ${STATE_TONE[r.state]}`, r.state));
    tr.append(el('td', '', r.client), el('td', 'num', number(r.employees)), producerLink(p), unit, state, el('td', '', r.days ? `${r.days} d` : 'Hoy'));
    return tr;
  }));
  if (!list.length) $('#ref-rows').append(Object.assign(el('tr'), {innerHTML: '<td colspan="6">Sin derivaciones con estos filtros.</td>'}));
}

function renderAll() { page = 25; renderOverview(); renderList(); renderReferrals(); }
$('#f-segment').addEventListener('change', renderAll);
$('#f-organizer').addEventListener('change', renderAll);
$('#p-search').addEventListener('input', () => { page = 25; renderList(); });
$('#p-sort').addEventListener('change', renderList);
$('#p-state').addEventListener('change', () => { page = 25; renderList(); });
$('#p-more').addEventListener('click', () => { page += 25; renderList(); });
renderAll();

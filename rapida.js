import {parse, riskFrom, quote, proposalText, whatsappUrl, placeOf} from './rapida.mjs';
import {plateLookup, versions, formatPlate, SAMPLE_PLATES} from './vehicles.mjs';
import {el, money, href} from './charts.mjs';

const $ = s => document.querySelector(s);
const log = $('#chat-log'), composer = $('#composer'), input = $('#chat-input');
const KEY = 'gaman-demo-history-v1';
const NOT_INCLUDED = /^No (incluid|aplica)/;
let s;

// ---------- Mensajes ----------
// **negrita** dentro del texto, sin interpretar HTML.
function rich(text) {
  const p = el('p');
  String(text).split(/(\*\*[^*]+\*\*)/).forEach(part => p.append(/^\*\*.*\*\*$/.test(part) ? el('b', '', part.slice(2, -2)) : part));
  return p;
}
function scroll() { requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); }
function bubble(who, ...nodes) {
  const row = el('div', `msg ${who}`), b = el('div', 'bubble');
  b.append(...nodes.map(n => typeof n === 'string' ? rich(n) : n));
  row.append(b);
  log.append(row);
  scroll();
  return b;
}
const user = text => bubble('me', text);
const bot = (...nodes) => bubble('bot', ...nodes);
// Respuestas sugeridas: al tocar una se envía como si se hubiera escrito.
function chips(list) {
  const box = el('div', 'quick-replies');
  for (const [label, value = label] of list) {
    const b = el('button', 'reply', label);
    b.type = 'button';
    b.addEventListener('click', () => { box.remove(); send(value, label); });
    box.append(b);
  }
  log.append(box);
  scroll();
  return box;
}
function clearChips() { log.querySelectorAll('.quick-replies').forEach(n => n.remove()); }
async function typing(ms = 600) {
  const t = el('div', 'msg bot typing'), b = el('div', 'bubble');
  b.append(el('i'), el('i'), el('i'));
  t.append(b); log.append(t); scroll();
  await new Promise(r => setTimeout(r, ms));
  t.remove();
}

// ---------- Historial compartido con el cotizador ----------
function readHistory() { try { const h = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(h) ? h : []; } catch (_) { return []; } }
function saveRecord(record) {
  const list = readHistory().filter(r => r.id !== record.id);
  list.unshift(record);
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30))); } catch (_) {}
}

// ---------- Conversación ----------
function reset(greet = true) {
  s = {step: 'plate', plate: '', vehicle: null, cp: '', uso: 'Particular', cliente: s?.cliente || new URLSearchParams(location.search).get('cliente') || '', record: null};
  if (!greet) return;
  bot('¡Hola! Cotizamos en un minuto. **Pasame la patente** del auto.', 'Si querés, mandá todo junto: patente y código postal. Por ejemplo, **AB123CD 2000**.');
  chips(SAMPLE_PLATES.slice(0, 3).map(p => [formatPlate(p), p]));
}

async function send(text, label = text) {
  text = String(text).trim();
  if (!text) return;
  clearChips();
  user(label);
  await typing(450);
  await handle(text);
  input.focus({preventScroll: true});
}

async function handle(text) {
  // Respuestas sugeridas que no son texto natural.
  if (text === 'nueva') { reset(false); bot('Dale, otra cotización. Pasame la patente.'); return chips(SAMPLE_PLATES.slice(0, 3).map(x => [formatPlate(x), x])); }
  if (text === 'cpnuevo') { s.step = 'cp'; s.cp = ''; bot('¿Cuál es el código postal?'); return cpChips(); }
  if (text === 'sinpatente') return noPlate();
  const p = parse(text, {expect: s.step === 'cp' ? 'cp' : null});
  if (p.restart && s.step !== 'plate') { reset(false); bot('Arrancamos de nuevo. Pasame la patente.'); chips(SAMPLE_PLATES.slice(0, 3).map(x => [formatPlate(x), x])); return; }
  if (p.cliente) s.cliente = p.cliente;
  const usoChanged = p.uso && p.uso !== s.uso;
  if (p.uso) s.uso = p.uso;
  if (p.plate && p.plate !== s.plate) return plate(p.plate, p.cp);

  switch (s.step) {
    case 'plate':
      bot('No reconozco una patente en ese mensaje. Puede ser nueva (**AB 123 CD**) o anterior (**ABC 123**).');
      return chips([['Usar un ejemplo', SAMPLE_PLATES[0]], ['No tengo la patente', 'sinpatente']]);
    case 'version': {
      const list = versions(s.vehicle.marca, s.vehicle.modelo, s.vehicle.anio);
      const picked = list.find(v => v.toUpperCase() === text.toUpperCase());
      if (picked) { s.vehicle.version = picked; return afterVehicle(); }
      if (text === 'otraversion') { bot('¿Cuál es la versión?'); return chips(list.map(v => [v])); }
      if (text === 'otroauto' || p.no) return noPlate();
      if (p.yes) return afterVehicle();
      bot('¿Es ese el auto? Tocá una opción o escribí **sí** o **no**.');
      return vehicleChips();
    }
    case 'cp':
      if (p.cp) return postcode(p.cp);
      bot('Necesito el **código postal** donde se guarda el auto: 4 números, por ejemplo 2000.');
      return cpChips();
    case 'confirm':
      if (usoChanged) return summary();
      if (p.cp) return postcode(p.cp);
      if (p.yes || p.quote) return run();
      bot('¿Cotizo así o querés cambiar algo? Podés escribir, por ejemplo, **es comercial** o **cp 1425**.');
      return confirmChips();
    case 'done':
      if (text === 'whatsapp') return whatsapp();
      if (p.cp && p.cp !== s.cp) { s.cp = p.cp; bot(`Cambié el código postal a **${p.cp}** (${placeOf(p.cp)}).`); return summary(); }
      if (usoChanged) { bot(`Cambié el uso a **${s.uso.toLowerCase()}**.`); return summary(); }
      if (p.quote) return run();
      bot('Podés mandar la propuesta por WhatsApp, abrir la comparación completa o empezar otra cotización.');
      return doneChips();
  }
}

function plate(value, cp) {
  const found = plateLookup(value);
  s.plate = value; s.step = 'version';
  if (cp) s.cp = cp;
  if (!found) {
    bot(`No encontré datos para **${formatPlate(value)}**. Podés cargar el auto a mano en el cotizador completo.`);
    return noPlate(false);
  }
  s.vehicle = {marca: found.marca, modelo: found.modelo, version: found.version, anio: found.anio};
  bot(`**${formatPlate(value)}** es un **${found.marca} ${found.modelo} ${found.anio}**, versión ${found.version}. ¿Es ese?`);
  vehicleChips();
}
function vehicleChips() { chips([['Sí, es ese', 'si'], ['Otra versión', 'otraversion'], ['Es otro auto', 'otroauto']]); }
function noPlate(say = true) {
  s.step = 'plate';
  const a = el('a', 'btn secondary', 'Abrir el cotizador completo');
  a.href = href('cotizador.html');
  bot(...(say ? ['Sin patente, el auto se elige de la lista de marcas y modelos en el cotizador completo.'] : []), a);
  chips([['Probar otra patente', SAMPLE_PLATES[1]]]);
}
function afterVehicle() {
  s.step = 'cp';
  if (s.cp) return postcode(s.cp);
  bot('Perfecto. ¿**Código postal** donde se guarda?');
  cpChips();
}
function cpChips() { chips([['2000 · Rosario', '2000'], ['1425 · CABA', '1425'], ['5000 · Córdoba', '5000']]); }
function postcode(cp) {
  const place = placeOf(cp);
  if (!place) { bot(`No encuentro el código postal **${cp}**. Probá con otro.`); return cpChips(); }
  s.cp = cp;
  summary(`CP ${cp} · ${place} ✓`);
}
function summary(prefix) {
  s.step = 'confirm';
  const v = s.vehicle, d = new Date();
  bot(...(prefix ? [prefix] : []), `Cotizo **${v.marca} ${v.modelo} ${v.anio}**, uso **${s.uso.toLowerCase()}**, con vigencia desde **hoy ${d.toLocaleDateString('es-AR')}**, en las 3 compañías.${s.cliente ? ` Cliente: **${s.cliente}**.` : ''}`);
  confirmChips();
}
function confirmChips() { chips([['Cotizar', 'si'], s.uso === 'Particular' ? ['Es uso comercial', 'comercial'] : ['Es uso particular', 'particular'], ['Cambiar código postal', 'cpnuevo']]); }

async function run() {
  const risk = riskFrom({vehicle: s.vehicle, plate: s.plate, cp: s.cp, uso: s.uso, cliente: s.cliente});
  bot('Consultando las 3 compañías…');
  await typing(1100);
  const {all, best} = quote(risk);
  s.step = 'done';
  s.record = {id: crypto.randomUUID(), created: new Date().toLocaleString('es-AR'), data: risk, offers: all, status: 'Cotizada', selected: best.map(o => o.id), source: 'Cotización rápida'};
  s.best = best;
  saveRecord(s.record);
  const cards = el('div', 'quick-offers');
  for (const o of best) {
    const card = el('article', 'quick-offer');
    const head = el('div', 'qo-head');
    head.append(el('b', '', o.name), el('span', `logo-mark ${o.company}`, o.company));
    const detail = [o.deductible !== 'No aplica' && `Franquicia ${o.deductible}`, !NOT_INCLUDED.test(o.hail) && 'Granizo', !NOT_INCLUDED.test(o.glass) && 'Cristales', !NOT_INCLUDED.test(o.theft) && 'Robo'].filter(Boolean);
    card.append(head, el('div', 'qo-price', money(o.price)), el('small', '', `${o.period} · Compañía ${o.company}`), el('p', '', detail.join(' · ') || 'Solo responsabilidad civil'));
    cards.append(card);
  }
  bot(`Listo: **${all.length} opciones**. La mejor de cada cobertura:`, cards, el('p', 'fine', 'Precios ficticios de demostración. La cotización quedó en tu historial.'));
  doneChips();
}
function doneChips() {
  const box = chips([['Enviar al cliente por WhatsApp', 'whatsapp'], ['Nueva cotización', 'nueva']]);
  const full = el('a', 'reply', 'Ver comparación completa');
  full.href = href(`cotizador.html?retomar=${s.record.id}`);
  box.insertBefore(full, box.lastChild);
}

// El mensaje sale del WhatsApp del productor: no hace falta la API de Meta y el cliente sigue siendo suyo.
function whatsapp() {
  const f = el('form', 'wa-form'), name = el('input'), phone = el('input'), preview = el('pre', 'wa-preview'), go = el('a', 'btn wa', 'Abrir WhatsApp');
  name.placeholder = 'Nombre del cliente (opcional)'; name.value = s.cliente; name.setAttribute('aria-label', 'Nombre del cliente');
  phone.placeholder = 'Celular, ej. 341 555 1234 (opcional)'; phone.inputMode = 'tel'; phone.setAttribute('aria-label', 'Celular del cliente');
  go.target = '_blank'; go.rel = 'noopener';
  const update = () => {
    s.record.data.cliente = name.value.trim();
    const text = proposalText(s.record.data, s.best, 'Productor demo');
    preview.textContent = text;
    go.href = whatsappUrl(text, phone.value);
  };
  name.addEventListener('input', update); phone.addEventListener('input', update);
  go.addEventListener('click', () => {
    s.cliente = name.value.trim();
    s.record.status = 'Propuesta preparada';
    saveRecord(s.record);
    setTimeout(() => { bot('Se abrió WhatsApp con la propuesta. La marqué como **Propuesta preparada** en tu historial.'); doneChips(); }, 300);
  });
  f.addEventListener('submit', e => e.preventDefault());
  f.append(name, phone, preview, go);
  update();
  bot('Revisá el mensaje. Se envía desde **tu** WhatsApp.', f);
  setTimeout(() => name.focus({preventScroll: true}), 50);
}

// ---------- Entrada ----------
composer.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value;
  input.value = '';
  if (text.trim()) send(text);
});
reset();
if (matchMedia('(min-width: 900px)').matches) input.focus({preventScroll: true});

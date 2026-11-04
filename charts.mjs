// Utilidades de interfaz y gráficos de una serie (un solo tono: magnitud, no identidad).
export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
export const number = v => Math.round(v).toLocaleString('es-AR');
export const money = v => new Intl.NumberFormat('es-AR', {style: 'currency', currency: 'ARS', maximumFractionDigits: 0}).format(v);
export function compact(v) {
  if (Math.abs(v) >= 1e9) return `$ ${(v / 1e9).toLocaleString('es-AR', {maximumFractionDigits: 1})} mil M`;
  if (Math.abs(v) >= 1e6) return `$ ${(v / 1e6).toLocaleString('es-AR', {maximumFractionDigits: 0})} M`;
  return money(v);
}
// Enlace interno que conserva la versión publicada.
export function href(path) {
  const release = new URLSearchParams(location.search).get('release');
  if (!release) return path;
  return path + (path.includes('?') ? '&' : '?') + 'release=' + release;
}
export function dateAR(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : iso || ''; }
export function daysUntil(iso) { return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(new Date().toLocaleDateString('en-CA') + 'T00:00:00Z')) / 86400000); }
export function dueBadge(iso) {
  const days = daysUntil(iso);
  if (Number.isNaN(days)) return el('span', 'badge neutral', 'Sin fecha');
  if (days < 0) return el('span', 'badge bad', `Vencida hace ${-days} d`);
  if (days <= 30) return el('span', 'badge warn', `Vence en ${days} d`);
  return el('span', 'badge ok', 'Vigente');
}
export function metric(label, value, tone = 'info', note = '') {
  const card = el('div', `metric ${tone}`);
  card.append(el('span', '', label), el('b', '', value));
  if (note) card.append(el('small', '', note));
  return card;
}

const SVG = 'http://www.w3.org/2000/svg';
function svg(tag, attrs) { const n = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; }
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p * 2) / 2 * p; }

// Columnas con grilla tenue, tooltip por columna, rótulo solo en el último valor y tabla alternativa.
export function columnChart(data, {format = compact, label = 'Valor'} = {}) {
  const W = 520, H = 230, L = 62, R = 8, T = 14, B = 28, plotW = W - L - R, plotH = H - T - B;
  const max = niceMax(Math.max(...data.map(d => d.value)) * 1.08), band = plotW / data.length, w = Math.min(34, band * 0.62);
  const fig = el('figure', 'chart'), root = svg('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${label}: ${data.map(d => `${d.month} ${format(d.value)}`).join(', ')}`});
  for (let i = 0; i <= 4; i++) {
    const y = T + plotH - plotH * i / 4;
    root.append(svg('line', {x1: L, x2: W - R, y1: y, y2: y, class: i ? 'grid' : 'axis'}));
    const t = svg('text', {x: L - 8, y: y + 4, class: 'tick', 'text-anchor': 'end'}); t.textContent = format(max * i / 4); root.append(t);
  }
  const tip = el('div', 'chart-tip'); tip.hidden = true;
  const bars = data.map((d, i) => {
    const h = Math.max(2, plotH * d.value / max), x = L + band * i + (band - w) / 2, y = T + plotH - h, r = Math.min(4, h / 2), base = T + plotH;
    const g = svg('g', {class: 'col'});
    g.append(svg('path', {d: `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`, class: 'bar'}));
    const t = svg('text', {x: x + w / 2, y: H - 8, class: 'tick', 'text-anchor': 'middle'}); t.textContent = i % 2 ? '' : d.month; g.append(t);
    if (i === data.length - 1) { const v = svg('text', {x: x + w / 2, y: y - 6, class: 'value', 'text-anchor': 'middle'}); v.textContent = format(d.value); g.append(v); }
    const hit = svg('rect', {x: L + band * i, y: T, width: band, height: plotH, class: 'hit'});
    g.append(hit);
    const show = () => {
      bars.forEach(b => b.classList.toggle('dim', b !== g));
      tip.replaceChildren(el('span', '', d.month), el('b', '', format(d.value)));
      tip.hidden = false;
      tip.style.left = `${(x + w / 2) / W * 100}%`; tip.style.top = `${y / H * 100}%`;
    };
    hit.addEventListener('mouseenter', show);
    hit.addEventListener('mouseleave', () => { bars.forEach(b => b.classList.remove('dim')); tip.hidden = true; });
    root.append(g);
    return g;
  });
  fig.append(root, tip);
  const details = el('details', 'chart-table'), table = el('table'), head = el('tr');
  details.append(el('summary', '', 'Ver como tabla'));
  head.append(el('th', '', 'Mes'), el('th', '', label));
  table.append(head);
  for (const d of data) { const tr = el('tr'); tr.append(el('td', '', d.month), el('td', '', format(d.value))); table.append(tr); }
  details.append(table);
  fig.append(details);
  return fig;
}

// Barras horizontales rotuladas: nombre, barra y valor; el texto lleva el dato, la barra la proporción.
export function hbars(data, {format = number, total} = {}) {
  const max = Math.max(...data.map(d => d.value)), sum = total ?? data.reduce((s, d) => s + d.value, 0);
  const list = el('div', 'hbars');
  for (const d of data) {
    const row = el('div', 'hbar'), track = el('div', 'hbar-track'), fill = el('div', 'hbar-fill');
    fill.style.width = `${Math.max(1.5, d.value / max * 100)}%`;
    track.append(fill);
    row.title = `${d.name}: ${format(d.value)} (${Math.round(d.value / sum * 100)}%)`;
    row.append(el('span', 'hbar-name', d.name), track, el('span', 'hbar-value', `${format(d.value)} · ${Math.round(d.value / sum * 100)}%`));
    list.append(row);
  }
  return list;
}

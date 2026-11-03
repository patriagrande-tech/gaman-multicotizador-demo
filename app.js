const form = document.querySelector('#form');
const results = document.querySelector('#results');
const offers = document.querySelector('#offers');
const sample = [
  {company: 'Compañía de ejemplo A', plan: 'Responsabilidad civil', price: '$ 38.500', items: ['Cobertura básica de ejemplo', 'Condiciones a definir', 'Asistencia a consultar']},
  {company: 'Compañía de ejemplo B', plan: 'Terceros completo', price: '$ 64.900', items: ['Robo e incendio de ejemplo', 'Cristales a consultar', 'Condiciones a definir']},
  {company: 'Compañía de ejemplo C', plan: 'Todo riesgo', price: '$ 98.700', items: ['Daños propios de ejemplo', 'Franquicia a consultar', 'Condiciones a definir']}
];
function element(tag, className, value) { const el = document.createElement(tag); if (className) el.className = className; if (value) el.textContent = value; return el; }
form.addEventListener('submit', e => {
  e.preventDefault(); if (!form.reportValidity()) return;
  const data = new FormData(form);
  document.querySelector('#risk-summary').textContent = `${data.get('marca')} ${data.get('modelo')} · ${data.get('anio')} · ${data.get('localidad')}`;
  offers.replaceChildren();
  for (const item of sample) {
    const card = element('article', 'offer');
    card.append(element('div', 'company', item.company), element('h3', '', item.plan));
    const price = element('div', 'price', item.price); price.append(element('span', 'period', ' / mes · ficticio')); card.append(price);
    const list = element('ul'); for (const line of item.items) list.append(element('li', '', `✓  ${line}`)); card.append(list); offers.append(card);
  }
  results.hidden = false; results.scrollIntoView({behavior:'smooth', block:'start'});
});
document.querySelector('#copy-feedback').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText('Ideas para el multicotizador Gaman: comparar coberturas y franquicias; guardar y compartir propuestas; sumar compañías y otros riesgos.'); status.textContent = 'Ideas copiadas. Podés pegarlas y compartirlas.'; }
  catch (_) { status.textContent = 'Podés copiar las ideas seleccionando el texto de esta sección.'; }
});

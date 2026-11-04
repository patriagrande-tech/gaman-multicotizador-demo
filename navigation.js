// Perfil de la demo, menús por perfil y secciones dedicadas por ancla (#history, #import…).
(() => {
  const PROFILES = {
    productor: {initials: 'PD', name: 'Productor demo', detail: 'Productor asesor · PAS', home: 'cotizador.html'},
    organizador: {initials: 'OR', name: 'Organización Rosario', detail: 'Organizador', home: 'red.html'},
    gaman: {initials: 'GG', name: 'Equipo Gaman', detail: 'Comercial y operaciones', home: 'red.html'},
  };
  const page = location.pathname.split('/').pop() || 'index.html';
  let role = null;
  try { role = new URLSearchParams(location.search).get('perfil') || localStorage.getItem('gaman-demo-role'); } catch (_) {}
  if (!PROFILES[role]) role = page === 'red.html' || page === 'productor.html' ? 'gaman' : 'productor';
  try { localStorage.setItem('gaman-demo-role', role); } catch (_) {}
  document.documentElement.dataset.role = role;

  for (const node of document.querySelectorAll('[data-roles]')) {
    const roles = node.dataset.roles.split(' ');
    node.hidden = !roles.includes('all') && !roles.includes(role);
  }
  const profile = PROFILES[role], chip = document.querySelector('.user-chip');
  if (chip) {
    chip.querySelector('i').textContent = profile.initials;
    chip.querySelector('b').textContent = profile.name;
    chip.querySelector('small').textContent = `${profile.detail} · cambiar`;
  }
  const brand = document.querySelector('header .brand');
  if (brand) { const url = new URL(brand.href, location.href); url.pathname = url.pathname.replace(/[^/]*$/, profile.home); brand.href = url.href; }

  const ROUTES = {
    'cotizador.html': {history: 'Historial de cotizaciones', ideas: 'Próximas funcionalidades'},
    'cartera.html': {import: 'Importar planillas', tasks: 'Tareas y vencimientos'},
    'red.html': {productores: 'Productores', derivaciones: 'Derivaciones a unidades'},
  };
  const routes = ROUTES[page] || {};
  const alias = {'productor.html': 'red.html#productores', 'cliente.html': role === 'productor' ? 'cartera.html' : 'red.html#productores'};
  const main = document.querySelector('main');
  if (!main) return;
  const title = document.createElement('div');
  title.className = 'route-heading'; title.hidden = true;
  main.prepend(title);
  const children = [...main.children].filter(n => n !== title);
  const routeIds = Object.keys(routes).map(id => '#' + id).join(', ');

  function render() {
    const hash = location.hash.slice(1), route = routes[hash];
    const current = route ? `${page}#${hash}` : alias[page] || page;
    document.querySelectorAll('.nav').forEach(link => {
      const target = new URL(link.href, location.href);
      const active = (target.pathname.split('/').pop() + target.hash) === current;
      link.classList.toggle('selected', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    title.hidden = !route;
    title.textContent = route || '';
    for (const child of children) {
      const show = route ? child.matches(`#${hash}, .demo-banner, footer, #message`) : !(routeIds && child.matches(routeIds));
      child.toggleAttribute('data-route-hidden', !show);
    }
    if (route) window.scrollTo({top: 0, behavior: 'instant'});
  }
  window.addEventListener('hashchange', render);
  render();
})();

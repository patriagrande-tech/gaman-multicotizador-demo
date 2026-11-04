(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  const main = document.querySelector('main');
  const routes = page === 'index.html'
    ? {history: ['#history'], ideas: ['#ideas']}
    : page === 'cartera.html' ? {import: ['#import'], tasks: ['#tasks']} : {};
  const title = document.createElement('div');
  title.className = 'route-heading'; title.hidden = true;
  const headings = {history: 'Historial de cotizaciones', ideas: 'Próximas funcionalidades', import: 'Importar planillas', tasks: 'Tareas y vencimientos'};
  main.prepend(title);
  const children = [...main.children].filter(n => n !== title);
  function render() {
    const hash = location.hash.slice(1);
    const current = routes[hash] ? `${page}#${hash}` : page;
    document.querySelectorAll('.nav').forEach(link => {
      const target = new URL(link.href, location.href);
      const active = (target.pathname.split('/').pop() + target.hash) === current;
      link.classList.toggle('selected', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    const route = routes[hash];
    title.hidden = !route;
    title.textContent = route ? headings[hash] : '';
    for (const child of children) {
      let show = true;
      if (route) show = route.some(selector => child.matches(selector)) || child.matches('.demo-banner, footer, #message');
      else if (page === 'index.html') show = !child.matches('#history, #ideas');
      else if (page === 'cartera.html') show = !child.matches('#import, #tasks');
      child.toggleAttribute('data-route-hidden', !show);
    }
    if (route) window.scrollTo({top: 0, behavior: 'instant'});
  }
  window.addEventListener('hashchange', render);
  render();
})();

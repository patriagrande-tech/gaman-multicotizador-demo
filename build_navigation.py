"""Genera encabezado, menús y recursos comunes: ejecutar al agregar una página o cambiar menús."""
from pathlib import Path
import re
import hashlib
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent
HOME = 'index.html'
SHELL_PAGES = ('cotizador.html', 'cartera.html', 'red.html', 'productor.html', 'cliente.html', 'plataforma.html')
PAGES = (HOME,) + SHELL_PAGES
RELEASE = '20261105-03'

# Wordmark de Grupo Gaman redibujado: arco con muesca sobre "GRUPO".
LOGO = ('<svg viewBox="0 0 206 44" role="img" aria-label="Grupo Gaman">'
        '<path d="M2 12C30 5 70 4 100 10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'
        '<path d="M47 6.4 52 12.5 57 6.2Z" fill="currentColor"/>'
        '<text x="0" y="40" fill="currentColor" font-family="Lexend Deca, Inter, sans-serif" font-size="26" '
        'font-weight="500" letter-spacing=".4">GRUPO GAMAN</text></svg>')

ICONS = {
    'cotizador.html': '<path d="M5 3h14v18H5z"/><path d="M8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2M8 19h2M12 19h2"/>',
    'cartera.html': '<path d="M3 7h18v13H3z"/><path d="M8 7V4h8v3M3 12h18"/>',
    'cotizador.html#history': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'cartera.html#import': '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v6h16v-6"/>',
    'cartera.html#tasks': '<path d="M4 4h16v16H4z"/><path d="m8 12 3 3 5-6"/>',
    'red.html': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    'red.html#productores': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.5 3.5 5.2"/>',
    'red.html#derivaciones': '<path d="M4 12h12M12 6l6 6-6 6"/><path d="M20 4v16"/>',
    'plataforma.html': '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    'cotizador.html#ideas': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
}

# (destino, etiqueta, perfiles). Los grupos usan destino None. navigation.js oculta lo que no corresponde al perfil.
NAV = (
    (None, 'Mi oficina', 'productor'),
    ('cotizador.html', 'Cotizador', 'productor'),
    ('cartera.html', 'Mi cartera', 'productor'),
    ('cotizador.html#history', 'Historial de cotizaciones', 'productor'),
    ('cartera.html#import', 'Importar planillas', 'productor'),
    ('cartera.html#tasks', 'Tareas y vencimientos', 'productor'),
    (None, 'Red Gaman', 'organizador gaman'),
    ('red.html', 'Panel de red', 'organizador gaman'),
    ('red.html#productores', 'Productores', 'organizador gaman'),
    ('red.html#derivaciones', 'Derivaciones a unidades', 'organizador gaman'),
    (None, 'Proyecto', 'all'),
    ('plataforma.html', 'Proyecto integral', 'all'),
    ('cotizador.html#ideas', 'Próximas funcionalidades', 'all'),
)
LINKS = tuple((target, label) for target, label, _ in NAV if target)
# Páginas de detalle que resaltan una sección del menú.
ACTIVE = {'productor.html': 'red.html#productores'}


def nav_href(target):
    url = urlsplit(target)
    query = '&'.join([q for q in url.query.split('&') if q and not q.startswith('release=')] + ['release=' + RELEASE])
    return urlunsplit(('', '', url.path, query, url.fragment))


def links(page):
    current = ACTIVE.get(page, page)
    out = []
    for target, label, roles in NAV:
        if not target:
            out.append(f'<p class="aside-label nav-group" data-roles="{roles}">{label}</p>')
            continue
        on = target == current
        out.append(f'<a class="nav{" selected" if on else ""}" href="{nav_href(target)}" data-roles="{roles}"'
                   + (' aria-current="page"' if on else '')
                   + f'><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[target]}</svg>{label}</a>')
    return ''.join(out)


HEADER = ('<header><a class="brand" href="index.html" aria-label="Grupo Gaman, inicio">' + LOGO
          + '<span class="brand-product">Portal de productores</span></a>'
          + '<span class="head-tag">Propuesta conceptual · datos ficticios</span>'
          + '<a class="user-chip" href="index.html" title="Cambiar perfil"><i>PD</i><span><b>Productor demo</b>'
          + '<small>Cambiar perfil</small></span></a></header>')


def build():
    for page in PAGES:
        p = ROOT / page
        text = p.read_text(encoding='utf-8')
        if page in SHELL_PAGES:
            text = re.sub(r'<header>.*?</header>', HEADER, text, count=1, flags=re.S)
            sidebar = (f'<aside><nav aria-label="Navegación principal">{links(page)}</nav>'
                       '<div class="aside-note"><b>Una propuesta para construir juntos.</b>'
                       '<p>Cotización, cartera y red en un mismo portal.</p></div></aside>')
            text = re.sub(r'<aside>.*?</aside>', sidebar, text, count=1, flags=re.S)
            text = re.sub(r'<nav class="mobile-navigation".*?</nav>', '', text, flags=re.S)
            text = text.replace('</header>', f'</header><nav class="mobile-navigation" aria-label="Navegación móvil">{links(page)}</nav>', 1)
        text = re.sub(r'<div class="logo-slot">.*?</div>', '<div class="logo-slot">' + LOGO + '</div>', text, flags=re.S)
        # Un único stylesheet y el script de navegación en todas las pantallas.
        text = re.sub(r'<link rel="stylesheet" href="[^"]+">', '', text)
        text = re.sub(r'<script src="navigation\.js[^"]*" defer></script>', '', text)
        text = text.replace('</head>', '<link rel="stylesheet" href="styles.css"><script src="navigation.js" defer></script></head>', 1)

        # Evitar recuperar otra página de una publicación anterior al navegar.
        def version_page(match):
            target = urlsplit(match.group(1))
            if target.path in PAGES and not target.scheme and not target.netloc:
                return 'href="' + nav_href(match.group(1)) + '"'
            return match.group(0)
        text = re.sub(r'href="([^"]+)"', version_page, text)

        # Las hojas y scripts locales usan su contenido como versión de caché.
        def version_asset(match):
            attr, target = match.groups()
            asset = urlsplit(target)
            path = ROOT / asset.path
            if asset.path.endswith(('.css', '.js')) and path.is_file() and not asset.scheme:
                digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
                return f'{attr}="{asset.path}?v={digest}"'
            return match.group(0)
        text = re.sub(r'(href|src)="([^"]+)"', version_asset, text)
        p.write_text(text, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    build()

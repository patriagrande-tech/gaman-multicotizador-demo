"""Genera navegación estática común: ejecutar al agregar una página o cambiar menús."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
PAGES = ('index.html', 'cartera.html', 'plataforma.html')
LINKS = (
    ('index.html', 'Cotizador'),
    ('cartera.html', 'Administrador de cartera'),
    ('plataforma.html', 'Proyecto integral'),
    ('index.html#history', 'Historial de cotizaciones'),
    ('cartera.html#import', 'Importar planillas'),
    ('cartera.html#tasks', 'Tareas y vencimientos'),
    ('index.html#ideas', 'Próximas funcionalidades'),
)


def links(page):
    return ''.join(
        f'<a class="nav{" selected" if target == page else ""}" href="{target}"'
        + (' aria-current="page"' if target == page else '')
        + f'>{label}</a>' + ('<p class="aside-label nav-group">GESTIONES Y SEGUIMIENTO</p>' if target == 'plataforma.html' else '') for target, label in LINKS
    )


def build():
    for page in PAGES:
        p = ROOT / page
        text = p.read_text(encoding='utf-8')
        header = '<header><a class="brand" href="index.html" aria-label="Gaman, ir al cotizador"><span class="brand-icon" aria-hidden="true"></span><span><small>GRUPO</small><b>GAMAN</b></span></a><span class="head-tag">PROPUESTA CONCEPTUAL · DATOS FICTICIOS</span><a class="head-link" href="plataforma.html">Ver proyecto integral ↗</a></header>'
        text = re.sub(r'<header>.*?</header>', header, text, count=1, flags=re.S)
        sidebar = f'<aside><nav aria-label="Navegación principal"><p class="aside-label">ESPACIO DE TRABAJO</p>{links(page)}</nav><div class="aside-note"><b>Una propuesta para construir juntos.</b><p>Explorá cotización, cartera y próximas funcionalidades.</p></div></aside>'
        text = re.sub(r'<aside>.*?</aside>', sidebar, text, count=1, flags=re.S)
        text = re.sub(r'<nav class="mobile-navigation".*?</nav>', '', text, flags=re.S)
        text = text.replace('</header>', f'</header><nav class="mobile-navigation" aria-label="Navegación móvil">{links(page)}</nav>', 1)
        text = re.sub(r'<link rel="stylesheet" href="navigation.css[^" ]*">', '', text)
        text = text.replace('</head>', '<link rel="stylesheet" href="navigation.css?v=9"></head>', 1)
        text = re.sub(r'<script src="navigation.js[^" ]*" defer></script>', '', text)
        text = text.replace('</head>', '<script src="navigation.js?v=9" defer></script></head>', 1)
        text = re.sub(r'<link rel="stylesheet" href="layout.css[^" ]*">', '', text)
        text = text.replace('</head>', '<link rel="stylesheet" href="layout.css?v=10"></head>', 1)
        # Misma versión de los estilos compartidos en todas las pantallas.
        text = re.sub(r'(href="(?:styles|features)\.css)\?v=[^" ]+', r'\1?v=8', text)
        text = re.sub(r'(src="(?:app|cartera)\.js)\?v=[^" ]+', r'\1?v=9', text)
        p.write_text(text, encoding='utf-8', newline='\n')


if __name__ == '__main__':
    build()

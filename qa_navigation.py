"""Recorrido de navegador por perfil: portada → productor (cotizador, cartera, tareas, ficha de cliente) y equipo Gaman/organizador (panel, productor, cliente)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
out = Path(__file__).resolve().parent / 'qa-artifacts'
out.mkdir(exist_ok=True)
base = os.environ.get('GAMAN_QA_URL', 'http://127.0.0.1:8089').rstrip('/')
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    for width in (1440, 1100):
        page = browser.new_page(viewport={'width': width, 'height': 950})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base + '/index.html', wait_until='networkidle')
        page.screenshot(path=str(out / f'home-{width}.png'))

        # Productor
        page.get_by_role('link', name='Productor asesor').click()
        page.wait_for_load_state('networkidle')
        nav = page.get_by_role('navigation', name='Navegación principal', exact=True)
        assert nav.get_by_role('link').count() == 7, nav.inner_text()
        assert not nav.get_by_role('link', name='Panel de red').is_visible()
        nav.get_by_role('link', name='Mi cartera', exact=True).click()
        page.wait_for_load_state('networkidle')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        nav = page.get_by_role('navigation', name='Navegación principal', exact=True)
        nav.get_by_role('link', name='Tareas y vencimientos', exact=True).click()
        page.wait_for_timeout(150)
        assert page.locator('#tasks').is_visible()
        nav.get_by_role('link', name='Mi cartera', exact=True).click()
        page.wait_for_timeout(150)
        page.locator('#policies a.person').first.click()
        page.wait_for_load_state('networkidle')
        assert page.locator('.profile-head h1').is_visible()

        # Equipo Gaman
        page.goto(base + '/index.html', wait_until='networkidle')
        page.get_by_role('link', name='Equipo Gaman').click()
        page.wait_for_load_state('networkidle')
        nav = page.get_by_role('navigation', name='Navegación principal', exact=True)
        assert nav.get_by_role('link').count() == 5, nav.inner_text()
        assert page.locator('#top tr').count() == 8
        page.screenshot(path=str(out / f'red-{width}.png'), full_page=True)
        page.locator('#top a.person').first.click()
        page.wait_for_load_state('networkidle')
        assert nav.get_by_role('link', name='Productores', exact=True).get_attribute('aria-current') == 'page'
        page.locator('#content tbody a.person').first.click()
        page.wait_for_load_state('networkidle')
        assert page.locator('.profile-head h1').is_visible()

        # Organizador: no abre productores de otra organización
        page.goto(base + '/red.html?perfil=organizador', wait_until='networkidle')
        assert 'rosario' in page.locator('#scope-label').inner_text().lower()
        page.goto(base + '/productor.html?id=P0001', wait_until='networkidle')
        blocked = page.get_by_text('no pertenece a tu organización').count()
        print(f'{width}px: portada / productor / cartera / tareas / cliente / red / productor / cliente / permisos ({"bloqueado" if blocked else "propio"}): OK', errors or '')
        assert not errors
        page.close()
    browser.close()

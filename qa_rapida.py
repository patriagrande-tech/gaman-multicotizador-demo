"""Recorrido de la cotización rápida: patente + CP en un mensaje, confirmación, cotización, WhatsApp y comparación completa."""
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
    for width, height in ((1440, 950), (390, 844)):
        ctx = browser.new_context(viewport={'width': width, 'height': height})
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base + '/rapida.html?perfil=productor', wait_until='networkidle')
        log = page.locator('#chat-log')
        page.fill('#chat-input', 'ab123cd 2000 para Juan Pérez')
        page.keyboard.press('Enter')
        page.get_by_role('button', name='Sí, es ese').click()
        page.get_by_text('Rosario, Santa Fe ✓').wait_for()
        assert 'Juan Pérez' in log.inner_text()
        page.get_by_role('button', name='Es uso comercial').click()
        page.get_by_text('uso comercial', exact=False).last.wait_for()
        page.get_by_role('button', name='Cotizar').click()
        page.locator('.quick-offer').nth(3).wait_for(timeout=5000)
        assert page.locator('.quick-offer').count() == 4
        page.screenshot(path=str(out / f'rapida-{width}.png'))
        page.get_by_role('button', name='Enviar al cliente por WhatsApp').click()
        page.fill('.wa-form input[inputmode=tel]', '341 555 1234')
        href = page.locator('a.btn.wa').get_attribute('href')
        assert href.startswith('https://wa.me/5493415551234?text=') and 'Juan' in href, href
        with ctx.expect_page() as popup:
            page.locator('a.btn.wa').click()
        popup.value.close()
        page.get_by_text('Propuesta preparada').wait_for()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
        page.screenshot(path=str(out / f'rapida-wa-{width}.png'))
        page.get_by_role('link', name='Ver comparación completa').last.click()
        page.wait_for_load_state('networkidle')
        page.locator('#offers .offer, #offers article').first.wait_for(timeout=5000)
        assert 'Comercial' in page.locator('#risk-summary').inner_text() or page.locator('[name=uso][value=Comercial]').is_checked()
        hist = page.evaluate("JSON.parse(localStorage.getItem('gaman-demo-history-v1'))[0]")
        assert hist['status'] == 'Propuesta preparada' and hist['data']['cliente'] == 'Juan Pérez', hist['status']
        print(f'{width}px: patente+CP / versión / uso / cotizar (4 coberturas) / WhatsApp / historial / comparación completa: OK', errors or '')
        assert not errors
        ctx.close()
    browser.close()

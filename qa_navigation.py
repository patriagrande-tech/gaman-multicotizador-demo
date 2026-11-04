from pathlib import Path
from playwright.sync_api import sync_playwright
import os

out=Path(__file__).resolve().parent/'qa-artifacts';out.mkdir(exist_ok=True)
base=os.environ.get('GAMAN_QA_URL','http://127.0.0.1:8089').rstrip('/')
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 for width in (1440,1100):
  page=browser.new_page(viewport={'width':width,'height':950})
  page.goto(base+'/index.html',wait_until='networkidle')
  nav=page.get_by_role('navigation',name='Navegación principal',exact=True)
  before=nav.inner_text()
  nav.get_by_role('link',name='Administrador de cartera',exact=True).click()
  page.wait_for_load_state('networkidle')
  nav=page.get_by_role('navigation',name='Navegación principal',exact=True)
  assert nav.get_by_text('GESTIONES Y SEGUIMIENTO',exact=True).is_visible()
  assert nav.inner_text()==before
  assert nav.get_by_role('link').count()==7
  assert nav.get_by_role('link',name='Administrador de cartera',exact=True).get_attribute('aria-current')=='page'
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  page.screenshot(path=str(out/f'cartera-menu-{width}.png'))
  nav.get_by_role('link',name='Tareas y vencimientos',exact=True).click()
  page.wait_for_timeout(150)
  assert nav.get_by_text('GESTIONES Y SEGUIMIENTO',exact=True).is_visible()
  assert page.locator('#tasks').is_visible()
  nav.get_by_role('link',name='Cotizador',exact=True).click()
  page.wait_for_load_state('networkidle')
  assert page.get_by_role('navigation',name='Navegación principal',exact=True).inner_text()==before
  print(f'{width}px: cotizador / cartera / tareas / cotizador: OK')
  page.close()
 browser.close()

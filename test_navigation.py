from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import unittest
from build_navigation import ROOT, PAGES, SHELL_PAGES, LINKS, NAV, ACTIVE, build, nav_href


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.menus = {}
        self.current_menu = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.add(a['id'])
        if tag == 'nav':
            self.current_menu = a.get('aria-label')
            self.menus[self.current_menu] = []
        if tag == 'a' and a.get('href'):
            self.links.append(a)
            if self.current_menu:
                self.menus[self.current_menu].append(a)

    def handle_endtag(self, tag):
        if tag == 'nav':
            self.current_menu = None


class NavigationTests(unittest.TestCase):
    def test_shell_pages_offer_same_destinations_on_desktop_and_mobile(self):
        targets = [t for t, _ in LINKS]
        for page in SHELL_PAGES:
            doc = Document((ROOT / page).read_text(encoding='utf-8'))
            current = ACTIVE.get(page, page)
            for menu in ('Navegación principal', 'Navegación móvil'):
                with self.subTest(page=page, menu=menu):
                    self.assertEqual([a['href'] for a in doc.menus[menu]], [nav_href(t) for t in targets])
                    expected = [nav_href(current)] if current in targets else []
                    self.assertEqual([a['href'] for a in doc.menus[menu] if a.get('aria-current') == 'page'], expected)

    def test_every_link_declares_profiles(self):
        doc = Document((ROOT / 'cartera.html').read_text(encoding='utf-8'))
        roles = [a.get('data-roles') for a in doc.menus['Navegación principal']]
        self.assertEqual(roles, [r for t, _, r in NAV if t])
        self.assertTrue(all(r for r in roles))

    def test_internal_destinations_and_anchors_exist(self):
        for page in PAGES:
            doc = Document((ROOT / page).read_text(encoding='utf-8'))
            for link in doc.links:
                target = urlsplit(link['href'])
                if target.scheme or target.netloc:
                    continue
                path = ROOT / (target.path or page)
                with self.subTest(page=page, target=link['href']):
                    self.assertTrue(path.is_file())
                    if target.fragment:
                        self.assertIn(target.fragment, Document(path.read_text(encoding='utf-8')).ids)

    def test_generation_is_repeatable(self):
        before = {p: (ROOT / p).read_bytes() for p in PAGES}
        build()
        self.assertEqual(before, {p: (ROOT / p).read_bytes() for p in PAGES})


if __name__ == '__main__':
    unittest.main()

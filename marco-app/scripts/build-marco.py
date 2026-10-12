"""Arma Marco app a partir del visor (fachada-la-carreta/fachada-carreta-3d.html) y los archivos de src/.

Uso:
  build-marco.py                      -> marco-app/index.html (instalable) y marco-app/marco-app-compartir.html (un solo archivo)
  build-marco.py --artifact salida    -> variante para claude.ai (sin doctype/html/head/body ni instalacion)
"""
import os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(os.path.dirname(RAIZ), 'fachada-la-carreta', 'fachada-carreta-3d.html')
leer = lambda p: open(p, encoding='utf-8').read()

def inyectar(base, pwa):
    s = base
    def rep(a, b):
        nonlocal s
        assert s.count(a) == 1, a[:70]
        s = s.replace(a, b)
    rep('<title>Fachada La Carreta</title>', '<title>Marco app</title>')
    rep('<h1>La Carreta · Fachada de tubo con puertas corredizas</h1>', '<h1 id="ttl">Marco app</h1>')
    rep('<button id="bToggle">Abrir</button>', '<button id="bToggle">Abrir</button>\n      <button id="bProj">Proyectos</button>')
    rep('<button id="bNight" aria-pressed="true">Noche</button>', '<button id="bNight" aria-pressed="true">Noche</button>\n      <button id="bCliente" type="button">Cliente</button>')
    rep('</style>\n</head>', leer(os.path.join(RAIZ, 'src', 'marco.css')) + '</style>\n</head>')
    rep('<section id="photo"', leer(os.path.join(RAIZ, 'src', 'marco.html')) + '\n<section id="photo"')
    extra = '<script>window.__MARCO_PWA = ' + ('true' if pwa else 'false') + ';</script>\n<script>\n' + leer(os.path.join(RAIZ, 'src', 'marco.js')) + '</script>\n</body>'
    rep('</body>', extra)
    if pwa:
        rep('<title>Marco app</title>', '<title>Marco app</title>\n<meta name="theme-color" content="#17120D">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Marco app">')
    return s

def para_artifact(s):
    s = re.sub(r'^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*', '', s)
    s = re.sub(r'<meta charset="utf-8">\s*', '', s, count=1)
    s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s, count=1)
    s = s.replace('</head>\n<body>', '').replace('</body>\n</html>', '')
    s = s.replace("    box-sizing: border-box;\n    padding-top: env(safe-area-inset-top, 0px);\n    padding-bottom: env(safe-area-inset-bottom, 0px);\n", '')
    assert '<html' not in s and '<body' not in s
    return s

base = leer(BASE)
if len(sys.argv) > 2 and sys.argv[1] == '--artifact':
    open(sys.argv[2], 'w', encoding='utf-8').write(para_artifact(inyectar(base, False)))
    print('artifact listo')
else:
    open(os.path.join(RAIZ, 'index.html'), 'w', encoding='utf-8').write(inyectar(base, True))
    open(os.path.join(RAIZ, 'marco-app-compartir.html'), 'w', encoding='utf-8').write(inyectar(base, False))
    print('index.html y marco-app-compartir.html listos')

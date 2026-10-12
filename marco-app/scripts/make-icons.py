"""Genera los iconos de Marco app (un marco dorado con barras de reja). Uso: make-icons.py carpeta_salida"""
import sys
from PIL import Image, ImageDraw

BG, GOLD, BAR = (23, 18, 13), (227, 154, 74), (237, 227, 211)

def icon(size, maskable):
    S = size * 4                       # dibuja grande y reduce para suavizar
    im = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(im)
    pad = S * (0.22 if maskable else 0.12)
    x0, y0, x1, y1 = pad, pad, S - pad, S - pad
    t = S * 0.045
    d.rounded_rectangle([x0, y0, x1, y1], radius=S * 0.05, outline=GOLD, width=int(t))
    n = 7
    inner0, inner1 = x0 + t * 1.8, x1 - t * 1.8
    step = (inner1 - inner0) / (n - 1)
    for i in range(n):
        x = inner0 + i * step
        d.rectangle([x - S * 0.012, y0 + t * 1.8, x + S * 0.012, y1 - t * 1.8], fill=BAR)
    mid = (y0 + y1) / 2
    d.rectangle([x0 + t * 1.2, mid - S * 0.008, x1 - t * 1.2, mid + S * 0.008], fill=BAR)
    return im.resize((size, size), Image.LANCZOS)

out = sys.argv[1]
icon(192, False).save(out + '/icon-192.png')
icon(512, False).save(out + '/icon-512.png')
icon(512, True).save(out + '/icon-512-maskable.png')
print('iconos listos')

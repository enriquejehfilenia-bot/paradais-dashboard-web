"""Genera la variante para claude.ai (sin doctype/html/head/body) a partir del visor. Uso: build-artifact.py origen salida"""
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
s = re.sub(r'^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*', '', s)
s = re.sub(r'<meta charset="utf-8">\s*', '', s, count=1)
s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s, count=1)
s = s.replace('</head>\n<body>', '').replace('</body>\n</html>', '')
s = s.replace("    box-sizing: border-box;\n    padding-top: env(safe-area-inset-top, 0px);\n    padding-bottom: env(safe-area-inset-bottom, 0px);\n", "")
assert '<html' not in s and '<body' not in s
open(sys.argv[2], 'w', encoding='utf-8').write(s)

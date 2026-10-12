# Marco app

App instalable (PWA) para fachadas de reja de tubo: visor 3D, lista de materiales, proyectos guardados y modo cliente. Nace del visor de `../fachada-la-carreta/`.

## Archivos
- `index.html`, `manifest.webmanifest`, `sw.js`, `icon-*.png`: la app instalable. Hay que servirla por **https** (Vercel, Netlify, GitHub Pages...) para poder instalarla y usarla sin internet.
- `marco-app-compartir.html`: la misma app en un solo archivo, se abre con doble clic o por WhatsApp (sin instalar). Los proyectos se guardan en ese navegador.
- `src/`: código propio de Marco app (proyectos, modo cliente, instalar). `scripts/`: construir, íconos y prueba.

## Qué hace
- **Proyectos:** varias cotizaciones guardadas en el dispositivo (nuevo, abrir, nombre y cliente, duplicar, eliminar con confirmación). Se guarda solo al calcular.
- **Exportar / Importar:** archivo `.json` para pasar proyectos a otro dispositivo (el contenido importado se valida y se limita).
- **Modo cliente:** solo el 3D, sin materiales ni proyectos. No es seguridad: cualquiera puede salir del modo.
- **Instalable y sin internet:** se instala como app y abre sin conexión.
- Todo lo del visor: medidas con botón Calcular, lista de materiales (sin precios por ahora), Excel y PDF.

## Reconstruir
```
python3 scripts/make-icons.py .          # íconos
python3 scripts/build-marco.py           # genera index.html y marco-app-compartir.html desde el visor
python3 -m http.server 8765 &            # y en otra terminal:
node scripts/probar.mjs http://127.0.0.1:8765/ carpeta_capturas
```
`index.html` y `marco-app-compartir.html` son generados: se cambia el visor o `src/` y se vuelve a construir.

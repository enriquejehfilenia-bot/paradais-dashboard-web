---
name: fachada-reja-tubo
description: Reglas y datos del proyecto "La Carreta": fachada de reja de tubo cuadrado cerrada por los 4 lados con puertas corredizas, visor 3D (three.js) y lista de materiales. Usar al modificar el visor `fachada-la-carreta/fachada-carreta-3d.html`, recalcular materiales, exportar Excel/PDF, publicar la página o responder dudas de obra (separación de tubos, seguridad, herrajes).
---

# Fachada La Carreta: reja de tubo cuadrado

Carpeta de trabajo: `fachada-la-carreta/`. Un solo archivo HTML sin servidor, con three.js inline. Lee `fachada-la-carreta/README.md` y `BRIEF.md` antes de cambiar nada.

## Decisiones vigentes del cliente (no revertir sin que lo pida)
- Estructura de 8 × 8 m, alto de reja 3 m, cerrada por los 4 lados. Cada lado tiene 3 pilares y 2 tramos de 4 m.
- Pilares del frente y el pilar del medio de la pared trasera: madera de 45 cm con peldaños. Pilares de costados y esquinas de atrás: metal de 12 cm.
- Dos puertas corredizas en el frente (una por tramo), cada una de 2 hojas que se esconden detrás de los fijos y se juntan al centro. Costados y pared trasera fijos.
- Televisores en el pilar del medio del frente y en el de la pared trasera.
- Tubo cuadrado 20 × 20 × 1,5 mm. Separación mínima entre tubos 12 cm, con la menor cantidad de tubos que la cumple (opción de menor costo).
- La lista de materiales va **sin precios** (`SHOW_PRICES = false`). El tubo cuesta $7,50 la barra de 6 m, dato del cliente. No inventar los demás precios.
- Sin mesas ni sillas en el 3D. Sin montaje sobre la foto real salvo que lo pidan explícitamente.

## Vocabulario (el cliente lo corrigió)
- Decir **lado** y **tramo**, no "vano". "Fondo" es la profundidad (los costados); la pared de atrás es la **pared trasera**.
- Español de Ecuador, coma decimal.

## Cómo calcula la lista (`computeBom` y `makePanel`)
- Tubos verticales por panel: `k = floor((w + sep) / (t + sep))`. Cada tubo vertical se corta en 2 segmentos de media altura. Cada panel lleva 3 travesaños (abajo, medio, arriba).
- Barras de 6 m con 3 mm de corte, acomodo por orden de largo.
- Platinas: por panel `4 + 2 × (ceil(w / 1,5) − 1)`, más 8 por cada tramo con puerta (riel). Pernos: 2 por platina.
- Pintura anticorrosiva 30 m² por galón, esmalte 2 manos. Electrodos 6011 3/32″: estimación por uniones soldadas. Mano de obra siempre "1 global".
- Reja del frente: 4 m − 0,45 m = 3,55 m entre pilares de madera. Los 4 m son de centro a centro (supuesto sin confirmar en obra).
- Las medidas se aplican al pulsar **Calcular** (o Enter), no al escribir.

## Seguridad (criterio dado al cliente)
- 12 cm de separación bloquea a un adulto y casi a todo adolescente. 10 cm bloquea también a niños; cuesta unas 13 barras más.
- La separación sola no basta. Soldar travesaños por la cara interior, cerrar el hueco reja-techo, evitar que levanten la puerta corrediza del riel (guía profunda con topes anti-levante, pasador de piso, candado) y preferir pared de 2 mm.

## Flujo de trabajo
1. Editar solo `fachada-la-carreta/fachada-carreta-3d.html`. Comprobar sintaxis del último `<script>` con `new Function(...)`.
2. Revisión: `node scripts/check.mjs <html> <carpeta_salida>` (celular 390 px y escritorio, sin errores de consola ni desborde horizontal).
3. Exportar: `node scripts/export-proforma.mjs <html> <carpeta>` genera `lista-materiales-fachada-la-carreta.xlsx` y `.pdf`.
4. Variante para claude.ai: `python3 scripts/build-artifact.py <html> <salida.html>` y publicar con la herramienta Artifact. Declarar solo `downloads`. En claude.ai no funcionan `window.print()` ni descargas directas.
5. Archivo para compartir: copia del mismo HTML, funciona sin internet.
6. Commit y push a la rama del PR, y regenerar Excel/PDF si cambian las cantidades.

## Trampas ya encontradas
- `TH` y `COL` deben estar en el ámbito de todo el script; `computeBom` los usa fuera de `rebuild`.
- No uses `pkill -f render-video` con ese texto dentro del mismo comando: se mata a sí mismo.
- El video por cuadros (`scripts/render-video.mjs`) tarda unos 5 minutos con la captura directa del canvas (`__api.shot`). Está en pausa hasta que el proyecto esté cerrado.
- Antes de cotizar: confirmar si los 4 m son de eje a eje o libres, anchos reales de pilares, y precios de herrajes, pintura, soldadura y mano de obra.

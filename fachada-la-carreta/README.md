# Fachada La Carreta

- `fachada-carreta-3d.html`: visor 3D + proforma en un solo archivo, funciona sin internet.
- `lista-materiales-fachada-la-carreta.xlsx` / `.pdf`: lista de cantidades de material, sin precios por ahora (en `fachada-carreta-3d.html`, `SHOW_PRICES = true` los vuelve a activar; el tubo es de $7,50 la barra).
- Video del recorrido: en pausa hasta definir el proyecto (se regenera con `scripts/render-video.mjs`; el boton Video del visor esta oculto).
- `scripts/`: `check.mjs` (revisión en celular y escritorio), `export-proforma.mjs`, `render-video.mjs`.
- `BRIEF.md`: brief original.

Dentro del visor, las medidas se aplican con el botón **Calcular** (o Enter). La lista de materiales tiene botones **Excel (.xlsx)** y **PDF / Imprimir**.

## Supuestos vigentes (verificar en obra)
- Frente 8 m (3 pilares, 2 tramos de 4 m) y fondo 4 m, cerrado por los 4 lados con reja de tubo. Una puerta corrediza en cada tramo del frente (2 puertas, cada una de 2 hojas que se esconden detras de los fijos y se juntan al centro); costados y fondo fijos.
- Los 4 m entre pilares se miden de centro a centro. Pilares del frente: madera de 45 cm (reja de 3,55 m). Pilares de los costados y del fondo: metal delgado de 12 cm; cada costado tiene 3 pilares (2 tramos).
- Alto de la reja: 3 m.
- Tubo 20 × 20 × 1,5 mm.

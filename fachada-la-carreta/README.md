# Fachada La Carreta

- `fachada-carreta-3d.html`: visor 3D + proforma en un solo archivo, funciona sin internet.
- `lista-materiales-fachada-la-carreta.xlsx` / `.pdf`: lista de cantidades de material, sin precios por ahora (en `fachada-carreta-3d.html`, `SHOW_PRICES = true` los vuelve a activar; el tubo es de $7,50 la barra).
- Video del recorrido: en pausa hasta definir el proyecto (se regenera con `scripts/render-video.mjs`; el boton Video del visor esta oculto).
- `scripts/`: `check.mjs` (revisión en celular y escritorio), `export-proforma.mjs`, `render-video.mjs`.
- `BRIEF.md`: brief original.

Dentro del visor, la lista de materiales tiene botones **Excel (.xlsx)** y **PDF / Imprimir**.

## Supuestos vigentes (verificar en obra)
- Frente 4 m y fondo 4 m, cerrado por los 4 lados con reja de tubo (frente con la puerta corrediza: dos hojas que se esconden detras de los fijos y se juntan al centro; costados y fondo fijos).
- Los 4 m entre columnas se miden de centro a centro; columnas de 45 cm, por lo que cada reja mide 3,55 m entre columnas.
- Alto de la reja: 3 m.
- Tubo 20 × 20 × 1,5 mm.

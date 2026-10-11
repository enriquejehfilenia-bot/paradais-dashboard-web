# Fachada La Carreta

- `fachada-carreta-3d.html`: visor 3D + proforma en un solo archivo, funciona sin internet (se envía por WhatsApp).
- `proforma-fachada-la-carreta.xlsx` / `.pdf`: proforma exportada (solo el tubo trae precio, $7,50 la barra).
- Video del recorrido: en pausa hasta definir el proyecto (se regenera con `scripts/render-video.mjs`; el boton Video del visor esta oculto).
- `scripts/`: `check.mjs` (revisión en celular y escritorio), `export-proforma.mjs`, `render-video.mjs`.
- `BRIEF.md`: brief original.

Dentro del visor, la proforma tiene botones **Excel (.xlsx)** y **PDF / Imprimir** que usan los precios que escribas.

## Supuestos vigentes (verificar en obra)
- Frente 4 m y fondo 4 m: un solo vano al frente (con la puerta corrediza: dos hojas que se esconden detras de los fijos y se juntan al centro) y un vano fijo en el costado derecho.
- Vano de 4 m medido de centro a centro de columna; columnas de 45 cm, por lo que cada reja mide 3,55 m entre columnas.
- Tubo 20 × 20 × 1,5 mm.

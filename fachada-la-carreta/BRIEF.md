# Proyecto: fachada de tubo cuadrado con puertas corredizas, local "La Carreta"

## Objetivo
Un visor 3D interactivo (un solo archivo HTML, sin servidor) y una proforma de materiales para mostrar el trabajo al cliente. El visor debe verse bien en celular, moverse libre con el dedo y poder enviarse por WhatsApp.

## Medidas dadas por el cliente
- Frente: 12,00 m · Alto: 4,00 m · Fondo: 8,00 m.
- Cada vano mide 4,00 m (3 vanos al frente, 2 en el costado).
- Reja de tubo cuadrado negro, separación de 12 cm entre tubos.
- Solo el frente y UN costado (el derecho) llevan reja. No el otro costado ni el fondo.
- Mecanismo corredizo solo en el frente.
- Tubo de 6 m a $7,50 la barra (el cliente cree que es de 20 o 25 mm × 1,5 mm).

## Diseño de cada vano con puertas (4 m)
Cuatro módulos de 1 m: fijo | puerta | puerta | fijo. Al abrir, cada puerta se esconde detrás del fijo de su lado (un plano más atrás, 8 cm). Quedan 2 m libres en el centro.
- Con tubo de 20 mm y separación de 12 cm, un módulo de 1 m lleva exactamente 8 tubos (8 × 20 + 7 × 120 = 1000 mm).
- Con tubo de 25 mm no cuadra exacto: 7 tubos dan 13,75 cm y 8 dan 11,4 cm.
- Cada panel: tubos verticales entre 3 travesaños (abajo, al medio, arriba).
- Para vanos fijos de 4 m: cantidad mínima de tubos que mantiene la separación ≥ 12 cm (29 tubos a 12,2 cm). El cliente eligió la opción de menor costo.
- Al cerrar, los dos tubos del centro quedan juntos (8 cm).

## Herrajes de las puertas
- Riel inferior: varilla lisa de 5/8″ soldada sobre platinas. Guía superior: canal U 80×40×3.
- Ruedas con garganta en V de 80 mm (2 por puerta), rodillos guía de nylon arriba.
- Topes de apertura, pasador de piso, cerradura de gancho con candado y jaladera.

## Visor 3D (lo ya hecho)
Un HTML con three.js r128 y OrbitControls (cargados de jsdelivr; hay una versión con todo inline para enviarla sin internet).
- Escena nocturna parecida a la foto del local: columnas de madera con travesaños tipo escalera, frente de madera con "La Carreta" y la rueda, borde verde oscuro, focos y luces cálidas con resplandor, escalones, mesas y sillas adentro.
- Controles: arrastrar para girar, pellizcar para acercar, dos dedos para mover. Se puede acercar hasta meterse al local.
- Botones: Abrir/Cerrar, Vista (3D, frente, planta, desde adentro), Proforma, Lado, Entorno, Cotas, Noche/Día.
- Panel compacto, translúcido y plegable. El modelo se centra en el espacio libre sobre el panel.
- Se reconstruye al cambiar frente, fondo, alto, ancho de vano, vano con puertas, separación y tubo.

## Proforma (dentro del visor)
- Lista de materiales con cantidades calculadas y precio unitario editable (se guarda en localStorage). Solo el tubo trae precio ($7,50).
- Cuánto tubo se va por parte (frente fijo, puertas, lado) y plan de corte barra por barra (acomodo en barras de 6 m con 3 mm de corte).
- Pintura anticorrosiva y esmalte (30 m² por galón), electrodos 6011 de 3/32″ en libras, platinas y pernos de anclaje, mano de obra.
- Subtotal, IVA (editable, 15 %) y total. Texto listo para copiar y mandar por WhatsApp.
- Con las medidas actuales: 109 barras de 6 m (unos $817,50 de tubo).

## Restricciones del cliente (importante)
- NO generar imágenes "reales" ni montajes sobre la foto. Solo el visor 3D.
- No cambiar lo que ya funciona del 3D sin pedirlo.
- Español de Ecuador, números con coma decimal.
- Los precios que no dio van vacíos. No inventarlos.

## Preguntas abiertas
1. ¿Qué vano del frente lleva las puertas? Se asumió el del centro. ¿O todos?
2. ¿Los 4 m de cada vano son de centro a centro de columna o libres entre columnas?
3. ¿El tubo es de 20 o de 25 mm? ¿Y de qué pared?
4. ¿Hay que reforzar el borde de las puertas (tubo de 25 o 30 mm) para que no vibren a 4 m de alto?
5. Soldadura: antes puso 3 lb; con estas medidas el cálculo sube.
6. IVA vigente y precios de herrajes, pintura y mano de obra.

## Cómo seguir en Claude Code
1. Pon `fachada-carreta-3d.html` en una carpeta nueva.
2. Pega el prompt de abajo.
3. Para el archivo sin internet, inyecta three.min.js y OrbitControls.js dentro del HTML.
4. Para capturas o video del 3D, usa Playwright con Chromium y ffmpeg.

## Prompt para pegar
> Lee `fachada-carreta-3d.html`: es un visor 3D de una fachada de tubo cuadrado con puertas corredizas, más una proforma de materiales. Lee también `brief-claude-code-fachada-la-carreta.md` con las medidas, las decisiones y las restricciones del cliente. No cambies lo que ya funciona. Primero resuelve las preguntas abiertas conmigo. Luego: (1) revisa que el visor funcione en celular, (2) mejora la proforma y expórtala a PDF y Excel, (3) genera un video corto de recorrido del 3D con Playwright y ffmpeg, (4) deja una versión de un solo archivo sin internet.

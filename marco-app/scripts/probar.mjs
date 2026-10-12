// Prueba de punta a punta de Marco app contra un servidor local. Uso: node probar.mjs http://127.0.0.1:8765/ carpeta_capturas
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { writeFileSync, readFileSync } from 'fs';
const url = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, serviceWorkers: 'allow' });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const ok = (c, t) => console.log((c ? 'OK   ' : 'FALLA') + ' ' + t);
await p.goto(url + 'index.html'); await p.waitForTimeout(2000);
ok((await p.textContent('#ttl')) === 'Marco app · La Carreta', 'título con el proyecto: ' + await p.textContent('#ttl'));
await p.tap('#bProj'); await p.waitForTimeout(300);
ok(await p.locator('.pcard').count() === 1, 'lista con 1 proyecto');
await p.screenshot({ path: out + '/m-proyectos.png' });
await p.tap('#bNew'); await p.waitForTimeout(800);
ok((await p.textContent('#ttl')).includes('Proyecto 2'), 'nuevo proyecto abierto: ' + await p.textContent('#ttl'));
ok(await p.isVisible('#sheet'), 'abre la lista de materiales para escribir medidas');
await p.fill('#pFW', '12'); await p.tap('#bCalc'); await p.waitForTimeout(700);
await p.tap('#bCloseSheet'); await p.tap('#bProj'); await p.waitForTimeout(300);
const cards = await p.locator('.pcard .rs').allTextContents();
ok(cards.some(t => t.startsWith('12 × 8 × 3')), 'resumen guardado al calcular: ' + cards.join(' | '));
// renombrar
await p.locator('.pcard.cur button', { hasText: 'Nombre' }).tap();
await p.fill('.pcard input.edit >> nth=0', 'Local Norte'); await p.fill('.pcard input.edit >> nth=1', 'Cliente Prueba');
await p.locator('.pcard button', { hasText: 'Guardar' }).tap(); await p.waitForTimeout(200);
ok((await p.textContent('#ttl')) === 'Marco app · Local Norte', 'renombrado: ' + await p.textContent('#ttl'));
// duplicar
await p.locator('.pcard.cur button', { hasText: 'Duplicar' }).tap(); await p.waitForTimeout(200);
ok(await p.locator('.pcard').count() === 3, 'duplicado: 3 proyectos');
// exportar -> importar
const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('.pcard.cur button', { hasText: 'Exportar' }).tap()]);
const ruta = out + '/export.json'; await dl.saveAs(ruta);
const json = JSON.parse(readFileSync(ruta, 'utf8'));
ok(json.app === 'Marco app' && json.proyectos[0].params.FW === 12, 'exportación válida: ' + dl.suggestedFilename());
await p.setInputFiles('#fImport', ruta); await p.waitForTimeout(400);
ok(await p.locator('.pcard').count() === 4, 'importado: 4 proyectos');
// importar archivo malicioso
writeFileSync(out + '/mal.json', JSON.stringify({ proyectos: [{ name: '<img src=x onerror=alert(1)>', params: { FW: 9999, doors: '"><script>', tube: 'x' } }] }));
await p.setInputFiles('#fImport', out + '/mal.json'); await p.waitForTimeout(400);
const html = await p.innerHTML('#plist');
ok(!html.includes('<img') && await p.locator('.pcard').count() === 5, 'importar con contenido hostil: se muestra como texto y los valores se limitan');
// eliminar con confirmación
const antes = await p.locator('.pcard').count();
await p.locator('.pcard:not(.cur) button.danger').first().tap(); await p.waitForTimeout(150);
ok(await p.locator('.pcard button', { hasText: 'Confirmar' }).count() === 1, 'pide confirmar antes de eliminar');
await p.locator('.pcard button', { hasText: 'Confirmar' }).tap(); await p.waitForTimeout(200);
ok(await p.locator('.pcard').count() === antes - 1, 'eliminado');
await p.screenshot({ path: out + '/m-proyectos2.png' });
await p.tap('#bProjClose');
// persistencia
await p.reload(); await p.waitForTimeout(2000);
ok((await p.textContent('#ttl')).startsWith('Marco app · '), 'tras recargar abre el último proyecto: ' + await p.textContent('#ttl'));
// modo cliente
await p.tap('#bCliente'); await p.waitForTimeout(300);
ok(!(await p.isVisible('#bBom')) && !(await p.isVisible('#bProj')) && await p.isVisible('#salirCli'), 'modo cliente oculta materiales y proyectos');
await p.screenshot({ path: out + '/m-cliente.png' });
await p.tap('#salirCli'); await p.waitForTimeout(200);
ok(await p.isVisible('#bBom'), 'sale del modo cliente');
// instalable y sin conexión
const man = await (await ctx.request.get(url + 'manifest.webmanifest')).json();
ok(man.name === 'Marco app' && man.icons.length === 3, 'manifiesto válido');
for (const ic of man.icons) ok((await ctx.request.get(url + ic.src)).ok(), 'ícono ' + ic.src);
await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(1200);
ok(await p.evaluate(async () => (await caches.keys()).includes('marco-v1')), 'servicio guardado en caché');
await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(2000);
ok((await p.title()) === 'Marco app' && await p.isVisible('#panel'), 'abre sin internet');
console.log('errores de consola:', errs.length ? errs : 'ninguno'); await b.close();

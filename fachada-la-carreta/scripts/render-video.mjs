// Recorrido del visor 3D: captura cuadro por cuadro con Playwright y luego ffmpeg arma el MP4.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'fs';
const [file, frames] = process.argv.slice(2);
mkdirSync(frames, { recursive: true });
const FPS = 24;
// [t, pos, target, abierta, corte?]
const K = [
  [0,  [-15, 3.2, 12], [0, 2, -2], 0],
  [6,  [0, 2.6, 15],   [0, 2, -1], 0],
  [8,  [0, 2.4, 12],   [0, 2, -1], 0],
  [14, [0, 2.2, 10],   [0, 2, -1], 1],
  [18, [11, 3, 11],    [2, 1.8, -2], 1],
  [22, [16, 3.5, -1],  [0, 1.8, -3], 1],
  [22.01, [-4.5, 1.7, -7], [0, 1.8, 4], 1, true],
  [26, [4.5, 1.7, -7], [0, 1.8, 4], 1],
  [26.01, [-12, 6, 15], [0, 1.8, -2], 1, true],
  [30, [0, 4, 17],     [0, 1.8, -1], 0],
];
const ease = x => x * x * (3 - 2 * x);
function at(t) {
  let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  if (b[4]) return { p: a[1], t: a[2], o: a[3] };
  const u = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0]))), e = ease(u);
  const L = (x, y) => x.map((v, j) => v + (y[j] - v) * e);
  return { p: L(a[1], b[1]), t: L(a[2], b[2]), o: a[3] + (b[3] - a[3]) * e };
}
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await pg.goto('file://' + file); await pg.waitForTimeout(1500);
await pg.evaluate(() => { __api.hideUI(true); __api.setDims(false); });
const N = Math.round(K[K.length - 1][0] * FPS);
for (let f = 0; f < N; f++) {
  const s = at(f / FPS);
  const url = await pg.evaluate(s => { __api.setOpen(s.o); __api.setCam(s.p, s.t, 45); return __api.shot(); }, s);
  writeFileSync(`${frames}/f${String(f).padStart(4, '0')}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  if (f % 48 === 0) console.log(f + '/' + N);
}
await b.close();

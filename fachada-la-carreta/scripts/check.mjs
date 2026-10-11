import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const file = 'file://' + process.argv[2];
const out = process.argv[3];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errs = [];
for (const [name, vp, mobile] of [['movil', { width: 390, height: 844 }, true], ['escritorio', { width: 1280, height: 720 }, false]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
  await p.goto(file); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/${name}-cerrada.png` });
  await p.click('#bToggle'); await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/${name}-abierta.png` });
  await p.click('#bBom'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${name}-proforma.png` });
  const sc = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, rGap: document.getElementById('rGap').textContent, sum: document.getElementById('summary').innerText }));
  console.log(name, JSON.stringify(sc));
  await ctx.close();
}
console.log('errores:', errs.length ? errs : 'ninguno');
await b.close();

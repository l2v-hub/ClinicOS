// Evidenza browser: interfaccia al 90% sui tablet (meta viewport initial-scale=0.9).
// Emulazione Chromium di iPad 11" (mobile, touch) in orizzontale e verticale, telefono e computer.
//   BASE=http://localhost:4184 node <questo file>
import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = 'artifacts/task-validation/interfaccia-al-90-per-cento-sui-tablet';
mkdirSync(`${DIR}/screenshots`, { recursive: true });
mkdirSync(`${DIR}/logs`, { recursive: true });
const BASE = process.env.BASE ?? 'http://localhost:4184';
const log = [];
const check = (n, ok, d = '') => log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`);

const browser = await chromium.launch();
const TARGETS = [
  { name: 'ipad11-orizzontale', ctx: devices['iPad Pro 11 landscape'], tablet: true },
  { name: 'ipad11-verticale', ctx: devices['iPad Pro 11'], tablet: true },
  { name: 'telefono', ctx: devices['iPhone 13'], tablet: false },
  { name: 'computer-1180', ctx: { viewport: { width: 1180, height: 820 } }, tablet: false },
  { name: 'computer-1440', ctx: { viewport: { width: 1440, height: 900 } }, tablet: false },
];

for (const t of TARGETS) {
  const context = await browser.newContext(t.ctx);
  const p = await context.newPage();
  await p.goto(BASE);
  await p.getByText('Operatore', { exact: true }).first().click();
  await p.waitForTimeout(1500);
  const m = await p.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]').getAttribute('content');
    const side = document.querySelector('.teams-sidebar')?.getBoundingClientRect();
    const btn = document.querySelector('.compact-topbar .ds-icon-btn, .compact-topbar button');
    return {
      meta,
      cssWidth: document.documentElement.clientWidth,
      screenWidth: screen.width,
      scale: visualViewport ? visualViewport.scale : 1,
      innerHeight,
      sidebarBottom: side ? Math.round(side.bottom) : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      btnCss: btn ? Math.round(btn.getBoundingClientRect().height) : null,
    };
  });
  if (t.tablet) {
    const expected = Math.round(m.screenWidth / 0.9);
    check(
      `AC1 ${t.name}: initial-scale 0.9, larghezza CSS = schermo / 0.9, controlli ~43px sullo schermo`,
      /initial-scale=0\.9/.test(m.meta) &&
        Math.abs(m.cssWidth - expected) <= 1 &&
        Math.abs(m.scale - 0.9) < 0.01,
      JSON.stringify({ ...m, expected, onScreen48: Math.round(48 * m.scale) }),
    );
  } else {
    check(
      `AC2 ${t.name}: nessun cambiamento (initial-scale 1.0)`,
      /initial-scale=1\.0/.test(m.meta) && (m.scale ?? 1) === 1,
      JSON.stringify(m),
    );
  }
  const heights = [];
  for (const [title, name] of [
    [null, 'turno'],
    ['Pazienti', 'pazienti'],
    ['Terapia', 'terapia'],
  ]) {
    if (title) {
      if (m.cssWidth < 1024) await p.getByRole('button', { name: 'Apri menu' }).click();
      await p.locator(`.teams-sidebar__item[title="${title}"]`).click();
      await p.waitForTimeout(1500);
    }
    const s = await p.evaluate(() => {
      const side = document.querySelector('.teams-sidebar').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebarToBottom: Math.abs(Math.round(side.bottom) - innerHeight) <= 1 || side.right <= 0,
      };
    });
    heights.push({ name, ...s });
    await p.screenshot({ path: `${DIR}/screenshots/${t.name}-${name}.png` });
  }
  check(
    `AC3 ${t.name}: sidebar e pagine a tutta altezza, nessuno scorrimento orizzontale (Turno, Pazienti, Terapia)`,
    heights.every((h) => h.overflow <= 0 && h.sidebarToBottom),
    JSON.stringify(heights),
  );
  await context.close();
}
await browser.close();
writeFileSync(`${DIR}/logs/playwright-evidence.txt`, log.join('\n') + '\n');
console.log(log.join('\n'));
console.log(`${log.filter((l) => l.startsWith('PASS')).length}/${log.length} PASS`);

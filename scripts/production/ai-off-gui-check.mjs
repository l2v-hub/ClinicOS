#!/usr/bin/env node
// Phase 9 — classic GUI with ALL AI disabled (no runtime, deterministic interpreter, voice off).
// REAL frontend (Vite) + REAL backend + Postgres; Role Simulator login by click. Checks:
//   G1 every main screen of the operator shell renders, no 5xx, no console errors
//   G2 the Assistant still answers (deterministic) and never claims a write
//   G3 logout ends the session SERVER-side: the token captured before logout is refused after
//
//   node scripts/production/ai-off-gui-check.mjs --front http://127.0.0.1:5299 \
//        --api http://127.0.0.1:3399 --out <dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const FRONT = arg('front', 'http://127.0.0.1:5299');
const API = arg('api', 'http://127.0.0.1:3399');
const OUT = arg('out', 'ai-off-gui');
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (id, ok, detail = '') => {
  results.push({ id, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`);
};

const status = await (await fetch(`${API}/ready`)).json();
check(
  'G0.ai_disabled',
  status.ai.runtime === 'disabled' && status.ai.voice === 'disabled',
  JSON.stringify(status.ai),
);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
const consoleErrors = [];
const serverErrors = [];
let lastToken = '';
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text()))
    consoleErrors.push(m.text().slice(0, 200));
});
page.on('request', (r) => {
  const auth = r.headers().authorization;
  if (auth?.startsWith('Bearer sim.')) lastToken = auth.slice(7);
});
page.on('response', (r) => {
  if (r.url().startsWith(API) && r.status() >= 500)
    serverErrors.push(`${r.status()} ${new URL(r.url()).pathname}`);
});

await page.goto(FRONT);
await page
  .getByRole('button', { name: /Infermiere 1/ })
  .first()
  .click();
await page.getByTestId('assistant-entry').waitFor({ timeout: 30000 });
await page.screenshot({ path: `${OUT}/G1-home.png` });

const SCREENS = [
  'Pazienti',
  'Terapia',
  'Parametri',
  'Consegne',
  'Agenda',
  'Note',
  'Farmaci',
  'Turno',
];
for (const label of SCREENS) {
  const item = page.locator('.teams-sidebar').getByText(label, { exact: true }).first();
  if (!(await item.count())) {
    check(`G1.${label}`, false, 'sidebar item missing');
    continue;
  }
  await item.click();
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(600);
  const alert = await page
    .locator('[role="alert"]')
    .allInnerTexts()
    .catch(() => []);
  const blocking = alert.filter((t) => /errore|non raggiungibile|impossibile/i.test(t));
  await page.screenshot({ path: `${OUT}/G1-${label.toLowerCase()}.png` });
  check(`G1.${label}`, blocking.length === 0, blocking.join(' | ').slice(0, 120));
}
check('G1.no_5xx', serverErrors.length === 0, serverErrors.join(', '));

// G2 — Assistant without AI
await page.getByTestId('assistant-entry').click();
await page.getByRole('dialog', { name: 'Assistente AI' }).waitFor();
const [answer] = await Promise.all([
  page.waitForResponse((r) => r.url().includes('/skills/converse'), { timeout: 30000 }),
  (async () => {
    await page.getByLabel('Messaggio per l’assistente').fill('quali ospiti ho in carico?');
    await page.getByLabel('Messaggio per l’assistente').press('Enter');
  })(),
]);
const turn = await answer.json();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/G2-assistant-deterministic.png` });
check(
  'G2.assistant_answers',
  answer.status() === 200 && turn.interpreter === 'deterministic',
  `${answer.status()} ${turn.interpreter} ${turn.status}`,
);
check('G2.no_false_write', turn.status !== 'COMPLETED' || !turn.preview, turn.status);
const mic = page.getByTestId('am-mic');
const micState = {
  state: await mic.getAttribute('data-state'),
  disabled: await mic.isDisabled(),
  label: await mic.getAttribute('aria-label'),
};
check(
  'G2.voice_disabled_explained',
  micState.state === 'UNAVAILABLE' && micState.disabled && /non attiva/.test(micState.label ?? ''),
  JSON.stringify(micState),
);
await page.keyboard.press('Escape');

// G3 — logout invalidates the session on the server
const tokenBefore = lastToken;
const okBefore = (
  await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${tokenBefore}` } })
).status;
await page
  .getByRole('button', { name: /menu utente/ })
  .first()
  .click();
await page
  .getByRole('menuitem', { name: /Esci|Cambia profilo/ })
  .or(page.getByRole('button', { name: /Esci|Cambia profilo/ }))
  .first()
  .click();
await page
  .getByRole('button', { name: /Infermiere 1/ })
  .first()
  .waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
const after = (
  await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${tokenBefore}` } })
).status;
await page.screenshot({ path: `${OUT}/G3-after-logout.png` });
check(
  'G3.server_side_logout',
  okBefore === 200 && after === 401,
  `before=${okBefore} after=${after}`,
);
check('G4.no_console_errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));

await context.tracing.stop({ path: `${OUT}/trace.zip` });
await browser.close();
const failed = results.filter((r) => !r.ok).length;
writeFileSync(
  `${OUT}/ai-off-gui.json`,
  JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
);
console.log(`\n${results.length - failed}/${results.length} AI-off GUI checks passed`);
process.exit(failed ? 1 : 0);

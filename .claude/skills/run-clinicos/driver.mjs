#!/usr/bin/env node
// ClinicOS run-driver: smoke-checks the API and screenshots the running SPA.
//
//   node driver.mjs smoke                              # curl-free check of API + frontend
//   node driver.mjs shot <route> <out.png> [vp] [role] [clicks] # screenshot a SPA route
//   node driver.mjs                                     # = smoke, then shot home -> screenshot.png
//
// vp     = desktop (1366x768, default) | tablet (1024x768)
// role   = (none, default — stays on the role gate) | operatore | admin
//          The app opens on a role-selection screen; pass a role to click past it
//          into the actual dashboard before screenshotting.
// clicks = "Label A>>Label B" — visible-text elements clicked in order after the
//          role gate (state-based nav: e.g. "Pazienti" then a patient name).
// Assumes backend on :3001 and frontend on :5173 are already running
// (see SKILL.md "Run (agent path)"). Uses Playwright Chromium.

import { chromium } from 'playwright';

const FRONTEND = process.env.CLINICOS_FRONTEND ?? 'http://localhost:5173';
const BACKEND = process.env.CLINICOS_BACKEND ?? 'http://localhost:3001';
const VIEWPORTS = { desktop: { width: 1366, height: 768 }, tablet: { width: 1024, height: 768 } };

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function smoke() {
  const health = await getJson(`${BACKEND}/health`);
  if (health.status !== 'ok') throw new Error(`/health returned ${JSON.stringify(health)}`);
  const patients = await getJson(`${BACKEND}/patients`);
  if (!Array.isArray(patients)) throw new Error('/patients did not return an array');
  const home = await fetch(FRONTEND);
  if (!home.ok) throw new Error(`frontend ${FRONTEND} -> HTTP ${home.status}`);
  console.log(`OK  backend /health=ok  /patients=${patients.length} rows  frontend=${home.status}`);
  return patients.length;
}

const ROLE_LABEL = { operatore: 'Operatore', admin: 'Amministratore' };

async function shot(route, out, vpName, role, clicks) {
  const viewport = VIEWPORTS[vpName] ?? VIEWPORTS.desktop;
  const url = FRONTEND + (route.startsWith('/') ? route : `/${route}`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200); // let React render data after the fetch settles
    if (role && ROLE_LABEL[role]) {
      await page.getByText(ROLE_LABEL[role], { exact: true }).click();
      await page.waitForTimeout(1500); // dashboard mounts + fetches
    }
    if (clicks) {
      for (const label of clicks.split('>>').map(s => s.trim()).filter(Boolean)) {
        await page.getByText(label).first().click();
        await page.waitForTimeout(1200);
        console.log(`     clicked "${label}"`);
      }
    }
    await page.screenshot({ path: out, fullPage: false });
    const title = await page.title();
    const bodyLen = (await page.textContent('body'))?.length ?? 0;
    console.log(`SHOT ${url} [${viewport.width}x${viewport.height}] -> ${out}`);
    console.log(`     title="${title}" bodyChars=${bodyLen} consoleErrors=${errors.length}`);
    if (bodyLen < 100) console.warn('     WARN: body looks empty — page may not have rendered.');
    if (errors.length) console.warn('     first error:', errors[0]);
  } finally {
    await browser.close();
  }
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'smoke') {
    await smoke();
  } else if (cmd === 'shot') {
    const [route = '/', out = 'screenshot.png', vp = 'desktop', role, clicks] = rest;
    await shot(route, out, vp, role, clicks);
  } else {
    await smoke();
    await shot('/', 'screenshot.png', 'desktop');
  }
} catch (err) {
  console.error('DRIVER FAILED:', err.message);
  process.exit(1);
}

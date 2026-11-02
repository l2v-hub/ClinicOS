// Synthetic acceptance on the real built App. Every non-loopback request is intercepted.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { preview } from 'vite';
import { chromium, expect } from 'playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'artifacts/task-validation/demo-auth-expiry/evidence/browser');
const origin = 'http://127.0.0.1:5317';
const apiOrigins = new Set([
  'https://clinicos-backend-production-df88.up.railway.app',
  'https://clinicos-backend-demo.up.railway.app',
]);
const expired = {
  mode: 'disabled',
  simulator: false,
  temporaryDemo: false,
  syntheticOnly: true,
  expiresAt: '2000-01-01T00:00:00Z',
};
const active = {
  ...expired,
  mode: 'demo',
  simulator: true,
  temporaryDemo: true,
  expiresAt: '2099-01-01T00:00:00Z',
};
const identities = ['Amministratore', 'Supervisore', 'Medico', 'Infermiere', 'OSS'].map(
  (name, i) => ({
    id: `SYNTHETIC-${i}`,
    name,
    roleLabel: name,
    roleDescription: 'Profilo sintetico per collaudo',
  }),
);
const results = [];
await mkdir(out, { recursive: true });
let server, browser;

try {
  server = await preview({
    configFile: false,
    envDir: false,
    root: path.join(root, 'frontend'),
    preview: { host: '127.0.0.1', port: 5317, strictPort: true },
  });
  browser = await chromium.launch({ headless: true });
  for (const width of [1280, 390]) {
    for (const scenario of [
      'pending',
      'expired',
      'unavailable',
      'malformed',
      'disabled',
      'retry',
      'legacy',
      'entra',
      'late-expiry',
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: 1004 },
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      const unexpected = [],
        errors = [];
      let statusPayload = { ...expired },
        statusReads = 0,
        identityReads = 0,
        authMeReads = 0;
      let releaseStatus, releaseIdentity;
      const statusGate = new Promise((resolve) => {
        releaseStatus = resolve;
      });
      const identityGate = new Promise((resolve) => {
        releaseIdentity = resolve;
      });
      if (scenario === 'legacy' || scenario === 'late-expiry')
        statusPayload = { ...active, simulator: false };
      if (scenario === 'entra')
        statusPayload = { ...expired, mode: 'entra', syntheticOnly: false, expiresAt: null };
      if (scenario === 'disabled') statusPayload = { ...expired, expiresAt: null };
      page.on('pageerror', (error) => errors.push(error.message));
      await context.route('**/*', async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (url.origin === origin && request.method() === 'GET') return route.continue();
        if (url.hostname === 'fonts.googleapis.com' && request.method() === 'GET')
          return route.fulfill({ contentType: 'text/css', body: '' });
        const json = (payload) =>
          route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) });
        if (
          apiOrigins.has(url.origin) &&
          request.method() === 'GET' &&
          url.pathname === '/auth/status'
        ) {
          statusReads++;
          if (scenario === 'pending') await statusGate;
          if (scenario === 'unavailable') return route.abort('failed');
          if (scenario === 'malformed') return json({ ...statusPayload, mode: 'invalid' });
          return json(statusPayload);
        }
        if (
          apiOrigins.has(url.origin) &&
          request.method() === 'GET' &&
          url.pathname === '/auth/simulator/identities'
        ) {
          identityReads++;
          return json({ identities });
        }
        if (
          apiOrigins.has(url.origin) &&
          request.method() === 'GET' &&
          url.pathname === '/auth/me' &&
          scenario === 'late-expiry'
        ) {
          authMeReads++;
          await identityGate;
          return route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 'auth_disabled',
              error: 'Endpoint clinici disabilitati: configurare esplicitamente AUTH_MODE',
            }),
          });
        }
        unexpected.push({ method: request.method(), path: url.pathname });
        return route.abort('blockedbyclient');
      });
      try {
        await page.goto(origin, { waitUntil: 'domcontentloaded' });
        const roleCards = page.locator('.login-role-card');
        const profileCards = page.locator('.login-sim__item');
        if (scenario === 'pending') {
          await expect(page.getByRole('heading', { name: 'Verifica accesso…' })).toBeVisible();
          assert.equal(await roleCards.count(), 0);
          assert.equal(await profileCards.count(), 0);
          assert.equal(identityReads, 0);
          assert.equal(authMeReads, 0);
          releaseStatus();
        }
        if (scenario === 'retry') {
          await expect(page.getByRole('heading', { name: 'Accesso demo scaduto' })).toBeVisible();
          assert.equal(await roleCards.count(), 0);
          assert.equal(await profileCards.count(), 0);
          statusPayload = { ...active };
          await page.getByRole('button', { name: 'Ricontrolla accesso' }).click();
          await expect(profileCards).toHaveCount(5);
          for (const identity of identities)
            await expect(
              page.getByRole('button', { name: new RegExp(identity.name) }),
            ).toBeVisible();
          assert.equal(await roleCards.count(), 0);
          assert.ok(statusReads >= 2);
          assert.equal(identityReads, 1);
        } else if (scenario === 'legacy' || scenario === 'entra') {
          await expect(roleCards).toHaveCount(2);
          assert.equal(await profileCards.count(), 0);
        } else if (scenario === 'late-expiry') {
          await expect(roleCards).toHaveCount(2);
          statusPayload = { ...expired };
          await page.getByRole('button', { name: /^Operatore/ }).click();
          await expect(roleCards.first()).toBeDisabled();
          await expect(roleCards.last()).toBeDisabled();
          releaseIdentity();
          await expect(page.getByRole('heading', { name: 'Accesso demo scaduto' })).toBeVisible();
          assert.equal(authMeReads, 1);
          assert.equal(await roleCards.count(), 0);
        } else {
          const heading =
            scenario === 'unavailable' || scenario === 'malformed'
              ? 'Verifica accesso non riuscita'
              : scenario === 'disabled'
                ? 'Accesso non disponibile'
                : 'Accesso demo scaduto';
          await expect(page.getByRole('heading', { name: heading })).toBeVisible();
          assert.equal(await roleCards.count(), 0);
          assert.equal(await profileCards.count(), 0);
          await expect(
            page.getByText('Accesso dimostrativo — nessuna credenziale richiesta', { exact: true }),
          ).toHaveCount(0);
          assert.equal(identityReads, 0);
        }
        if (scenario !== 'late-expiry') assert.equal(authMeReads, 0);
        assert.deepEqual(
          unexpected,
          [],
          'No outbound requests, session creation, clinical access or clinical writes',
        );
        assert.deepEqual(errors, []);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        assert.equal(overflow, false);
        if (['expired', 'retry', 'unavailable', 'late-expiry'].includes(scenario))
          await page.screenshot({
            path: path.join(out, `${scenario}-${width}.png`),
            fullPage: true,
          });
        results.push({
          scenario,
          width,
          status: 'passed',
          statusReads,
          identityReads,
          authMeReads,
          outbound: 0,
          clinicalWrites: 0,
        });
      } finally {
        releaseStatus();
        releaseIdentity();
        await context.close();
      }
    }
  }
  await writeFile(
    path.join(out, 'browser.json'),
    JSON.stringify(
      { syntheticOnly: true, actualApp: true, cases: results.length, results },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      status: 'passed',
      syntheticOnly: true,
      actualApp: true,
      cases: results.length,
      outbound: 0,
      clinicalWrites: 0,
    }),
  );
} finally {
  await browser?.close();
  await new Promise((resolve) =>
    server?.httpServer ? server.httpServer.close(resolve) : resolve(),
  );
}

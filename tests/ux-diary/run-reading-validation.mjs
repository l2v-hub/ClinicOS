import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mockApi } from '../ux-discovery/mock-api.mjs';
const out = path.resolve('artifacts/task-validation/diary-unread-shared');
for (const directory of ['screenshots', 'test-results'])
  mkdirSync(path.join(out, directory), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 1004 } });
const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
await mockApi(context, state);
let read = false,
  failAck = true,
  failCount = false,
  posts = 0;
const errors = [];
const receipt = () =>
  read
    ? {
        state: 'read',
        readBy: {
          operatorName: 'Collega Sintetico',
          operatorRole: 'oss',
          acknowledgedAt: '2026-10-05T08:00:00Z',
          byMe: true,
        },
        isAuthor: false,
        canAcknowledge: false,
      }
    : { state: 'unread', readBy: null, isAuthor: false, canAcknowledge: true };
await context.route('http://localhost:3001/patients/diary-unread-count', (route) =>
  route.fulfill({
    status: failCount ? 503 : 200,
    json: failCount ? { error: 'Synthetic outage' } : { unreadCount: read ? 102 : 103 },
  }),
);
await context.route('http://localhost:3001/patients/patient-test/diary**', async (route) => {
  const request = route.request();
  if (request.method() === 'GET')
    return route.fulfill({
      json: {
        entries: [
          {
            id: 'note-test',
            patientId: 'patient-test',
            authorType: 'medico',
            authorName: 'Autore Sintetico',
            title: 'Nota normale sintetica',
            content: 'Contenuto sintetico',
            priority: 'normale',
            status: 'completata',
            entryDateTime: '2026-10-05T09:00',
            createdAt: '2026-10-05T07:00:00Z',
            updatedAt: '2026-10-05T07:00:00Z',
            urgency: { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false },
            readReceipt: receipt(),
          },
        ],
        hasMore: true,
        nextCursor: 'synthetic-more',
      },
    });
  assert.equal(request.method(), 'POST');
  assert.ok(request.url().endsWith('/note-test/ack'));
  assert.deepEqual(request.postDataJSON(), { purpose: 'read' });
  posts++;
  if (failAck) return route.fulfill({ status: 503, json: { error: 'Synthetic outage' } });
  read = true;
  return route.fulfill({
    status: 201,
    json: {
      readReceipt: receipt(),
      urgency: { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false },
    },
  });
});
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
const badge = (value) =>
  page.getByRole('button', {
    name: `Consegne, ${value} note senza conferma di lettura`,
    exact: true,
  });
const card = page.locator('[data-diary-entry-id="note-test"]');
try {
  await page.goto('http://127.0.0.1:5189/tests/ux-turno/index.html?reading=1');
  await badge(103).waitFor();
  await page.getByRole('button', { name: 'Pazienti', exact: true }).click();
  await card.waitFor();
  assert.equal(posts, 0);
  assert.equal(await badge(103).count(), 1);
  assert.equal(await page.locator('.diario-card').count(), 1);
  assert.equal(await card.locator('.diary-thread--active').count(), 0);
  await card.getByRole('button', { name: /^Segna come letto:/ }).click();
  await page.getByText('Conferma di lettura non registrata. Riprova.', { exact: true }).waitFor();
  assert.equal(await badge(103).count(), 1);
  assert.equal(await card.locator('[data-diary-reading-state="unread"]').count(), 1);
  failAck = false;
  await card.getByRole('button', { name: /^Segna come letto:/ }).click();
  await badge(102).waitFor();
  assert.match(await card.textContent(), /Letta da Collega Sintetico \(OSS\)/);
  assert.equal(await card.locator('time').textContent(), '05/10/2026 10:00');
  assert.equal(await card.getByRole('button', { name: /^Segna come letto:/ }).count(), 0);
  for (const width of [1150, 390]) {
    await page.setViewportSize({ width, height: 1004 });
    await card.scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    await page.screenshot({
      path: path.join(out, 'screenshots', `reading-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1150, height: 1004 });
  await page.reload();
  await badge(102).waitFor();
  await page.getByRole('button', { name: 'Pazienti', exact: true }).click();
  await card.waitFor();
  assert.match(await card.textContent(), /Letta da Collega Sintetico/);
  assert.equal(
    posts,
    2,
    'only one failed and one successful explicit POST, opening/reload never POST',
  );
  failCount = true;
  await page.evaluate(() => window.dispatchEvent(new Event('clinicos:diary-reading-changed')));
  const unavailable = page.getByRole('button', {
    name: 'Consegne, conteggio delle note da leggere non disponibile',
    exact: true,
  });
  await unavailable.waitFor({ state: 'attached' });
  assert.equal(await unavailable.locator('.teams-sidebar__badge').count(), 0);
  assert.equal(state.clinicalWrites, 0);
  assert.deepEqual(errors, []);
  writeFileSync(
    path.join(out, 'test-results', 'browser.json'),
    JSON.stringify(
      { status: 'passed', posts, unmockedClinicalWrites: state.clinicalWrites, errors },
      null,
      2,
    ),
  );
  console.log(
    'PASS explicit all-priority Letto, count beyond page, failure, identity/date, reload, unknown count and 390/1150 layout',
  );
} finally {
  await context.close();
  await browser.close();
}

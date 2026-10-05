import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const out = 'artifacts/task-validation/consegne-readable/screenshots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1150, height: 1004 } });
const patients = [
  {
    id: 'patient-a',
    firstName: 'MIRIAM',
    lastName: 'NANNI',
    codiceFiscale: 'NNNMRM55T55F083A',
    dateOfBirth: '1955-12-15',
  },
  {
    id: 'patient-b',
    firstName: 'DIANORA',
    lastName: 'MANARA',
    codiceFiscale: 'MNRDNR34R67D360I',
    dateOfBirth: '1934-10-27',
  },
];
let longRoster = false;
let long = false,
  fail = false,
  saved = [],
  posts = 0,
  ackPosts = 0;
const receipt = { state: 'unread', readBy: null, isAuthor: false, canAcknowledge: true };
const makeEntry = (id, content, index = 0) => ({
  id,
  patientId: 'patient-a',
  authorType: 'infermiere',
  authorName: 'Infermiere Test',
  title: `Osservazione ${index + 1}`,
  content,
  priority: 'normale',
  status: 'aperta',
  entryDateTime: '2026-10-05T10:00',
  sourceType: 'diary',
  sourceId: id,
  readReceipt: receipt,
});
await context.route('http://localhost:3001/**', async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  if (url.pathname === '/patients/page')
    return route.fulfill({
      json: {
        items: longRoster
          ? [
              ...patients,
              ...Array.from({ length: 30 }, (_, i) => ({
                ...patients[0],
                id: i === 29 ? 'patient-last' : `other-${i}`,
                lastName: `Paziente ${i}`,
              })),
            ]
          : patients,
        hasMore: false,
        nextCursor: null,
      },
    });
  if (url.pathname.endsWith('/diary')) {
    const patientId = url.pathname.split('/')[2];
    const count = long ? 50 : patientId === 'patient-a' ? 3 : 1;
    const page = url.searchParams.get('cursor') ? 2 : 1;
    return route.fulfill({
      json: {
        entries: [
          ...saved.filter((s) => s.patientId === patientId),
          ...Array.from({ length: count }, (_, i) => ({
            ...makeEntry(
              `note-${patientId}-${page}-${i}`,
              'Osservazione del turno. Paziente stabile; proseguire il monitoraggio e riferire eventuali variazioni.',
              i,
            ),
            patientId,
          })),
        ].slice(0, 50),
        hasMore: long && page === 1,
        nextCursor: long && page === 1 ? 'page2' : null,
      },
    });
  }
  if (url.pathname.endsWith('/ack')) {
    ackPosts++;
    return route.fulfill({ status: 503, json: {} });
  }
  if (url.pathname === '/consegne' && request.method() === 'POST') {
    posts++;
    if (fail) return route.fulfill({ status: 503, json: {} });
    const body = request.postDataJSON();
    saved.push({ ...makeEntry(`saved-${posts}`, body.note), patientId: body.pazienteId });
    return route.fulfill({
      status: 201,
      json: { ...body, id: `saved-${posts}`, replayed: false, stato: 'aperta' },
    });
  }
  return route.fulfill({ json: {} });
});
const page = await context.newPage(),
  errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const diary = () => page.getByRole('tab', { name: 'Diario paziente', exact: true });
const compose = () => page.getByRole('tab', { name: /Nuova nota/ });
const note = () => page.getByLabel('Segnalazione', { exact: true });
const select = (surname) => page.locator('.handover-rounds__select').filter({ hasText: surname });
try {
  await page.goto('http://127.0.0.1:5190/tests/ux-handover-voice/index.html?rounds=1');
  await page.locator('.diario-card').first().waitFor();
  assert.equal(await diary().getAttribute('aria-selected'), 'true');
  assert.equal(await note().isVisible(), false);
  assert.equal(posts + ackPosts, 0, 'opening never saves or confirms reading');
  for (const width of [1150, 1024, 800, 390]) {
    await page.setViewportSize({ width, height: 1004 });
    if (width <= 1023)
      await page.waitForFunction(
        () => document.querySelector('.teams-sidebar').getBoundingClientRect().right <= 0,
      );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    assert.equal(
      await page
        .locator('.handover-rounds__detail')
        .evaluate((el) => getComputedStyle(el).overflowY),
      'visible',
    );
    assert.equal(
      await page
        .locator('.handover-rounds__history > .cr-tab-content')
        .evaluate((el) => getComputedStyle(el).paddingLeft),
      '0px',
    );
    await page.screenshot({ path: `${out}/history-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1150, height: 1004 });
  await page.getByRole('button', { name: '＋ Nuova nota', exact: true }).click();
  await note().fill('Bozza A: osservazione sintetica da conservare.');
  await diary().click();
  assert.equal(
    await compose()
      .textContent()
      .then((t) => t.includes('Bozza')),
    true,
  );
  await compose().click();
  await note().evaluate((el) => {
    if (document.activeElement !== el) throw Error('editor focus missing');
  });
  assert.equal(await note().inputValue(), 'Bozza A: osservazione sintetica da conservare.');
  await select('MANARA').click();
  await note().fill('Bozza B');
  await select('NANNI').click();
  assert.match(await note().inputValue(), /Bozza A/);
  await page.screenshot({ path: `${out}/composer-1150.png`, fullPage: true });
  await page.reload();
  await compose().waitFor();
  await compose().click();
  assert.match(await note().inputValue(), /Bozza A/);
  fail = true;
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByRole('button', { name: 'Riprova salvataggio', exact: true }).waitFor();
  assert.equal(await note().isDisabled(), true);
  fail = false;
  await page.getByRole('button', { name: 'Riprova salvataggio', exact: true }).click();
  await page.getByText('Consegna salvata per NANNI, MIRIAM.').first().waitFor();
  await diary().click();
  await page.locator('.diario-card').filter({ hasText: 'Bozza A' }).waitFor();
  await compose().click();
  await note().fill('Seconda nota per il giro');
  await page.getByRole('button', { name: 'Salva e prossimo', exact: true }).click();
  await page.locator('.handover-rounds__patient-heading').filter({ hasText: 'MANARA' }).waitFor();
  assert.equal(await note().inputValue(), 'Bozza B');
  await diary().click();
  await diary().focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await compose().getAttribute('aria-selected'), 'true');
  assert.equal(await compose().evaluate((el) => document.activeElement === el), true);
  await page.getByTestId('toggle-writing').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[role=tab][aria-selected=true]')?.textContent === 'Diario paziente',
  );
  assert.equal(await note().isVisible(), false);
  await page.getByTestId('toggle-writing').click();
  await compose().waitFor();
  assert.equal(await note().inputValue(), 'Bozza B');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.querySelector('.teams-sidebar').getBoundingClientRect().right <= 0,
  );
  await page.screenshot({ path: `${out}/composer-390.png`, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  long = true;
  await page.reload();
  await page.locator('.diario-card').nth(49).waitFor();
  await page.getByRole('button', { name: 'Segnalazioni precedenti →', exact: true }).click();
  await page.getByText('Pagina 2 ·', { exact: false }).waitFor();
  assert.equal(await page.locator('.diario-card').count(), 50);
  await compose().click();
  await diary().click();
  await page.getByText('Pagina 2 ·', { exact: false }).waitFor();
  assert.equal(ackPosts, 0);
  longRoster = true;
  await page.setViewportSize({ width: 1150, height: 1004 });
  await page.goto(
    'http://127.0.0.1:5190/tests/ux-handover-voice/index.html?rounds=1&patient=patient-last',
  );
  await page
    .locator('.handover-rounds__patient-heading')
    .filter({ hasText: 'Paziente 29' })
    .waitFor();
  assert.equal(
    await page.locator('.page-content').evaluate((el) => el.scrollTop),
    0,
    'revealing the selected patient only scrolls the roster, never the diary',
  );
  assert.ok((await page.locator('.handover-rounds__roster').evaluate((el) => el.scrollTop)) > 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS Consegne: readable responsive layout, persistent drafts, focus/tabs, failed-save retry, save-next, bounded history; no implicit reading confirmation.',
  );
} catch (error) {
  console.log({
    errors,
    content: (await page.locator('.handover-rounds__detail').textContent()).slice(0, 2500),
  });
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  throw error;
} finally {
  await context.close();
  await browser.close();
}

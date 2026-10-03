import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const out = path.resolve(process.env.UX_EVIDENCE_DIR || 'artifacts/task-validation/ux-turno-commenti');
mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1161, height: 1004 },
  recordVideo: { dir: path.join(out, 'video'), size: { width: 1161, height: 1004 } },
});
await context.tracing.start({ screenshots: true, snapshots: true });
let taken = false,
  failAck = true,
  failOverview = false,
  withLateTherapy = false,
  legacyOverview = false;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const [hours, minutes] = clock.split(':').map(Number);
const dueMinutes = Math.max(0, hours * 60 + minutes - 28);
const due = `${String(Math.floor(dueMinutes / 60)).padStart(2, '0')}:${String(dueMinutes % 60).padStart(2, '0')}`;
const active = { state: 'active', takenBy: null, isAuthor: false, canAcknowledge: true };
const ack = {
  state: 'taken',
  takenBy: {
    operatorName: 'Infermiere Test',
    operatorRole: 'infermiere',
    acknowledgedAt: '2026-10-03T16:35:00Z',
    byMe: true,
  },
  isAuthor: false,
  canAcknowledge: false,
};
const handover = (id, priority, date) => ({
  id,
  pazienteId: 'patient-test',
  pazienteNome: 'Paziente Test Cognome Lungo',
  priorita: priority,
  stato: 'aperta',
  tipo: 'Monitoraggio',
  note: 'Verificare il comfort e registrare i parametri del turno.',
  scadenza: '2026-10-03',
  operatoreAssegnato: 'Infermiere Test',
  creatoDA: 'Infermiere Autore',
  createdAt: date,
  urgency:
    priority === 'urgente'
      ? taken
        ? ack
        : active
      : { state: 'none', takenBy: null, isAuthor: false, canAcknowledge: false },
});
const diaryRow = (id, overrides = {}) => ({
  id,
  patientId: 'patient-test',
  authorType: 'infermiere',
  authorName: 'Infermiere Autore',
  authorOperatorId: 'writer',
  title: 'Nota del turno',
  content: 'Controllare il comfort durante il turno.',
  priority: 'normale',
  status: 'completata',
  entryDateTime: '2026-10-03T16:00:00Z',
  createdAt: '2026-10-03T16:00:00Z',
  updatedAt: '2026-10-03T16:00:00Z',
  ...overrides,
});
const consoleErrors = [],
  requests = [];
await context.route('http://localhost:3001/**', async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  requests.push({ path: url.pathname, method: request.method() });
  const send = (body, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(body),
    });
  if (url.pathname === '/auth/status')
    return send({ mode: 'demo', temporaryDemo: true, simulator: true });
  if (url.pathname === '/auth/simulator/identities')
    return send({
      identities: [{ id: 'reader', name: 'Infermiere Test', roleLabel: 'Infermiere' }],
    });
  if (url.pathname === '/auth/simulator/session') return send({ token: 'sim.synthetic-ux-test' });
  if (url.pathname === '/auth/me')
    return send({
      id: 'reader',
      name: 'Infermiere Test',
      role: 'infermiere',
      appRole: 'infermiere',
      roleLabel: 'Infermiere',
      uiShell: 'operator',
      authMode: 'demo',
      temporaryDemo: true,
    });
  if (url.pathname === '/patients/clinical-summary/overview')
    return send({ totalPatients: 2, dimessi: 0, critici: 0, rischiAlti: 0, allergieGravi: 1 });
  if (url.pathname === '/appointments') return send([]);
  if (url.pathname === '/consegne')
    return send({
      items: [handover('critical', 'urgente', '2026-10-03T15:00:00Z')],
      summary: { total: 20, urgentActive: taken ? 11 : 12, urgentTaken: taken ? 1 : 0 },
      pageInfo: { hasMore: false, nextCursor: null },
    });
  if (url.pathname === '/notes')
    return send({
      items: [],
      summary: { unread: 0 },
      pageInfo: { hasMore: false, nextCursor: null },
    });
  if (url.pathname.includes('/brief')) return send({ items: [], count: 0 });
  if (url.pathname === '/patients')
    return send({ patients: [], pageInfo: { hasMore: false, nextCursor: null } });
  if (url.pathname === '/operators/directory/page') return send({
    items: [], pageInfo: { hasMore: false, nextCursor: null }, summary: null,
  });
  if (url.pathname === '/patients/page' || url.pathname === '/patients/parameters/page')
    return send({ items: [], hasMore: false, nextCursor: null });
  if (url.pathname === '/patients/clinical-summary') return send([]);
  if (url.pathname === '/patients/patient-test') return send({
    id: 'patient-test', firstName: 'Paziente Test', lastName: 'Cognome Lungo',
    dateOfBirth: '1955-12-15', sex: null, email: null, phone: null, codiceFiscale: null,
  });
  if (url.pathname.endsWith('/cartella')) return send({ patientId: 'patient-test', data: {
    allergie: [{ id: 'allergy-test', allergene: 'Allergene sintetico', gravita: 'grave', tipo: 'altro' }],
  } });
  if (url.pathname.endsWith('/intake-review')) return send({
    draftId: null, deferredTherapies: [], sourceDocumentIds: [], legacyPainDrafts: [], legacyPainError: null,
  });
  if (url.pathname.endsWith('/parameter-readings')) return send({
    readings: [{ id: 'reading-test', requestId: 'reading-test', patientId: 'patient-test',
      measuredAt: '2026-10-03T16:04:00Z', createdAt: '2026-10-03T16:04:00Z',
      values: { fr: '16', spo2: '98', o2: 'no', pa: '120/80', fc: '78', temperatura: '36', coscienza: 'A' },
      authorOperatorId: 'writer', authorName: 'Infermiere Autore',
    }], hasMore: false, nextCursor: null,
  });
  if (url.pathname.endsWith('/room-options') || url.pathname === '/operators') return send([]);
  if (url.pathname === '/consegne/overview') {
    if (failOverview) return send({ error: 'Unavailable' }, 503);
    const urgent = handover('critical', 'urgente', '2026-10-03T15:00:00Z');
    if (legacyOverview) return send({
      scope: 'operator', summary: { total: 20, open: 20, urgentOpen: 12 },
      openPreview: [urgent], urgentPreview: [urgent], byOperator: {},
    });
    return send({
      scope: 'operator',
      summary: { total: 20, urgentActive: taken ? 11 : 12, urgentTaken: taken ? 1 : 0 },
      urgentPreview: taken ? [] : [urgent],
      recentPreview: [handover('normal', 'normale', '2026-10-03T16:00:00Z'), urgent],
      byOperator: {},
    });
  }
  if (url.pathname === '/therapy-slots') return send(withLateTherapy && url.searchParams.get('date') === today ? [{
    id: 'slot-test', fascia: 'pomeriggio', label: 'Pomeriggio', ora: due,
    summary: { total: 1, pending: 1, administered: 0, notAdministered: 0 },
    patients: [{ patientId: 'patient-test', firstName: 'Paziente Test', lastName: 'Cognome Lungo', room: '101', bed: 'A',
      administrations: [{ administrationId: null, therapyId: 'therapy-test', drugName: 'Farmaco Test', dosage: '1 compressa', route: 'orale', scheduledTime: due, status: 'pending', administeredAt: null, administeredBy: null, notAdministeredReason: null }] }],
  }] : []);
  if (url.pathname.endsWith('/ack')) {
    if (failAck) return send({ error: 'Presa in carico non registrata. Riprova.' }, 503);
    taken = true;
    return send({ created: true, urgency: ack }, 201);
  }
  if (url.pathname.endsWith('/diary'))
    return send({
      entries: [
        diaryRow('handover-critical', {
          sourceType: 'consegna',
          sourceId: 'critical',
          priority: 'urgente',
          urgency: taken ? ack : active,
        }),
        diaryRow('mine', {
          authorName: 'Infermiere Test',
          priority: 'urgente',
          urgency: { ...active, isAuthor: true, canAcknowledge: false },
        }),
        diaryRow('completed-legacy'),
        diaryRow('no-shared-trace', { priority: 'urgente',
          acknowledgements: [{ operatorName: 'Collega Legacy Test', operatorRole: 'oss',
            acknowledgedAt: '2026-10-03T16:35:00Z' }],
        }),
      ],
      hasMore: false,
      nextCursor: null,
    });
  return send({});
});
const page = await context.newPage();
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('503'))
    consoleErrors.push(message.text());
});
const base = 'http://127.0.0.1:5187/tests/ux-turno/index.html';
const results = [];
const httpFailures = [];
page.on('response', response => {
  if (response.status() >= 400) httpFailures.push({status:response.status(),url:response.url()});
});
page.on('requestfailed', request => httpFailures.push({status:0,url:request.url(),failure:request.failure()}));
try {
  await page.goto(base);
  await page.getByRole('heading', { name: 'Ultime consegne' }).waitFor();
  await page
    .getByRole('button', { name: 'Apri consegne: 12 consegne critiche da prendere in carico' })
    .waitFor();
  assert.equal(await page.locator('.teams-sidebar__badge').textContent(), '12');
  assert.equal(await page.getByRole('button', { name: 'Note', exact: true }).count(), 0);
  assert.equal(await page.locator('.turno-pcard').count(), 0);
  assert.equal(await page.locator('.turno-handovers__item').count(), 2);
  assert.equal(
    await page.locator('.turno-handovers__item').first().locator('.turno-badge').textContent(),
    'Urgente',
  );
  await page.locator('.dashboard-notification-compact').click();
  await page.getByRole('dialog', { name: 'Segnalazioni operative' }).waitFor();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: /Leggi consegna di/ })
    .first()
    .click();
  await page.locator('.diario-card').first().waitFor();
  assert.match(await page.getByTestId('target').textContent(), /critical/);
  assert.equal(
    await page.locator('.diario-card__head').getByText('Completata', { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole('button', { name: /^Ho capito:/ }).count(),
    1,
    'author cannot acknowledge own note',
  );
  await page.getByRole('button', { name: /^Ho capito:/ }).click();
  await page.getByText('Presa in carico non registrata. Riprova.', { exact: true }).waitFor();
  assert.equal(
    await page.locator('.topbar-handovers__badge').textContent(),
    '12',
    'failed ack preserves count',
  );
  failAck = false;
  await page.getByRole('button', { name: /^Ho capito:/ }).click();
  await page.getByText(/Letta e compresa da Infermiere Test/).waitFor();
  await page
    .getByRole('button', { name: 'Apri consegne: 11 consegne critiche da prendere in carico' })
    .waitFor();
  assert.equal(await page.locator('.teams-sidebar__badge').textContent(), '11');
  assert.equal(await page.getByRole('button', { name: /^Ho capito:/ }).count(), 0);
  await page.reload();
  await page.getByRole('button', { name: /Apri consegne: 11 consegne critiche/ }).click();
  await page.getByText(/Letta e compresa da Infermiere Test/).waitFor();
  assert.match(await page.locator('.cr-alert-band').textContent(), /Attenzione permanente/);
  await page.getByRole('button', { name: 'Espandi ultimi parametri e NEWS2' }).click();
  await page.getByRole('dialog', { name: 'Ultimi parametri e NEWS2' }).waitFor();
  assert.equal(await page.getByRole('dialog').locator('.vt').count(), 6);
  assert.equal(
    await page
      .getByRole('button', { name: 'Chiudi parametri espansi' })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await page
      .getByRole('button', { name: 'Espandi ultimi parametri e NEWS2' })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  for (const viewport of [
    { width: 390, height: 600 },
    { width: 768, height: 500 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Espandi ultimi parametri e NEWS2' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ultimi parametri e NEWS2' });
    await dialog.waitFor();
    assert.equal(await dialog.evaluate((el) => getComputedStyle(el).overflowY), 'auto');
    await dialog.getByRole('button', { name: 'Apri storico completo' }).scrollIntoViewIfNeeded();
    await page.keyboard.press('Escape');
  }
  results.push(
    'PASS exact count beyond preview; failed and successful ack; historical persistence; author restriction; expansion focus/Escape',
  );
  for (const width of [390, 768, 1161, 1575]) {
    await page.setViewportSize({ width, height: 1004 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'no page overflow ' + width,
    );
    const heights = await page
      .locator('.vitals .vt')
      .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
    assert.ok(Math.max(...heights) < 160, 'compact tiles ' + width);
    await page.screenshot({
      path: path.join(out, 'screenshots', 'patient-' + width + '.png'),
      fullPage: true,
    });
    results.push('PASS patient layout ' + width + ', tile heights ' + heights.join('/'));
  }
  await page.reload();
  await page.getByRole('heading', { name: 'Ultime consegne' }).waitFor();
  for (const width of [390, 768, 1161, 1575]) {
    await page.setViewportSize({ width, height: 1004 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'no dashboard overflow ' + width,
    );
    await page.screenshot({
      path: path.join(out, 'screenshots', 'dashboard-' + width + '.png'),
      fullPage: true,
    });
    results.push('PASS dashboard layout ' + width);
  }
  failOverview = true;
  await page.reload();
  await page.locator('.turno-handovers [role="alert"]').waitFor();
  assert.match(
    await page.locator('.turno-handovers [role="alert"]').textContent(),
    /Consegne non disponibili/,
  );
  assert.equal(await page.getByText('Nessuna consegna da mostrare.', { exact: true }).count(), 0);
  failOverview = false;
  await page.locator('.turno-handovers').getByRole('button', { name: 'Riprova' }).click();
  await page.getByRole('button', { name: /Apri consegne: 11 consegne critiche/ }).waitFor();
  // Mount the real App too: exercise its authentication shell and diary-event listener.
  taken = false;
  await page.goto('http://127.0.0.1:5187/tests/ux-turno/app.html');
  await page.getByRole('button', { name: /Infermiere Test/ }).click();
  await page.getByRole('button', { name: /Apri consegne: 12 consegne critiche/ }).waitFor();
  taken = true;
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('clinicos:urgency-acknowledged', { detail: { patientId: 'patient-test' } }),
    ),
  );
  await page.getByRole('button', { name: /Apri consegne: 11 consegne critiche/ }).waitFor();
  assert.equal(await page.locator('.teams-sidebar__badge').textContent(), '11');
  await page.getByRole('heading', { name: 'Ultime consegne' }).waitFor();
  for (const width of [390, 768, 1161, 1575]) {
    await page.setViewportSize({ width, height: 1004 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      'real app overflow ' + width,
    );
    await page.locator('.teams-sidebar').evaluate(async (el) => {
      await new Promise(requestAnimationFrame);
      await Promise.all(el.getAnimations().map((animation) => animation.finished));
    });
    if (width < 1024)
      assert.ok(
        (await page.locator('.teams-sidebar').boundingBox()).x +
          (await page.locator('.teams-sidebar').boundingBox()).width <=
          1,
        'closed mobile navigation is off canvas',
      );
    const badgeBox = await page.locator('.topbar-handovers').boundingBox();
    assert.ok(
      badgeBox.x >= 0 && badgeBox.x + badgeBox.width <= width,
      'critical entry remains visible ' + width,
    );
    await page.screenshot({
      path: path.join(out, 'screenshots', 'real-app-' + width + '.png'),
      fullPage: true,
    });
  }
  results.push(
    'PASS real App shell, diary acknowledgement event refreshes both badges, four responsive widths',
  );
  withLateTherapy = true;
  await page.reload();
  await page.getByRole('button', { name: /Infermiere Test/ }).click();
  await page.locator('.adesso-queue__row--terapia-ritardo').waitFor();
  assert.equal(await page.getByText('1 in ritardo', { exact: true }).count(), 1);
  assert.equal(await page.getByText('1 urgenti', { exact: true }).count(), 0);
  assert.match(await page.locator('.adesso-queue__who').first().textContent(), /Cognome Lungo[ ,]+Paziente Test/);
  for (const width of [390, 1161, 1575]) {
    await page.setViewportSize({ width, height: 1004 });
    await page.locator('.teams-sidebar').evaluate(async el => {
      await new Promise(requestAnimationFrame);
      await Promise.all(el.getAnimations().map(animation => animation.finished));
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, 'screenshots', 'real-app-overdue-' + width + '.png'), fullPage: true });
  }
  results.push('PASS real App overdue therapy separate from urgency, patient name and action readable at three widths');
  legacyOverview = true;
  await page.reload();
  await page.getByRole('button', { name: /Infermiere Test/ }).click();
  await page.locator('.turno-handovers [role="alert"]').waitFor();
  assert.equal(await page.getByText('Il modulo non è stato caricato', { exact: false }).count(), 0);
  assert.equal(await page.locator('.topbar-handovers__badge').textContent(), '?');
  results.push('PASS actual App with legacy overview: retryable unavailable, unknown count, no module crash');
  await page.goto('http://127.0.0.1:5187/tests/ux-turno/app.html#/dettaglio-paziente/patient-test');
  await page.getByRole('button', { name: /Infermiere Test/ }).click();
  await page.locator('.patient-record-view .vitals-summary').waitFor();
  await page.locator('.patient-record-view .cr-alert-strip--allergie').waitFor();
  await page.locator('.vitals-summary h2').click();
  for (const width of [768, 1074, 1395]) {
    await page.setViewportSize({ width, height: 1004 });
    const heights = await page.locator('.vitals-summary .vt').evaluateAll(nodes =>
      nodes.map(node => Math.round(node.getBoundingClientRect().height)));
    assert.ok(Math.max(...heights) < 160, 'actual patient compact tiles ' + width);
    const gap = await page.locator('.cr-alert-band').evaluate(node => {
      const next = document.querySelector('.cr-detail-layout');
      return Math.round(next.getBoundingClientRect().top - node.getBoundingClientRect().bottom);
    });
    assert.ok(gap >= 24, 'actual allergy gap ' + width + ': ' + gap);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(out, 'screenshots', 'actual-patient-' + width + '.png'), fullPage: true });
    results.push('PASS actual patient ' + width + ': heights ' + heights.join('/') + ', allergy gap ' + gap);
  }
  const historical = page.locator('[data-entry-id="no-shared-trace"]');
  await historical.waitFor();
  assert.match(await historical.textContent(), /Urgenza storica.*Conferma di lettura condivisa non disponibile/s);
  assert.equal(await historical.getByRole('button', { name: /^Ho capito:/ }).count(), 0);
  assert.match(await historical.textContent(), /Letta da Collega Legacy Test \(OSS\).*registrazione personale/s);
  assert.equal(await page.getByText('Completata', { exact: true }).count(), 0);
  await page.setViewportSize({ width: 1074, height: 1004 });
  const shared = page.locator('[data-entry-id="handover-critical"]');
  await shared.scrollIntoViewIfNeeded();
  assert.match(await shared.textContent(), /Letta e compresa da Infermiere Test.*priorità originale: urgente/s);
  await page.screenshot({ path: path.join(out, 'screenshots', 'actual-diary-1074.png'), fullPage: true });
  await page.locator('.vitals-summary h2').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Espandi ultimi parametri e NEWS2' }).click();
  await page.getByRole('dialog', { name: 'Ultimi parametri e NEWS2' }).waitFor();
  await page.keyboard.press('Escape');
  results.push('PASS actual patient diary historical urgency without fabricated confirmation; expansion/Escape');
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(httpFailures.filter(item => !(item.status === 0 && item.failure?.errorText === 'net::ERR_ABORTED') && !(item.status === 503 && /^http:\/\/localhost:3001\/(consegne\/overview|consegne\/critical\/ack|patients\/[^/]+\/diary\/[^/]+\/ack)$/.test(item.url))), []);
  writeFileSync(path.join(out, 'test-results', 'http.json'), JSON.stringify(httpFailures, null, 2));
  results.push('PASS availability/retry; no unexpected console errors');
} catch (error) {
  console.log(
    await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      wide: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 12)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          right: el.getBoundingClientRect().right,
        })),
        sidebar: document.querySelector('.teams-sidebar') ? getComputedStyle(document.querySelector('.teams-sidebar')).transform : null,
    })),
  );
  results.push('FAIL ' + error.stack);
  await page.screenshot({ path: path.join(out, 'screenshots', 'failure.png'), fullPage: true });
  process.exitCode = 1;
} finally {
  await context.tracing.stop({ path: path.join(out, 'trace', 'ux-turno.zip') });
  writeFileSync(
    path.join(out, 'test-results', 'runtime.json'),
    JSON.stringify({ results, consoleErrors, requests }, null, 2),
  );
  console.log(results.join('\n'));
  await context.close();
  await page.video().saveAs(path.join(out, 'video', 'ux-turno.webm'));
  await browser.close();
}

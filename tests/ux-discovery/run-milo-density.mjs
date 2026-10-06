import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mockApi } from './mock-api.mjs';

const out = 'artifacts/task-validation/milo-density';
const baseline = process.env.BASELINE === '1';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const measurements = {};
try {
  for (const width of [1150, 800, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 884 },
      hasTouch: width < 1150,
      isMobile: width < 1150,
    });
    const state = { requests: [], slotReads: 0, clinicalWrites: 0 };
    await mockApi(context, state);
    const resident = { id: 'patient-test', label: 'Paziente Test' };
    const starters = [
      'Registra una somministrazione per questo ospite',
      'Registra i parametri di questo ospite',
      'Mostrami i parametri recenti di questo ospite',
      'Crea una consegna per questo ospite',
      'Aggiungi un’osservazione nel diario di questo ospite',
      'Come sono le consegne?',
    ].map((label, index) => ({ skillId: `read-${index}`, label, reasons: [] }));
    const signals = Array.from({ length: 5 }, (_, i) => ({
      signalId: `signal-${i}`,
      rev: '1',
      type: 'note',
      eventType: 'note_created',
      priority: i === 0 ? 'urgente' : 'alta',
      priorityRule: 'Fonte sintetica',
      title:
        i === 0 ? 'Urgenza da prendere in carico — scadenza superata' : `Nuova nota sintetica ${i}`,
      detail: 'Monitoraggio · scadenza 2026-10-06 12:00',
      residentId: resident.id,
      residentLabel: resident.label,
      occurredAt: '2026-10-06T06:00:00.000Z',
      origin: 'Medico Test',
      reason: 'Consegna urgente visibile al tuo ruolo, nessuno l’ha ancora presa in carico',
      count: 1,
      sourceEventIds: [],
      status: 'nuovo',
      changedSinceLastView: true,
      action: { kind: 'classic', screen: 'consegne', label: 'Apri la schermata' },
    }));
    await context.route('**/skills/**', (route) => {
      assert.equal(
        route.request().method(),
        'GET',
        'No acknowledgements or clinical actions during visual checks',
      );
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/session')
        ? {
            identity: { id: 'reader', name: 'Medico Test' },
            role: { id: 'medico', label: 'Medico' },
            residentScope: 'all',
            confirmationPolicyVersion: 1,
            resident,
            residentDenied: false,
            skills: [],
            starters,
          }
        : path.endsWith('/home')
          ? {
              role: { id: 'medico', label: 'Medico', copilot: 'Copilota Medico' },
              resident,
              profile: {
                density: 'clinical',
                terminology: { resident: 'Ospite', focus: 'Terapia e attività del turno' },
                sections: ['shortcuts', 'signals', 'starters'],
                signals: { preferredEventTypes: [], defaultTab: 'da-vedere', maxVisible: 5 },
              },
              starters,
              shortcuts: [{ id: 'start', label: 'Inizia il turno', kind: 'start_shift' }],
              continueWork: [],
              recent: [],
            }
          : {
              generatedAt: new Date().toISOString(),
              since: null,
              watermark: null,
              signals,
              counts: { total: 5, toSee: 5, new: 5, changed: 5 },
            };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    const page = await context.newPage();
    await page.goto(
      'http://127.0.0.1:5187/tests/ux-turno/app.html#/dettaglio-paziente/patient-test/dimissione',
    );
    await page.getByRole('button', { name: /Medico Test/ }).click();
    await page
      .getByRole('button', {
        name: 'Apri Milo, assistente clinico AI, a schermo intero',
        exact: true,
      })
      .click();
    await page.getByTestId('am-signal').last().waitFor();
    const metrics = await page.locator('.am').evaluate((root) => {
      const title = root.querySelector('.am-title');
      const subtitle = title.querySelector('small');
      const nameRange = document.createRange();
      nameRange.selectNodeContents(title.firstChild);
      return {
        letterSpacing: getComputedStyle(subtitle).letterSpacing,
        titleBottom: nameRange.getBoundingClientRect().bottom,
        subtitleTop: subtitle.getBoundingClientRect().top,
        signalHeight: root.querySelector('.am-signal').getBoundingClientRect().height,
        proactiveHeight: root.querySelector('.am-proactive').getBoundingClientRect().height,
        overflow: [...root.querySelectorAll('.am-header, .am-title, .am-card, .am-signal')].some(
          (el) => el.scrollWidth > el.clientWidth + 1,
        ),
      };
    });
    measurements[width] = metrics;
    if (!baseline) {
      const previous = existsSync(`${out}/baseline.json`)
        ? JSON.parse(readFileSync(`${out}/baseline.json`, 'utf8'))[width]
        : null;
      assert.ok(metrics.letterSpacing === 'normal' || metrics.letterSpacing === '0px');
      assert.ok(
        metrics.subtitleTop >= metrics.titleBottom,
        'Title and subtitle must occupy separate lines',
      );
      assert.equal(
        metrics.overflow,
        false,
        'Header and signal content must fit without horizontal overflow',
      );
      assert.ok(
        metrics.signalHeight <= (width < 700 ? 220 : 125),
        'Signal cards must remain compact',
      );
      if (previous)
        assert.ok(
          metrics.proactiveHeight < previous.proactiveHeight * 0.85,
          'Panel must be materially smaller without hiding signals',
        );
      assert.equal(await page.getByTestId('am-signal').count(), 5);
      assert.equal(await page.getByTestId('am-signal-open').count(), 5);
      assert.equal(await page.getByTestId('am-signal-ack').count(), 5);
      await page.getByRole('tab', { name: /Cosa è cambiato/ }).click();
      assert.equal(await page.getByTestId('am-signal').count(), 5);
      assert.equal(state.clinicalWrites, 0);
    }
    await page.screenshot({
      path: `${out}/${baseline ? 'before' : 'after'}-${width}.png`,
      fullPage: false,
    });
    await context.close();
  }
  writeFileSync(
    `${out}/${baseline ? 'baseline' : 'candidate'}.json`,
    JSON.stringify(measurements, null, 2),
  );
  console.log(
    baseline
      ? JSON.stringify(measurements)
      : 'PASS: readable Milo header and compact signals at three widths; all details/actions retained and no writes',
  );
} finally {
  await browser.close();
}

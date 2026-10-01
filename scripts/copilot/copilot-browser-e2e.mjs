#!/usr/bin/env node
// Phase 8 browser E2E (Prompt 8 §22–§23): REAL frontend (Vite) + REAL backend + Postgres (+ the AI
// runtime when configured). Role Simulator login, clicks / typing / fake microphone only. DB checks
// read Postgres directly. Voice: Chromium's fake mic feeds a real utterance through the real voice
// panel; only the STT answer is stubbed (Phase 5 covers the provider) so the test controls WHICH
// phrase arrives, and the transcript then takes the same submit path as typed text.
//
//   DATABASE_URL=… node scripts/copilot/copilot-browser-e2e.mjs --front http://127.0.0.1:5199 --out <dir>
//
// Needs: scripts/assistant/seed-assistant-demo.mts (+ scripts/proactive/seed-proactive-demo.mts).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, '..', 'voice', 'fixtures');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const FRONT = opt('--front', 'http://127.0.0.1:5199');
const OUT = opt('--out', 'copilot-e2e-out');
mkdirSync(`${OUT}/screens`, { recursive: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const results = [];
const consoleErrors = [];
const timings = {};
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail: String(detail).slice(0, 300) });
  console.log(
    `${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : `  → ${String(detail).slice(0, 300)}`}`,
  );
}
const resident = (lastName) =>
  prisma.patient.findFirst({
    where: { lastName, medicalRecordNumber: { startsWith: 'DEMO-P4-' } },
  });

const browser = await chromium.launch({
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${join(FIXTURES, 'read-overview.wav')}%noloop`,
  ],
});

async function login(page, identityName) {
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(identityName) })
    .first()
    .click();
  await page.getByTestId('assistant-entry').waitFor({ timeout: 20000 });
}
async function newSession(identityName) {
  const context = await browser.newContext({
    viewport: { width: 1180, height: 900 },
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_ABORTED/.test(m.text()))
      consoleErrors.push(`${identityName}: ${m.text()}`);
  });
  await login(page, identityName);
  return { context, page };
}
async function openAssistant(page) {
  const t0 = Date.now();
  await page.getByTestId('assistant-entry').click();
  await page.getByRole('dialog', { name: 'Assistente AI' }).waitFor();
  await page.getByTestId('am-home').waitFor({ timeout: 20000 });
  return Date.now() - t0;
}
async function logout(page) {
  if (
    await page
      .getByRole('dialog', { name: 'Assistente AI' })
      .isVisible()
      .catch(() => false)
  )
    await page.getByRole('button', { name: /Torna all’applicazione/ }).click();
  await page.getByRole('button', { name: /menu utente/ }).click();
  await page.locator('.topbar-user-menu__logout').click();
}
async function type(page, text) {
  await page.getByLabel('Messaggio per l’assistente').fill(text);
  await page.getByLabel('Messaggio per l’assistente').press('Enter');
}
const idle = (page) =>
  page.waitForFunction(() => !document.querySelector('[data-testid="am-loading"]'), null, {
    timeout: 30000,
  });
const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });
const homeText = (page) => page.getByTestId('am-home').innerText();

try {
  const [galli, verdi] = await Promise.all(['Galli', 'Verdi'].map(resident));
  check('fixtures present', galli && verdi);

  // ── A + usability — OSS copilot: authorized items only, large targets, round, voice ──
  {
    const { context, page } = await newSession('OSS 1');
    timings.ossHomeMs = await openAssistant(page);
    const h = await homeText(page);
    check(
      'A OSS home is the OSS copilot',
      (await page.getByTestId('am-home').getAttribute('data-role')) === 'oss' &&
        /Copilota OSS/.test(h),
      h.slice(0, 120),
    );
    check(
      'A OSS shortcuts: turno + giro parametri',
      /Inizia il turno/.test(h) && /Inizia giro parametri/.test(h),
    );
    const starters = await page.getByTestId('am-starters').locator('button').allInnerTexts();
    check(
      'A OSS starters ≤ 4 and no therapy / prescription',
      starters.length > 0 &&
        starters.length <= 4 &&
        !starters.some((s) => /somministraz|prescri/i.test(s)),
      starters.join(' | '),
    );
    const box = await page.getByTestId('am-shortcut-round_vitals').boundingBox();
    check(
      'usability: OSS large action targets (≥ 52 px)',
      box && box.height >= 52,
      JSON.stringify(box),
    );
    await shot(page, 'A-oss-home');

    // Composite «Inizia giro parametri»: scoped list → resident → existing skill → preview → button.
    await page.getByTestId('am-shortcut-round_vitals').click();
    await page.getByTestId('am-round-list').waitFor({ timeout: 15000 });
    const list = await page.getByTestId('am-round-list').innerText();
    check(
      'round: only residents in the OSS scope',
      /Verdi Olga/.test(list) && !/Galli|Conti|Neri/.test(list),
      list,
    );
    await page
      .getByTestId('am-round-list')
      .getByRole('button', { name: /Verdi Olga/ })
      .click();
    await page.getByTestId('am-resident-name').getByText('Verdi Olga').waitFor({ timeout: 10000 });
    check(
      'round: resident context evident',
      (await page.getByTestId('am-round-current').innerText()).includes('Verdi Olga'),
    );
    const before = await prisma.patientParameterReading.count({ where: { patientId: verdi.id } });
    await page.getByTestId('am-round-steps').getByRole('button').first().click();
    await idle(page);
    if (!(await page.getByTestId('am-confirm').count())) {
      await type(page, 'pressione 124/79');
      await idle(page);
    }
    await page.getByTestId('am-confirm').waitFor({ timeout: 20000 });
    check(
      'round step → preview, nothing written yet',
      (await prisma.patientParameterReading.count({ where: { patientId: verdi.id } })) === before,
    );
    await page.getByTestId('am-confirm').click();
    await page.getByTestId('am-result').waitFor({ timeout: 20000 });
    check(
      'round step → one write after «Conferma»',
      (await prisma.patientParameterReading.count({ where: { patientId: verdi.id } })) ===
        before + 1,
    );
    await shot(page, 'A-oss-round');
    await page.getByTestId('am-round-close').click();
    await page.getByTestId('am-round').waitFor({ state: 'detached', timeout: 10000 });
    check(
      'round closed, resident context cleared',
      !/Verdi Olga/.test(await page.getByTestId('am-resident').innerText()),
    );

    // Text phrase → shortcut (start shift opens the briefing on the shared panel).
    await type(page, 'inizia il turno');
    await page.getByTestId('am-briefing-period').waitFor({ timeout: 60000 });
    check('typed «inizia il turno» → shift briefing (same Phase 7 engine)', true);

    // J — voice converges on the same path: the dictated phrase starts the same shortcut.
    await page.route('**/skills/voice/transcribe', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'iniziamo il giro',
          locale: 'it-IT',
          confidence: null,
          timestamps: [],
          empty: false,
          metadata: { provider: 'stub', model: 'stub', durationMs: 900, roundTripMs: 10 },
        }),
      }),
    );
    if (await page.getByTestId('am-mic').count()) {
      await page.getByTestId('am-mic').click();
      await page.getByTestId('am-voice-transcript').waitFor({ timeout: 45000 });
      check(
        'voice transcript shown for review',
        (await page.getByTestId('am-voice-transcript').inputValue()) === 'iniziamo il giro',
      );
      await page.getByTestId('am-voice-send').click();
      await page.getByTestId('am-round').waitFor({ timeout: 15000 });
      check('J dictated «iniziamo il giro» → the same round shortcut as text', true);
      // The voice channel is handed back after a shortcut that opened a panel (QA finding).
      const micFree = await page
        .waitForFunction(
          () => {
            const mic = document.querySelector('[data-testid="am-mic"]');
            return (
              mic &&
              !mic.hasAttribute('disabled') &&
              mic.getAttribute('data-state') !== 'PROCESSING'
            );
          },
          null,
          { timeout: 10000 },
        )
        .then(() => true)
        .catch(() => false);
      check('J mic usable again after the voice shortcut', micFree);
      await page.getByTestId('am-round-close').click();
    } else check('J voice channel available for OSS', false, 'am-mic missing');
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    // F — role switch OSS → Doctor → Supervisor in the same browser: nothing carried over.
    await logout(page);
    await login(page, 'Medico 1');
    await openAssistant(page);
    const d = await homeText(page);
    check(
      'F after switch: doctor copilot',
      /Copilota Medico/.test(d) &&
        /Prepara visita/.test(d) &&
        !/Copilota OSS|Inizia giro parametri/.test(d),
      d.slice(0, 160),
    );
    check(
      'F no OSS resident / round left over',
      !(await page.getByTestId('am-round').count()) &&
        !/Verdi Olga/.test(await page.getByTestId('am-resident').innerText()),
    );
    await shot(page, 'F-doctor-home');
    // C — doctor: «Prepara visita» → overview (read, sources) → no write.
    const neri = await resident('Neri');
    await page.getByTestId('am-shortcut-prepare_visit').click();
    await page
      .getByTestId('am-round-list')
      .getByRole('button', { name: /Neri Dario/ })
      .click();
    await page.getByTestId('am-resident-name').getByText('Neri Dario').waitFor({ timeout: 10000 });
    const tBefore = await prisma.patientTherapy.count({ where: { patientId: neri.id } });
    await page.getByTestId('am-round-steps').getByRole('button').first().click();
    await idle(page);
    check(
      'C doctor overview answered (read, no confirmation)',
      (await page.getByTestId('am-confirm').count()) === 0 &&
        /Neri/.test(await page.getByTestId('am-transcript').innerText()),
    );
    check(
      'C no therapy written by the copilot',
      (await prisma.patientTherapy.count({ where: { patientId: neri.id } })) === tBefore,
    );
    await page.getByTestId('am-round-close').click();
    await logout(page);
    await login(page, 'Supervisore 1');
    await openAssistant(page);
    const s = await homeText(page);
    check(
      'F then supervisor copilot',
      /Copilota Supervisore/.test(s) && /Briefing struttura/.test(s) && !/Prepara visita/.test(s),
    );
    // D — supervisor briefing (facility scope).
    await page.getByTestId('am-shortcut-facility_briefing').click();
    await page.getByTestId('am-briefing-summary').waitFor({ timeout: 60000 });
    const brief = await page.getByTestId('am-briefing').innerText();
    check(
      'D supervisor briefing aggregates the facility',
      /Galli Nora/.test(brief) || /Neri Dario/.test(brief),
      brief.slice(0, 200),
    );
    await shot(page, 'D-supervisor-briefing');
    await context.close();
  }

  // ── B — nurse: starter → preview → confirmation → backend → audit ──
  {
    const { context, page } = await newSession('Infermiere 1');
    await openAssistant(page);
    const h = await homeText(page);
    check(
      'B nurse copilot: therapy round + due administrations',
      /Copilota Infermiere/.test(h) && /Inizia giro terapia/.test(h),
    );
    await page.getByTestId('am-shortcut-round_therapy').click();
    await page
      .getByTestId('am-round-list')
      .getByRole('button', { name: /Galli Nora/ })
      .click();
    await page.getByTestId('am-resident-name').getByText('Galli Nora').waitFor({ timeout: 10000 });
    const steps = await page.getByTestId('am-round-steps').locator('button').allInnerTexts();
    check(
      'B round steps are existing skills of the nurse',
      steps.some((x) => /somministrazione/i.test(x)) && steps.some((x) => /parametri/i.test(x)),
      steps.join(' | '),
    );
    const before = await prisma.patientParameterReading.count({ where: { patientId: galli.id } });
    await page
      .getByTestId('am-round-steps')
      .getByRole('button', { name: /parametri/i })
      .first()
      .click();
    await idle(page);
    if (!(await page.getByTestId('am-confirm').count())) {
      await type(page, 'pressione 121/77');
      await idle(page);
    }
    await page.getByTestId('am-confirm').click();
    await page.getByTestId('am-result').waitFor({ timeout: 20000 });
    check(
      'B one write after the human confirmation',
      (await prisma.patientParameterReading.count({ where: { patientId: galli.id } })) ===
        before + 1,
    );
    const audit = await prisma.aiAuditEvent.findFirst({
      where: {
        operatorId: 'SIM-NURSE-1',
        actionType: 'skill:vitals.record:execute',
        outcome: 'ok',
      },
      orderBy: { createdAt: 'desc' },
    });
    check('B audited (execute ok, nurse role)', audit?.operatorRole === 'nurse');
    await page.getByTestId('am-round-close').click();
    // Continue work: a pending preview survives closing the assistant and is offered again.
    await type(page, 'registra pressione 133/83 per Galli Nora');
    await idle(page);
    await page.getByTestId('am-confirm').waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: /Torna all’applicazione/ }).click();
    await openAssistant(page);
    await page.getByTestId('am-continue').waitFor({ timeout: 10000 });
    await page.getByTestId('am-continue').getByRole('button').first().click();
    await page.getByTestId('am-confirm').waitFor({ timeout: 10000 });
    check('continue work reopens the preview, still needing «Conferma»', true);
    await shot(page, 'B-nurse-continue');
    await page.getByTestId('am-cancel').click();
    await context.close();
  }

  // ── E — administrator ──
  {
    const { context, page } = await newSession('Amministratore');
    await openAssistant(page);
    const h = await homeText(page);
    check(
      'E administrator copilot: configuration, no clinical starters',
      /Copilota Amministratore/.test(h) &&
        /Controlla configurazione ruoli/.test(h) &&
        !/consegne|parametri|diario|somministraz|ospite/i.test(h),
      h.slice(0, 200),
    );
    await page.getByTestId('am-shortcut-roles').click();
    await page
      .getByRole('dialog', { name: 'Assistente AI' })
      .waitFor({ state: 'detached', timeout: 10000 });
    const opened = await page
      .waitForFunction(
        () => document.querySelector('.topbar-title')?.textContent?.includes('Ruoli e permessi'),
        null,
        { timeout: 10000 },
      )
      .then(() => true)
      .catch(() => false);
    check('E classic screen shortcut opens «Ruoli e permessi» (GUI still available)', opened);
    await shot(page, 'E-admin-roles');
    await context.close();
  }
} catch (error) {
  check('script completed without exceptions', false, error?.stack ?? String(error));
} finally {
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' || '));
  await prisma.$disconnect();
  await browser.close();
  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    `${OUT}/copilot-browser-e2e.json`,
    `${JSON.stringify({ at: new Date().toISOString(), passed, failed: results.length - passed, results, timings, consoleErrors }, null, 2)}\n`,
  );
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}

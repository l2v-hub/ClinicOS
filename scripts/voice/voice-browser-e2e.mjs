#!/usr/bin/env node
// Phase 5 browser E2E (Prompt 5 §16 A–M): REAL frontend (Vite) + REAL backend + Postgres + the AI
// runtime with the REAL STT provider (AI_STT_MODEL) and the Agno skill router. Audio enters through
// Chromium's fake microphone fed with WAV fixtures (scripts/voice/fixtures) — the same
// getUserMedia → AudioContext → VAD → WAV → /skills/voice/transcribe path as a real tablet mic.
// Chromium restarts the fake-mic file at every getUserMedia, so a SECOND utterance in the same page
// («conferma», duplicate submit) is fed by a MediaStream built from another fixture (init script
// below); everything after the stream is identical. DB checks read Postgres directly.
//
//   DATABASE_URL=… node scripts/voice/voice-browser-e2e.mjs \
//     --front http://127.0.0.1:5199 --api http://127.0.0.1:3099 --out <dir>
//
// Needs: seed-assistant-demo.mts + seed-voice-demo.mts; backend with VOICE_CHANNEL_ENABLED=true.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, 'fixtures');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const FRONT = opt('--front', 'http://127.0.0.1:5199');
const API = opt('--api', 'http://127.0.0.1:3099');
const OUT = opt('--out', 'voice-e2e-out');
mkdirSync(`${OUT}/screens`, { recursive: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const results = [];
const consoleErrors = [];
const timings = [];
const sttMisses = [];
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail: String(detail).slice(0, 300) });
  console.log(
    `${condition ? 'PASS' : 'FAIL'}  ${name}${condition ? '' : `  → ${String(detail).slice(0, 300)}`}`,
  );
}
const resident = (firstName, lastName) =>
  prisma.patient.findFirst({
    where: { firstName, lastName, medicalRecordNumber: { startsWith: 'DEMO-P' } },
  });
const readings = (patientId) => prisma.patientParameterReading.count({ where: { patientId } });

// Voice state log (data-state of the voice panel / mic) + second-utterance injection.
const INIT = () => {
  window.__voiceLog = [];
  let last = '';
  const record = () => {
    const el = document.querySelector('[data-testid="am-voice"]');
    const mic = document.querySelector('[data-testid="am-mic"]');
    const state = el?.getAttribute('data-state') ?? mic?.getAttribute('data-state') ?? 'NONE';
    if (state !== last) {
      last = state;
      window.__voiceLog.push({ state, t: performance.now() });
    }
  };
  new MutationObserver(record).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-state'],
  });
  window.__voiceFixture = null;
  const devices = navigator.mediaDevices;
  if (!devices?.getUserMedia) return;
  const real = devices.getUserMedia.bind(devices);
  // Every stream handed to the page is recorded (to prove the mic is released) and an optional
  // delay simulates a slow permission prompt.
  window.__streams = [];
  window.__gumDelay = 0;
  devices.getUserMedia = async (constraints) => {
    if (window.__gumDelay) await new Promise((r) => setTimeout(r, window.__gumDelay));
    const stream = await fixtureOrDevice(constraints);
    window.__streams.push(stream);
    return stream;
  };
  const fixtureOrDevice = async (constraints) => {
    const url = window.__voiceFixture;
    if (!url) return real(constraints);
    window.__voiceFixture = null;
    const ctx = new AudioContext();
    const data = await (await fetch(url)).arrayBuffer();
    const buffer = await ctx.decodeAudioData(data);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const dest = ctx.createMediaStreamDestination();
    source.connect(dest);
    source.start();
    const track = dest.stream.getAudioTracks()[0];
    const stop = track.stop.bind(track);
    track.stop = () => {
      stop();
      try {
        source.stop();
      } catch {
        /* ended */
      }
      void ctx.close();
    };
    return dest.stream;
  };
};

async function launch(fixture, { grantMic = true } = {}) {
  const flags = [
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ];
  if (grantMic) flags.push('--use-fake-ui-for-media-stream');
  if (fixture) flags.push(`--use-file-for-fake-audio-capture=${join(FIXTURES, fixture)}%noloop`);
  return chromium.launch({ args: flags });
}

async function session(browser, identityName, viewport = { width: 1180, height: 820 }) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript(INIT);
  await page.route('**/__voice-fixtures/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      body: readFileSync(join(FIXTURES, route.request().url().split('/').pop())),
    }),
  );
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_ABORTED/.test(m.text()))
      consoleErrors.push(`${identityName}: ${m.text()}`);
  });
  const traffic = { transcribe: 0, converse: [] };
  page.on('request', (req) => {
    if (req.url().includes('/skills/voice/transcribe')) traffic.transcribe += 1;
    if (req.url().includes('/skills/converse') && req.method() === 'POST')
      traffic.converse.push(JSON.parse(req.postData() || '{}'));
  });
  await page.goto(FRONT);
  await page
    .getByRole('button', { name: new RegExp(identityName) })
    .first()
    .click();
  await page.getByTestId('assistant-entry').waitFor({ timeout: 20000 });
  return { context, page, traffic };
}

async function openAssistant(page) {
  await page.getByTestId('assistant-entry').click();
  await page.getByRole('dialog', { name: 'Assistente AI' }).waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-testid="am-identity"]')?.textContent?.includes('Caricamento'),
  );
  // Voice status loaded → mic enabled.
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="am-mic"]')?.getAttribute('data-state') !==
      'UNAVAILABLE',
    null,
    { timeout: 10000 },
  );
}

async function pickResident(page, query, label) {
  await page.getByRole('button', { name: 'Cambia ospite' }).click();
  await page.getByLabel('Cerca ospite').fill(query);
  const item = page.locator('.am-picker__item', { hasText: label });
  await item.first().waitFor({ timeout: 10000 });
  await item.first().click();
  await page.getByTestId('am-resident-name').getByText(label).waitFor();
}

const voiceState = (page) =>
  page.evaluate(
    () =>
      document.querySelector('[data-testid="am-voice"]')?.getAttribute('data-state') ??
      document.querySelector('[data-testid="am-mic"]')?.getAttribute('data-state'),
  );

/** Press the mic and wait until the utterance is resolved (transcript / discarded / error). */
async function speak(page, label, { inject } = {}) {
  if (inject)
    await page.evaluate((f) => (window.__voiceFixture = `/__voice-fixtures/${f}`), inject);
  await page.evaluate(() => (window.__voiceLog = []));
  await page.getByTestId('am-mic').click();
  await page.waitForFunction(
    () => {
      const log = window.__voiceLog.map((e) => e.state);
      const listened = log.includes('LISTENING');
      const s = document.querySelector('[data-testid="am-voice"]')?.getAttribute('data-state');
      return listened && ['TRANSCRIPT_READY', 'IDLE', 'ERROR', 'CANCELLED'].includes(s ?? 'IDLE');
    },
    null,
    { timeout: 45000 },
  );
  const log = await page.evaluate(() => window.__voiceLog);
  const at = (s) => log.find((e) => e.state === s)?.t;
  const entry = {
    label,
    captureEndToTranscriptMs:
      at('TRANSCRIPT_READY') && at('TRANSCRIBING')
        ? Math.round(at('TRANSCRIPT_READY') - at('TRANSCRIBING'))
        : null,
    states: log.map((e) => e.state).join('>'),
  };
  timings.push(entry);
  const state = await voiceState(page);
  const transcript =
    state === 'TRANSCRIPT_READY' ? await page.getByTestId('am-voice-transcript').inputValue() : '';
  return { state, transcript, log: entry.states };
}

/** Runs a UI action and returns the LAST /skills/converse answer + its duration. */
async function turn(page, action, label) {
  const bodies = [];
  const listener = (res) => {
    if (res.url().includes('/skills/converse')) bodies.push(res.json().catch(() => ({})));
  };
  page.on('response', listener);
  const t0 = Date.now();
  try {
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/skills/converse'), { timeout: 60000 }),
      action(),
    ]);
    await page.waitForFunction(() => !document.querySelector('[data-testid="am-loading"]'), null, {
      timeout: 60000,
    });
    await page.waitForTimeout(200);
  } finally {
    page.off('response', listener);
  }
  if (label) timings.push({ label, uiTurnMs: Date.now() - t0 });
  return (await Promise.all(bodies)).at(-1) ?? {};
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${name}.png` });

async function waitAudit(where, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const row = await prisma.aiAuditEvent.findFirst({ where, orderBy: { createdAt: 'desc' } });
    if (row || Date.now() > deadline) return row;
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function adminPolicy(role, capability, effect, note) {
  const token = (
    await (
      await fetch(`${API}/auth/simulator/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityId: 'SIM-ADMIN' }),
      })
    ).json()
  ).token;
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const current = await (await fetch(`${API}/authz/policy`, { headers: auth })).json();
  const document = structuredClone(current.active.document);
  document.grants[role][capability] = effect;
  const saved = await fetch(`${API}/authz/policy/versions`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ document, basedOnVersion: current.active.version, note, apply: true }),
  });
  return saved.status;
}

const started = new Date();
const galli = await resident('Nora', 'Galli');
const neri = await resident('Dario', 'Neri');
const ferri = [await resident('Marta', 'Ferri'), await resident('Marco', 'Ferri')];
const esposito = await resident('Bruno', 'Esposito');

try {
  // ── A — Doctor push-to-talk read ─────────────────────────────────────────────────────────
  {
    const browser = await launch('read-overview.wav');
    const { page, traffic } = await session(browser, 'Medico 1');
    await openAssistant(page);
    await pickResident(page, 'Neri', 'Neri Dario');
    check('A mic idle and evident before use', (await voiceState(page)) === 'IDLE');
    const heard = await speak(page, 'A read');
    check(
      'A mic → LISTENING → SPEECH_ACTIVE → TRANSCRIBING → TRANSCRIPT_READY',
      /LISTENING>SPEECH_ACTIVE>TRANSCRIBING>TRANSCRIPT_READY/.test(heard.log),
      heard.log,
    );
    check(
      'A transcript from the real STT',
      /dimmi tutto/i.test(heard.transcript),
      heard.transcript,
    );
    check('A nothing sent to the Assistant before «Invia»', traffic.converse.length === 0);
    await shot(page, 'A-transcript-review');
    const r = await turn(
      page,
      () => page.getByTestId('am-voice-send').click(),
      'A transcript→result',
    );
    check(
      'A read skill COMPLETED',
      r.status === 'COMPLETED' && r.skillId === 'patient.overview',
      JSON.stringify(r).slice(0, 200),
    );
    check(
      'A chat marks the user message as dictated by voice',
      (await page.getByTestId('am-msg-voice').count()) === 1,
    );
    check(
      'A request carried inputChannel=voice',
      traffic.converse.at(-1)?.inputChannel === 'voice',
    );
    check('A interpreted by Agno', r.interpreter === 'agno', r.interpreter);
    check('A voice state COMPLETED', (await voiceState(page)) === 'COMPLETED');
    check(
      'A audit: voice:transcribe (channel voce) + skill request with input:voice',
      Boolean(
        await waitAudit({
          operatorId: 'SIM-DOCTOR-1',
          actionType: 'voice:transcribe',
          outcome: 'ok',
          createdAt: { gte: started },
        }),
      ) &&
        Boolean(
          await waitAudit({
            operatorId: 'SIM-DOCTOR-1',
            actionType: 'skill:patient.overview:request',
            fields: { has: 'input:voice' },
            createdAt: { gte: started },
          }),
        ),
    );
    await shot(page, 'A-read-result');
    await browser.close();
  }

  // ── B + K — Nurse voice write: preview, zero write, spoken «conferma» ≠ confirm, one write ──
  {
    const browser = await launch('vitals-120-80.wav');
    const { page, traffic } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const before = await readings(galli.id);
    const heard = await speak(page, 'B write');
    check(
      'B transcript «pressione 120 su 80»',
      /pressione.*120.*80/i.test(heard.transcript),
      heard.transcript,
    );
    const sendsBefore = traffic.converse.length;
    const draft = await turn(
      page,
      () => page.getByTestId('am-voice-send').dblclick(),
      'B transcript→preview',
    );
    check(
      'K double «Invia» → one Assistant request',
      traffic.converse.length - sendsBefore === 1,
      traffic.converse.length - sendsBefore,
    );
    check(
      'B preview NEEDS_CONFIRMATION 120/80',
      draft.status === 'NEEDS_CONFIRMATION' && draft.preview?.values?.Pressione === '120/80',
      JSON.stringify(draft).slice(0, 240),
    );
    check('B preview targets the context resident', draft.preview?.patient?.id === galli.id);
    check('B zero write before confirmation', (await readings(galli.id)) === before);
    check(
      'B voice AWAITING_CONFIRMATION + button-only hint',
      (await voiceState(page)) === 'AWAITING_CONFIRMATION' &&
        (await page.getByTestId('am-voice-confirm-hint').count()) === 1,
    );
    await shot(page, 'B-preview');

    const yes = await speak(page, 'B spoken conferma', { inject: 'conferma.wav' });
    check('B spoken «conferma» transcribed', /conferma/i.test(yes.transcript), yes.transcript);
    const spoken = await turn(
      page,
      () => page.getByTestId('am-voice-send').click(),
      'B spoken conferma',
    );
    check(
      'B spoken «conferma» does NOT confirm',
      spoken.status === 'NEEDS_CONFIRMATION' && /Conferma/.test(spoken.reply ?? ''),
      JSON.stringify(spoken).slice(0, 200),
    );
    check(
      'B chat shows the server hint (press «Conferma»), not a new preview',
      /premi «Conferma»/.test(await page.getByTestId('am-transcript').innerText()),
    );
    check('B still zero write', (await readings(galli.id)) === before);
    await shot(page, 'B-spoken-conferma-refused');

    const done = await turn(
      page,
      () => page.getByTestId('am-confirm').dblclick(),
      'B confirm→backend result',
    );
    check(
      'B UI «Conferma» → COMPLETED',
      done.status === 'COMPLETED',
      JSON.stringify(done).slice(0, 200),
    );
    await page.waitForTimeout(800);
    check(
      'K double «Conferma» → exactly one write',
      (await readings(galli.id)) === before + 1,
      `${before} → ${await readings(galli.id)}`,
    );
    const row = await prisma.patientParameterReading.findFirst({
      where: { patientId: galli.id },
      orderBy: { createdAt: 'desc' },
    });
    check(
      'B written values are the previewed ones',
      row?.values?.pa === '120/80',
      JSON.stringify(row).slice(0, 200),
    );
    check(
      'B audit execute ok',
      Boolean(
        await waitAudit({
          operatorId: 'SIM-NURSE-1',
          actionType: 'skill:vitals.record:execute',
          outcome: 'ok',
          createdAt: { gte: started },
        }),
      ),
    );
    check('B voice state COMPLETED', (await voiceState(page)) === 'COMPLETED');
    await shot(page, 'B-completed');
    await browser.close();
  }

  // ── C — Ambiguous resident: clarification, zero write ────────────────────────────────────
  {
    const browser = await launch('ambiguous-ferri.wav');
    const { page } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    const before = await Promise.all(ferri.map((p) => readings(p.id)));
    // The user re-records («Parla» again) when the transcript is wrong — real STT sometimes
    // mishears the synthetic voice (observed: «per Ferri» → «perfetti»). Misses are recorded.
    let heard = await speak(page, 'C ambiguous');
    for (let attempt = 2; attempt <= 3 && !/ferri/i.test(heard.transcript); attempt += 1) {
      sttMisses.push({ scenario: 'C', transcript: heard.transcript });
      heard = await speak(page, `C ambiguous (retry ${attempt})`);
    }
    check('C transcript names Ferri (after «Ripeti» if misheard)', /ferri/i.test(heard.transcript), heard.transcript);
    const r = await turn(
      page,
      () => page.getByTestId('am-voice-send').click(),
      'C transcript→clarification',
    );
    const candidates = (r.candidates ?? []).map((c) => c.label).join(' | ');
    check(
      'C NEEDS_CLARIFICATION with both Ferri',
      r.status === 'NEEDS_CLARIFICATION' &&
        /Ferri Marta/.test(candidates) &&
        /Ferri Marco/.test(candidates),
      `${r.status} ${candidates} ${r.reply}`,
    );
    check(
      'C no preview, zero write',
      !r.preview &&
        (await Promise.all(ferri.map((p) => readings(p.id)))).every((n, i) => n === before[i]),
    );
    await shot(page, 'C-ambiguous');
    await browser.close();
  }

  // ── D — Prescription / administration: proposal only ─────────────────────────────────────
  {
    const browser = await launch('prescribe.wav');
    const { page } = await session(browser, 'Medico 1');
    await openAssistant(page);
    await pickResident(page, 'Neri', 'Neri Dario');
    const before = await prisma.patientTherapy.count({ where: { patientId: neri.id } });
    const heard = await speak(page, 'D prescribe');
    check(
      'D transcript: paracetamolo 1000 mg',
      /paracetamolo/i.test(heard.transcript) && /1000|mille/i.test(heard.transcript),
      heard.transcript,
    );
    const r = await turn(
      page,
      () => page.getByTestId('am-voice-send').click(),
      'D transcript→prescription preview',
    );
    check(
      'D prescription only proposed (HIGH_RISK preview)',
      r.status === 'NEEDS_CONFIRMATION' && r.preview?.confirmationClass === 'HIGH_RISK',
      JSON.stringify(r).slice(0, 240),
    );
    await page.waitForTimeout(1500);
    check(
      'D zero therapy written without the button',
      (await prisma.patientTherapy.count({ where: { patientId: neri.id } })) === before,
    );
    await shot(page, 'D-prescription-preview');
    const cancel = await turn(page, () => page.getByTestId('am-cancel').click());
    check(
      'D cancel → CANCELLED, zero write',
      cancel.status === 'CANCELLED' &&
        (await prisma.patientTherapy.count({ where: { patientId: neri.id } })) === before,
    );
    await browser.close();
  }
  {
    const browser = await launch('administration.wav');
    const { page } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Ferri', 'Ferri Marta');
    const admins = () => prisma.medicationAdministration.count({ where: { patientId: ferri[0].id } });
    const before = await admins();
    const heard = await speak(page, 'D administration');
    check(
      'D administration transcript',
      /somministrazione/i.test(heard.transcript),
      heard.transcript,
    );
    let r = await turn(
      page,
      () => page.getByTestId('am-voice-send').click(),
      'D transcript→administration',
    );
    if (r.status === 'NEEDS_CLARIFICATION' && r.candidates?.length)
      r = await turn(page, () =>
        page.getByTestId('am-candidates').locator('button').first().click(),
      );
    check(
      'D administration only prepared (preview, not executed)',
      r.status === 'NEEDS_CONFIRMATION' && r.preview?.confirmationClass === 'HIGH_RISK',
      JSON.stringify(r).slice(0, 200),
    );
    check('D zero administration written', (await admins()) === before);
    await shot(page, 'D-administration-prepared');
    await browser.close();
  }

  // ── E — Transcript correction: the workflow uses the corrected value ─────────────────────
  {
    const browser = await launch('vitals-140-90.wav');
    const { page } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const before = await readings(galli.id);
    const heard = await speak(page, 'E correction');
    check('E heard 140/90', /140.*90/.test(heard.transcript), heard.transcript);
    await page
      .getByTestId('am-voice-transcript')
      .fill('Registra pressione 135 su 85 per questo ospite.');
    const r = await turn(
      page,
      () => page.getByTestId('am-voice-send').click(),
      'E corrected transcript→preview',
    );
    check(
      'E preview uses the corrected value 135/85',
      r.preview?.values?.Pressione === '135/85',
      JSON.stringify(r.preview?.values),
    );
    check('E zero write', (await readings(galli.id)) === before);
    await shot(page, 'E-corrected-preview');
    await turn(page, () => page.getByTestId('am-cancel').click());
    await browser.close();
  }

  // ── F — Cancel: transcript discarded / listening stopped → nothing sent, zero write ──────
  {
    const browser = await launch('vitals-120-80.wav');
    const { page, traffic } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const before = await readings(galli.id);
    await speak(page, 'F review');
    await page.getByTestId('am-voice-discard').click();
    check('F «Annulla» on the transcript → CANCELLED', (await voiceState(page)) === 'CANCELLED');
    check('F nothing sent to the Assistant', traffic.converse.length === 0);
    const calls = traffic.transcribe;
    await page.getByTestId('am-mic').click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="am-mic"]')?.getAttribute('aria-pressed') === 'true',
    );
    await page.getByTestId('am-voice-cancel').click();
    await page.waitForTimeout(2500);
    check(
      'F cancel while listening → mic released, no audio sent',
      traffic.transcribe === calls && (await voiceState(page)) === 'CANCELLED',
      `${traffic.transcribe} ${await voiceState(page)}`,
    );
    check('F zero write', (await readings(galli.id)) === before);
    await shot(page, 'F-cancelled');
    await browser.close();
  }

  // ── QA H1 — resident change WHILE listening: mic stopped, audio never uploaded ──────────
  {
    const browser = await launch('prescribe.wav');
    const { page, traffic } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    await page.getByTestId('am-mic').click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="am-mic"]')?.getAttribute('aria-pressed') === 'true',
    );
    await pickResident(page, 'Conti', 'Conti Nino');
    await page.waitForTimeout(8000); // longer than the fixture: a live capture would have uploaded
    check(
      'H1 resident change while listening → CANCELLED, 0 audio uploaded',
      (await voiceState(page)) === 'CANCELLED' && traffic.transcribe === 0,
      `${await voiceState(page)} transcribe=${traffic.transcribe}`,
    );
    check(
      'H1 every mic track stopped',
      await page.evaluate(() =>
        window.__streams.length >= 1 &&
        window.__streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
      ),
    );
    await browser.close();
  }

  // ── QA H1 — cancel while the permission prompt is pending: the mic never opens ──────────
  {
    const browser = await launch('vitals-120-80.wav');
    const { page, traffic } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await page.evaluate(() => (window.__gumDelay = 2500));
    await page.getByTestId('am-mic').click();
    await page.getByTestId('am-voice-cancel').click();
    await page.waitForTimeout(7000);
    check(
      'H1 cancel during the permission prompt → no audio uploaded',
      traffic.transcribe === 0 && (await voiceState(page)) === 'CANCELLED',
      `${await voiceState(page)} transcribe=${traffic.transcribe}`,
    );
    check(
      'H1 the late stream is stopped immediately (mic never left open)',
      await page.evaluate(
        () =>
          window.__streams.length === 1 &&
          window.__streams[0].getTracks().every((t) => t.readyState === 'ended'),
      ),
    );
    await browser.close();
  }

  // ── QA M4 — speech right at the tap (no leading silence) is not lost ───────────────────
  {
    const browser = await launch('vitals-120-80-nolead.wav');
    const { page } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    const heard = await speak(page, 'M4 no leading silence');
    check(
      'M4 speech starting at the tap is transcribed in full',
      heard.state === 'TRANSCRIPT_READY' && /registra.*pressione.*120.*80/i.test(heard.transcript),
      `${heard.state} ${heard.transcript}`,
    );
    await browser.close();
  }

  // ── G — Policy revocation between preview and confirmation → DENIED ──────────────────────
  {
    const browser = await launch('vitals-120-80.wav');
    const { page } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const before = await readings(galli.id);
    await speak(page, 'G voice');
    const draft = await turn(page, () => page.getByTestId('am-voice-send').click());
    check('G preview ready', draft.status === 'NEEDS_CONFIRMATION');
    const revoked = await adminPolicy(
      'nurse',
      'parameters.create_reading',
      'DENIED',
      'e2e voce revoca',
    );
    try {
      check('G policy revoked (201)', revoked === 201, revoked);
      const denied = await turn(
        page,
        () => page.getByTestId('am-confirm').click(),
        'G confirm after revoke',
      );
      check(
        'G confirm after revocation → DENIED',
        denied.status === 'DENIED',
        JSON.stringify(denied).slice(0, 200),
      );
      check('G zero write', (await readings(galli.id)) === before);
      check('G voice state ERROR (no false success)', (await voiceState(page)) === 'ERROR');
      await shot(page, 'G-revoked');
    } finally {
      await adminPolicy('nurse', 'parameters.create_reading', 'ALLOWED', 'e2e voce ripristino');
    }
    await browser.close();
  }

  // ── H — Resident outside the nurse's scope → no preview, zero write ──────────────────────
  {
    const browser = await launch('out-of-scope.wav');
    const { page } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const before = [await readings(esposito.id), await readings(galli.id)];
    const heard = await speak(page, 'H out of scope');
    check('H transcript names Esposito', /esposito/i.test(heard.transcript), heard.transcript);
    const r = await turn(
      page,
      () => page.getByTestId('am-voice-send').click(),
      'H transcript→denial',
    );
    check(
      'H no preview for an out-of-scope resident (never re-targeted to the context)',
      r.status !== 'NEEDS_CONFIRMATION' && r.status !== 'COMPLETED',
      JSON.stringify(r).slice(0, 240),
    );
    check(
      'H zero write (Esposito and context resident)',
      (await readings(esposito.id)) === before[0] && (await readings(galli.id)) === before[1],
    );
    await shot(page, 'H-out-of-scope');
    await browser.close();
  }

  // ── I — STT failure + mic permission denied → clear error, text fallback works ───────────
  {
    const browser = await launch('vitals-120-80.wav');
    const { page } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    await page.route('**/skills/voice/transcribe', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Trascrizione vocale non disponibile',
          code: 'stt_unavailable',
        }),
      }),
    );
    const failed = await speak(page, 'I stt down');
    check(
      'I STT unavailable → ERROR with a clear message',
      failed.state === 'ERROR' &&
        /non disponibile/i.test(await page.getByTestId('am-voice-notice').innerText()),
      failed.state,
    );
    await shot(page, 'I-stt-error');
    await page.getByTestId('am-voice-fallback').click();
    const r = await turn(page, async () => {
      await page.getByLabel('Messaggio per l’assistente').fill('Dimmi tutto su questo ospite');
      await page.getByLabel('Messaggio per l’assistente').press('Enter');
    });
    check('I text fallback still works', r.status === 'COMPLETED', JSON.stringify(r).slice(0, 160));
    await page.unroute('**/skills/voice/transcribe');
    await browser.close();
  }
  {
    const browser = await launch('vitals-120-80.wav', { grantMic: false });
    const { page, traffic } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await page.getByTestId('am-mic').click();
    await page
      .waitForFunction(
        () =>
          document.querySelector('[data-testid="am-voice"]')?.getAttribute('data-state') ===
          'ERROR',
        null,
        { timeout: 15000 },
      )
      .catch(() => undefined);
    const notice = (await page.getByTestId('am-voice-notice').count())
      ? await page.getByTestId('am-voice-notice').innerText()
      : '';
    check(
      'I mic permission denied → ERROR + text fallback hint',
      (await voiceState(page)) === 'ERROR' && /microfono|scrivi/i.test(notice),
      `${await voiceState(page)} ${notice}`,
    );
    check('I no audio sent when the mic is denied', traffic.transcribe === 0);
    await shot(page, 'I-mic-denied');
    await browser.close();
  }

  // ── J — Silence / steady noise / noise burst → no command invented, zero write ───────────
  for (const fixture of ['silence.wav', 'steady-noise.wav', 'noise-burst.wav']) {
    const browser = await launch(fixture);
    const { page, traffic } = await session(browser, 'Infermiere 1');
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    const before = await readings(galli.id);
    const heard = await speak(page, `J ${fixture}`);
    const notice = (await page.getByTestId('am-voice-notice').count())
      ? await page.getByTestId('am-voice-notice').innerText()
      : '';
    check(
      `J ${fixture}: no transcript, no command`,
      heard.state === 'IDLE' && traffic.converse.length === 0,
      `${heard.state} ${heard.transcript}`,
    );
    check(`J ${fixture}: user told nothing was sent`, /nulla|nessun comando/i.test(notice), notice);
    if (fixture !== 'noise-burst.wav')
      check(
        `J ${fixture}: VAD sent NO audio to the network`,
        traffic.transcribe === 0,
        traffic.transcribe,
      );
    else
      check(
        'J noise-burst: reached STT once, STT returned empty',
        traffic.transcribe === 1,
        traffic.transcribe,
      );
    check(`J ${fixture}: zero write`, (await readings(galli.id)) === before);
    await shot(page, `J-${fixture.replace('.wav', '')}`);
    await browser.close();
  }

  // ── Resident change discards a pending transcript; phone layout; M classic GUI ───────────
  {
    const browser = await launch('vitals-120-80.wav');
    const { page, traffic } = await session(browser, 'Infermiere 1', { width: 390, height: 844 });
    await openAssistant(page);
    await pickResident(page, 'Galli', 'Galli Nora');
    await speak(page, 'resident change');
    await pickResident(page, 'Conti', 'Conti Nino');
    check(
      'Resident change → pending transcript discarded (never re-targeted)',
      (await voiceState(page)) === 'CANCELLED' &&
        traffic.converse.filter((b) => b.message).length === 0,
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    check('Phone: voice panel without horizontal scroll', !overflow);
    await shot(page, 'phone-voice');
    await page.getByRole('button', { name: '← Torna all’applicazione' }).click();
    await page.getByRole('dialog', { name: 'Assistente AI' }).waitFor({ state: 'detached' });
    check(
      'M classic GUI back after the Assistant',
      (await page.getByTestId('assistant-entry').count()) === 1,
    );
    await browser.close();
  }

  // ── M — Classic GUI: every operator section still renders (desktop), no console errors ──
  {
    const browser = await launch(null);
    const { page } = await session(browser, 'Infermiere 1');
    const errorsBefore = consoleErrors.length;
    const sections = [
      'Pazienti',
      'Terapia',
      'Parametri',
      'Consegne',
      'Agenda',
      'Note',
      'Farmaci',
      'Turno',
    ];
    const failed = [];
    for (const name of sections) {
      await page
        .locator('.teams-sidebar')
        .getByRole('button', { name, exact: true })
        .first()
        .click();
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(300);
      const text = await page
        .locator('.main-area-clean')
        .innerText()
        .catch(() => '');
      if (text.trim().length < 20 || /qualcosa è andato storto|errore imprevisto/i.test(text))
        failed.push(name);
    }
    check('M classic GUI: all operator sections render', failed.length === 0, failed.join(', '));
    check(
      'M classic GUI: no console errors while navigating',
      consoleErrors.length === errorsBefore,
      consoleErrors.slice(errorsBefore).join(' || '),
    );
    await page
      .locator('.teams-sidebar')
      .getByRole('button', { name: 'Pazienti', exact: true })
      .first()
      .click();
    await page.getByText('Galli', { exact: false }).first().waitFor({ timeout: 10000 });
    check(
      'M classic patient list still lists the residents',
      (await page.getByText('Galli').count()) > 0,
    );
    await shot(page, 'M-classic-pazienti');
    await browser.close();
  }
} catch (error) {
  check('script completed without exceptions', false, error?.stack ?? String(error));
} finally {
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' || '));
  await prisma.$disconnect();
  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    `${OUT}/voice-browser-e2e.json`,
    `${JSON.stringify({ at: new Date().toISOString(), passed, failed: results.length - passed, results, timings, sttMisses, consoleErrors }, null, 2)}\n`,
  );
  console.log(`\n${passed}/${results.length} PASS`);
  process.exit(passed === results.length ? 0 : 1);
}

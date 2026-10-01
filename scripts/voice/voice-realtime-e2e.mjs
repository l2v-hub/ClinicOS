#!/usr/bin/env node
// Phase 5 (Azure gpt-live-transcribe) browser E2E — Prompt §18 A–N on the REAL frontend + backend +
// Postgres + Agno, with the realtime (WebRTC) voice transport.
//
//   --mode azure          REAL Azure: runtime AI_STT_PROVIDER=azure_openai with an existing
//                         gpt-live-transcribe deployment; real RTCPeerConnection; audio from the
//                         Chromium fake mic (WAV fixtures). Transcripts come from Azure.
//   --mode mock           MOCK TRANSPORT (labelled): runtime AI_STT_PROVIDER=mock issues fake
//                         sessions; RTCPeerConnection is replaced in the page by a scripted fake
//                         that streams partial deltas and a final transcript chosen by the test.
//                         Everything else is real: local VAD on the fake-mic audio, commit on end
//                         of turn, backend, Agno, policy, scope, DB writes, audit.
//   --mode azure-missing  REAL Azure failure path: runtime azure_openai, deployment absent →
//                         diagnostic error, no silent fallback, text Assistant keeps working.
//
//   DATABASE_URL=… node scripts/voice/voice-realtime-e2e.mjs --mode mock --out <dir>

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
const MODE = opt('--mode', 'mock');
const FRONT = opt('--front', 'http://127.0.0.1:5199');
const API = opt('--api', 'http://127.0.0.1:3099');
const OUT = opt('--out', 'voice-realtime-e2e-out');
mkdirSync(`${OUT}/screens`, { recursive: true });
const MOCK = MODE === 'mock';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const results = [];
const timings = [];
const consoleErrors = [];
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

// In-page instrumentation: voice-state log; in mock mode a scripted RTCPeerConnection.
const INIT = ({ mock }) => {
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
  window.__rt = { sessions: 0, commits: 0, closed: 0, transcript: '', sentPartials: 0 };
  if (!mock) return;
  const emit = (ch, event) =>
    ch.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(event) }));
  class FakeChannel extends EventTarget {
    readyState = 'connecting';
    constructor(pc) {
      super();
      this.pc = pc;
    }
    send(raw) {
      const event = JSON.parse(raw);
      if (event.type !== 'input_audio_buffer.commit' || this.pc.done) return;
      window.__rt.commits += 1;
      const words = window.__rt.transcript.split(' ').filter(Boolean);
      const rest = words.slice(this.pc.partialWords);
      rest.forEach((w, i) =>
        setTimeout(
          () =>
            emit(this, {
              type: 'conversation.item.input_audio_transcription.delta',
              item_id: 'i1',
              delta: ` ${w}`,
            }),
          40 * (i + 1),
        ),
      );
      setTimeout(
        () => {
          this.pc.done = true;
          emit(this, {
            type: 'conversation.item.input_audio_transcription.completed',
            item_id: 'i1',
            transcript: window.__rt.transcript,
          });
        },
        40 * (rest.length + 1) + 150,
      );
    }
    close() {
      this.readyState = 'closed';
    }
  }
  window.RTCPeerConnection = class {
    constructor() {
      window.__rt.sessions += 1;
      this.channel = new FakeChannel(this);
      this.partialWords = 0;
      this.timers = [];
    }
    addTrack() {}
    createDataChannel() {
      return this.channel;
    }
    async createOffer() {
      return { type: 'offer', sdp: 'v=0 mock' };
    }
    async setLocalDescription() {}
    async setRemoteDescription() {
      this.timers.push(
        setTimeout(() => {
          this.channel.readyState = 'open';
          this.channel.dispatchEvent(new Event('open'));
        }, 20),
      );
      // While the user speaks, the provider streams partial deltas (first two words).
      this.timers.push(
        setTimeout(() => {
          const words = window.__rt.transcript.split(' ').filter(Boolean).slice(0, 2);
          if (!words.length || this.done) return;
          this.partialWords = words.length;
          window.__rt.sentPartials += 1;
          emit(this.channel, {
            type: 'conversation.item.input_audio_transcription.delta',
            item_id: 'i1',
            delta: words.join(' '),
          });
        }, 1800),
      );
    }
    close() {
      window.__rt.closed += 1;
      this.timers.forEach(clearTimeout);
    }
  };
};

async function launch(fixture, extraFlags = []) {
  const flags = [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    ...extraFlags,
  ];
  if (fixture) flags.push(`--use-file-for-fake-audio-capture=${join(FIXTURES, fixture)}%noloop`);
  return chromium.launch({ args: flags });
}

async function session(browser, identityName, viewport = { width: 1180, height: 820 }) {
  const context = await browser.newContext({ viewport, hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript(INIT, { mock: MOCK });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR_ABORTED/.test(m.text()))
      consoleErrors.push(`${identityName}: ${m.text()}`);
  });
  const traffic = { session: 0, transcribe: 0, converse: [], answers: [] };
  page.on('response', async (res) => {
    if (res.url().includes('/skills/voice/realtime-call'))
      traffic.answers.push(await res.text().catch(() => ''));
  });
  page.on('request', (req) => {
    if (req.url().includes('/skills/voice/realtime-call')) traffic.session += 1;
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
  await page.getByTestId('assistant-entry').click();
  await page.getByRole('dialog', { name: 'Assistente AI' }).waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector('[data-testid="am-identity"]')?.textContent?.includes('Caricamento'),
  );
  return { context, page, traffic };
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

/** Press the mic; resolve when the turn ends (final / discarded / error / cancelled). */
async function speak(page, label, transcript, { duringPartial } = {}) {
  await page.evaluate((t) => {
    window.__rt.transcript = t;
    window.__voiceLog = [];
  }, transcript ?? '');
  await page.getByTestId('am-mic').click();
  let partialSeen = null;
  if (duringPartial) {
    partialSeen = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-testid="am-voice"]')?.getAttribute('data-state') ===
          'TRANSCRIPT_PARTIAL',
        null,
        { timeout: 15000 },
      )
      .then(() => true)
      .catch(() => false);
    if (partialSeen) await duringPartial();
  }
  await page
    .waitForFunction(
      () => {
        const log = window.__voiceLog.map((e) => e.state);
        const s = document.querySelector('[data-testid="am-voice"]')?.getAttribute('data-state');
        return (
          log.includes('LISTENING') &&
          ['TRANSCRIPT_FINAL', 'IDLE', 'ERROR', 'CANCELLED'].includes(s ?? 'IDLE')
        );
      },
      null,
      { timeout: 45000 },
    )
    .catch(() => undefined);
  const log = await page.evaluate(() => window.__voiceLog);
  const at = (s) => log.find((e) => e.state === s)?.t;
  timings.push({
    label,
    tapToListeningMs:
      at('LISTENING') && at('REQUESTING_PERMISSION')
        ? Math.round(at('LISTENING') - at('REQUESTING_PERMISSION'))
        : null,
    listeningToFirstPartialMs:
      at('TRANSCRIPT_PARTIAL') && at('LISTENING')
        ? Math.round(at('TRANSCRIPT_PARTIAL') - at('LISTENING'))
        : null,
    commitToFinalMs:
      at('TRANSCRIPT_FINAL') && at('TRANSCRIBING')
        ? Math.round(at('TRANSCRIPT_FINAL') - at('TRANSCRIBING'))
        : null,
    states: log.map((e) => e.state).join('>'),
  });
  const state = await voiceState(page);
  const text =
    state === 'TRANSCRIPT_FINAL' ? await page.getByTestId('am-voice-transcript').inputValue() : '';
  return { state, transcript: text, log: log.map((e) => e.state).join('>'), partialSeen };
}

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

const shot = (page, name) => page.screenshot({ path: `${OUT}/screens/${MODE}-${name}.png` });

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
  return (
    await fetch(`${API}/authz/policy/versions`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ document, basedOnVersion: current.active.version, note, apply: true }),
    })
  ).status;
}

// Transcript the provider returns for each fixture. In mock mode the fake transport returns it;
// in azure mode Azure transcribes the audio and the checks are content regexes.
const SAID = {
  read: 'Dimmi tutto su questo ospite.',
  write: 'Registra pressione 120 su 80 per questo ospite.',
  numbers: 'Registra pressione 140 su 90 per questo ospite.',
  conferma: 'Conferma.',
  ambiguous: 'Registra pressione 130 su 80 per Ferri.',
  prescribe:
    'Prescrivi paracetamolo 1000 mg, una compressa per bocca alle 8 e alle 20, per questo ospite.',
  administration: 'Registra una somministrazione per questo ospite.',
};

const started = new Date();
const galli = await resident('Nora', 'Galli');
const neri = await resident('Dario', 'Neri');
const ferri = [await resident('Marta', 'Ferri'), await resident('Marco', 'Ferri')];

try {
  if (MODE === 'azure-missing') {
    // ── J (real Azure) — deployment absent: diagnostic error, no silent fallback, text works ──
    const browser = await launch('vitals-120-80.wav');
    const { page, traffic } = await session(browser, 'Infermiere 1');
    await pickResident(page, 'Galli', 'Galli Nora');
    const heard = await speak(page, 'J azure missing', '');
    const notice = (await page.getByTestId('am-voice-notice').count())
      ? await page.getByTestId('am-voice-notice').innerText()
      : '';
    check('J real Azure: realtime session requested once', traffic.session === 1, traffic.session);
    check(
      'J real Azure: deployment missing → ERROR with a clear message',
      heard.state === 'ERROR' && /non disponibile|non configurato/i.test(notice),
      `${heard.state} ${notice}`,
    );
    check(
      'J no silent fallback to another STT (no utterance upload)',
      traffic.transcribe === 0,
      traffic.transcribe,
    );
    await shot(page, 'J-azure-missing');
    await page.getByTestId('am-voice-fallback').click();
    const r = await turn(page, async () => {
      await page.getByLabel('Messaggio per l’assistente').fill('Dimmi tutto su questo ospite');
      await page.getByLabel('Messaggio per l’assistente').press('Enter');
    });
    check(
      'J text Assistant still works',
      r.status === 'COMPLETED',
      JSON.stringify(r).slice(0, 160),
    );
    await browser.close();
  } else {
    // ── C + D — Doctor read: PARTIAL shown, no action on partial; FINAL → Agno → read skill ──
    {
      const browser = await launch('read-overview.wav');
      const { page, traffic } = await session(browser, 'Medico 1');
      await pickResident(page, 'Neri', 'Neri Dario');
      let duringPartial = null;
      const heard = await speak(page, 'D read', SAID.read, {
        duringPartial: async () => {
          duringPartial = {
            partialText: (await page.getByTestId('am-voice-partial').count())
              ? await page.getByTestId('am-voice-partial').innerText()
              : '',
            sendButtons: await page.getByTestId('am-voice-send').count(),
            converse: traffic.converse.length,
          };
          await shot(page, 'C-partial');
        },
      });
      check(
        'A/B realtime session minted by the backend (ephemeral)',
        traffic.session === 1,
        traffic.session,
      );
      check(
        'A/B browser receives only the SDP answer (no token, no key)',
        traffic.answers.length === 1 && !/token|api-key|ek_/i.test(traffic.answers[0]),
        traffic.answers[0]?.slice(0, 120),
      );
      check(
        'C PARTIAL transcript shown while speaking',
        heard.partialSeen === true && /dimmi|tutto/i.test(duringPartial?.partialText ?? ''),
        JSON.stringify(duringPartial),
      );
      check(
        'C PARTIAL causes no action (no send button, no Assistant request)',
        duringPartial?.sendButtons === 0 && duringPartial?.converse === 0,
        JSON.stringify(duringPartial),
      );
      check(
        'B FINAL transcript after the local-VAD commit',
        heard.state === 'TRANSCRIPT_FINAL' && /dimmi tutto/i.test(heard.transcript),
        `${heard.state} ${heard.transcript} ${heard.log}`,
      );
      check(
        'C states: REQUESTING_PERMISSION → LISTENING → … → TRANSCRIBING → TRANSCRIPT_FINAL',
        /REQUESTING_PERMISSION>LISTENING>.*TRANSCRIBING>TRANSCRIPT_FINAL/.test(heard.log),
        heard.log,
      );
      check('C nothing reaches the Assistant before «Invia»', traffic.converse.length === 0);
      if (MOCK)
        check('B one commit per turn', (await page.evaluate(() => window.__rt.commits)) === 1);
      const r = await turn(page, () => page.getByTestId('am-voice-send').click(), 'D final→result');
      check(
        'D read skill COMPLETED via Agno',
        r.status === 'COMPLETED' && r.skillId === 'patient.overview' && r.interpreter === 'agno',
        `${r.status} ${r.skillId} ${r.interpreter}`,
      );
      check('D inputChannel=voice', traffic.converse.at(-1)?.inputChannel === 'voice');
      check(
        'D audit voice:session ok (no token)',
        Boolean(
          await waitAudit({
            operatorId: 'SIM-DOCTOR-1',
            actionType: 'voice:session',
            outcome: 'ok',
            createdAt: { gte: started },
          }),
        ),
      );
      await shot(page, 'D-read');
      await browser.close();
    }

    // ── E + L — write: preview, zero write, spoken «conferma» refused, double confirm = 1 write ──
    {
      const browser = await launch('vitals-120-80.wav');
      const { page } = await session(browser, 'Infermiere 1');
      await pickResident(page, 'Galli', 'Galli Nora');
      const before = await readings(galli.id);
      const heard = await speak(page, 'E write', SAID.write);
      check(
        'E FINAL «pressione 120 su 80»',
        /pressione.*120.*80/i.test(heard.transcript),
        heard.transcript,
      );
      const draft = await turn(
        page,
        () => page.getByTestId('am-voice-send').click(),
        'E final→preview',
      );
      check(
        'E preview 120/80, zero write',
        draft.status === 'NEEDS_CONFIRMATION' &&
          draft.preview?.values?.Pressione === '120/80' &&
          (await readings(galli.id)) === before,
        JSON.stringify(draft).slice(0, 200),
      );
      const yes = await speak(page, 'E spoken conferma', SAID.conferma);
      const spoken = await turn(page, () => page.getByTestId('am-voice-send').click());
      check(
        'E spoken «conferma» does not confirm',
        /conferma/i.test(yes.transcript) &&
          spoken.status === 'NEEDS_CONFIRMATION' &&
          (await readings(galli.id)) === before,
        `${yes.transcript} ${spoken.status}`,
      );
      const done = await turn(
        page,
        () => page.getByTestId('am-confirm').dblclick(),
        'E confirm→result',
      );
      await page.waitForTimeout(800);
      check(
        'E/L UI «Conferma» → COMPLETED, exactly one write',
        done.status === 'COMPLETED' && (await readings(galli.id)) === before + 1,
        `${done.status} ${await readings(galli.id)}`,
      );
      check(
        'E audit execute',
        Boolean(
          await waitAudit({
            operatorId: 'SIM-NURSE-1',
            actionType: 'skill:vitals.record:execute',
            outcome: 'ok',
            createdAt: { gte: started },
          }),
        ),
      );
      await shot(page, 'E-completed');
      await browser.close();
    }

    // ── F — numbers / values go through Assistant extraction + backend validation ──
    {
      const browser = await launch('vitals-140-90.wav');
      const { page } = await session(browser, 'Infermiere 1');
      await pickResident(page, 'Galli', 'Galli Nora');
      const before = await readings(galli.id);
      const heard = await speak(page, 'F numbers', SAID.numbers);
      const r = await turn(
        page,
        () => page.getByTestId('am-voice-send').click(),
        'F final→preview',
      );
      check(
        'F spoken numbers → preview values exactly as said (140/90)',
        /140.*90/.test(heard.transcript) && r.preview?.values?.Pressione === '140/90',
        `${heard.transcript} ${JSON.stringify(r.preview?.values)}`,
      );
      check('F zero write', (await readings(galli.id)) === before);
      await turn(page, () => page.getByTestId('am-cancel').click());
      await browser.close();
    }

    // ── G — ambiguous resident → clarification, zero write ──
    {
      const browser = await launch('ambiguous-ferri.wav');
      const { page } = await session(browser, 'Infermiere 1');
      const before = await Promise.all(ferri.map((p) => readings(p.id)));
      let heard = await speak(page, 'G ambiguous', SAID.ambiguous);
      for (let i = 0; i < 2 && !/ferri/i.test(heard.transcript); i += 1)
        heard = await speak(page, 'G retry', SAID.ambiguous);
      const r = await turn(
        page,
        () => page.getByTestId('am-voice-send').click(),
        'G final→clarification',
      );
      const labels = (r.candidates ?? []).map((c) => c.label).join(' | ');
      check(
        'G NEEDS_CLARIFICATION with both Ferri, no preview, zero write',
        r.status === 'NEEDS_CLARIFICATION' &&
          /Ferri Marta/.test(labels) &&
          /Ferri Marco/.test(labels) &&
          !r.preview &&
          (await Promise.all(ferri.map((p) => readings(p.id)))).every((n, i) => n === before[i]),
        `${r.status} ${labels}`,
      );
      await shot(page, 'G-ambiguous');
      await browser.close();
    }

    // ── H — prescription / administration: proposal only ──
    {
      const browser = await launch('prescribe.wav');
      const { page } = await session(browser, 'Medico 1');
      await pickResident(page, 'Neri', 'Neri Dario');
      const before = await prisma.patientTherapy.count({ where: { patientId: neri.id } });
      await speak(page, 'H prescribe', SAID.prescribe);
      const r = await turn(
        page,
        () => page.getByTestId('am-voice-send').click(),
        'H final→prescription preview',
      );
      await page.waitForTimeout(1200);
      check(
        'H prescription only proposed (HIGH_RISK), zero therapy',
        r.status === 'NEEDS_CONFIRMATION' &&
          r.preview?.confirmationClass === 'HIGH_RISK' &&
          (await prisma.patientTherapy.count({ where: { patientId: neri.id } })) === before,
        JSON.stringify(r).slice(0, 200),
      );
      await shot(page, 'H-prescription');
      await turn(page, () => page.getByTestId('am-cancel').click());
      await browser.close();
    }
    {
      const browser = await launch('administration.wav');
      const { page } = await session(browser, 'Infermiere 1');
      await pickResident(page, 'Ferri', 'Ferri Marta');
      const admins = () =>
        prisma.medicationAdministration.count({ where: { patientId: ferri[0].id } });
      const before = await admins();
      await speak(page, 'H administration', SAID.administration);
      let r = await turn(
        page,
        () => page.getByTestId('am-voice-send').click(),
        'H final→administration',
      );
      if (r.status === 'NEEDS_CLARIFICATION' && r.candidates?.length)
        r = await turn(page, () =>
          page.getByTestId('am-candidates').locator('button').first().click(),
        );
      check(
        'H administration only prepared (HIGH_RISK), zero written',
        r.status === 'NEEDS_CONFIRMATION' &&
          r.preview?.confirmationClass === 'HIGH_RISK' &&
          (await admins()) === before,
        JSON.stringify(r).slice(0, 200),
      );
      await browser.close();
    }

    // ── I — policy revocation before commit → DENIED ──
    {
      const browser = await launch('vitals-120-80.wav');
      const { page } = await session(browser, 'Infermiere 1');
      await pickResident(page, 'Galli', 'Galli Nora');
      const before = await readings(galli.id);
      await speak(page, 'I voice', SAID.write);
      const draft = await turn(page, () => page.getByTestId('am-voice-send').click());
      const revoked = await adminPolicy(
        'nurse',
        'parameters.create_reading',
        'DENIED',
        'e2e realtime revoca',
      );
      try {
        const denied = await turn(page, () => page.getByTestId('am-confirm').click());
        check(
          'I revocation before commit → DENIED, zero write',
          draft.status === 'NEEDS_CONFIRMATION' &&
            revoked === 201 &&
            denied.status === 'DENIED' &&
            (await readings(galli.id)) === before,
          `${denied.status}`,
        );
      } finally {
        await adminPolicy(
          'nurse',
          'parameters.create_reading',
          'ALLOWED',
          'e2e realtime ripristino',
        );
      }
      await browser.close();
    }

    // ── J (transport failure) — realtime session refused → clear error, text fallback ──
    {
      const browser = await launch('vitals-120-80.wav');
      const { page, traffic } = await session(browser, 'Infermiere 1');
      await pickResident(page, 'Galli', 'Galli Nora');
      await page.route('**/skills/voice/realtime-call', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Trascrizione vocale non disponibile (servizio STT non configurato)',
            code: 'stt_unavailable',
          }),
        }),
      );
      const heard = await speak(page, 'J refused', SAID.write);
      check(
        'J negotiation refused → ERROR, peer closed, no upload, no other STT used',
        heard.state === 'ERROR' &&
          traffic.transcribe === 0 &&
          (await page.evaluate(() => window.__rt.sessions === window.__rt.closed)),
        `${heard.state} ${traffic.transcribe}`,
      );
      await page.unroute('**/skills/voice/realtime-call');
      await page.getByTestId('am-voice-fallback').click();
      const r = await turn(page, async () => {
        await page.getByLabel('Messaggio per l’assistente').fill('Dimmi tutto su questo ospite');
        await page.getByLabel('Messaggio per l’assistente').press('Enter');
      });
      check('J text fallback works', r.status === 'COMPLETED');
      await shot(page, 'J-fallback');
      await browser.close();
    }

    // ── K — silence / noise: nothing committed or invented, zero write ──
    for (const [fixture, said] of [
      ['silence.wav', ''],
      ['steady-noise.wav', ''],
      ['noise-burst.wav', ''],
    ]) {
      const browser = await launch(fixture);
      const { page, traffic } = await session(browser, 'Infermiere 1');
      await pickResident(page, 'Galli', 'Galli Nora');
      const before = await readings(galli.id);
      const heard = await speak(page, `K ${fixture}`, said);
      const commits = await page.evaluate(() => window.__rt.commits);
      check(
        `K ${fixture}: no command, zero write`,
        heard.state === 'IDLE' &&
          traffic.converse.length === 0 &&
          (await readings(galli.id)) === before,
        `${heard.state} commits=${commits}`,
      );
      if (fixture !== 'noise-burst.wav')
        check(`K ${fixture}: turn never committed (local VAD)`, commits === 0, commits);
      check(
        `K ${fixture}: session closed`,
        (await page.evaluate(() => window.__rt.sessions === window.__rt.closed)) || !MOCK,
      );
      await browser.close();
    }

    // ── N — classic GUI ──
    {
      const browser = await launch(null);
      const { page } = await session(browser, 'Infermiere 1');
      await page.getByRole('button', { name: '← Torna all’applicazione' }).click();
      const errorsBefore = consoleErrors.length;
      const failed = [];
      for (const name of [
        'Pazienti',
        'Terapia',
        'Parametri',
        'Consegne',
        'Agenda',
        'Note',
        'Farmaci',
        'Turno',
      ]) {
        await page
          .locator('.teams-sidebar')
          .getByRole('button', { name, exact: true })
          .first()
          .click();
        await page.waitForLoadState('networkidle').catch(() => undefined);
        const text = await page
          .locator('.main-area-clean')
          .innerText()
          .catch(() => '');
        if (text.trim().length < 20) failed.push(name);
      }
      check(
        'N classic GUI sections render, no console errors',
        failed.length === 0 && consoleErrors.length === errorsBefore,
        failed.join(','),
      );
      await browser.close();
    }
  }
} catch (error) {
  check('script completed without exceptions', false, error?.stack ?? String(error));
} finally {
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' || '));
  await prisma.$disconnect();
  const passed = results.filter((r) => r.pass).length;
  writeFileSync(
    `${OUT}/voice-realtime-e2e-${MODE}.json`,
    `${JSON.stringify({ at: new Date().toISOString(), mode: MODE, transport: MOCK ? 'MOCK realtime transport (Azure not used)' : 'real Azure', passed, failed: results.length - passed, results, timings, consoleErrors }, null, 2)}\n`,
  );
  console.log(`\n${passed}/${results.length} PASS (${MODE})`);
  process.exit(passed === results.length ? 0 : 1);
}

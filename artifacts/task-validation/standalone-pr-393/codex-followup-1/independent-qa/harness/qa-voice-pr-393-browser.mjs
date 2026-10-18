// Real ClinicOS UI/backend/database; only WebRTC provider transcription is a labelled fixture.
import assert from 'node:assert/strict';
import { chromium } from '/workspace/ClinicOS/node_modules/playwright/index.mjs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

export async function runVoiceBrowser({
  front,
  api,
  out,
  sql,
  setProviderFailure,
  fontRoot = path.join(out, 'font-assets'),
}) {
  const checks = [],
    errors = [],
    httpErrors = [],
    expectedErrors = [];
  let expectedProviderFailure = false;
  const check = (name, value) => {
    assert.ok(value, name);
    checks.push({ name, status: 'PASS' });
  };
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${path.resolve('scripts/voice/fixtures/vitals-120-80.wav')}%noloop`,
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: path.join(out, 'video') },
    hasTouch: true,
  });
  const manifest = JSON.parse(readFileSync(path.join(fontRoot, 'manifest.json'), 'utf8'));
  const fonts = new Map();
  for (const [name, record] of Object.entries(manifest.files)) {
    assert.equal(path.basename(record.path), record.path);
    const data = readFileSync(path.join(fontRoot, record.path));
    assert.equal(createHash('sha256').update(data).digest('hex'), record.sha256);
    assert.equal(data.subarray(0, 4).toString(), 'wOF2');
    fonts.set(name, data);
  }
  const css = [...fonts.keys()]
    .map(
      (name) =>
        `@font-face{font-family:'${name.startsWith('inter-') ? 'Inter' : 'JetBrains Mono'}';font-style:normal;font-weight:${/-(\d+)-normal/.exec(name)[1]};font-display:swap;src:url(https://fonts.gstatic.com/clinicos-qa/${name}) format('woff2');}`,
    )
    .join('\n');
  await context.route('https://fonts.googleapis.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/css', body: css }),
  );
  await context.route('https://fonts.gstatic.com/clinicos-qa/**', (r) => {
    const font = fonts.get(new URL(r.request().url()).pathname.split('/').at(-1));
    assert.ok(font);
    return r.fulfill({ status: 200, contentType: 'font/woff2', body: font });
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (expectedProviderFailure && /Failed to load resource.*503/.test(m.text()))
      expectedErrors.push({ kind: 'controlled-provider-503', message: m.text() });
    else errors.push(m.text());
  });
  const traffic = { sessions: 0, uploads: 0, converse: 0 };
  page.on('request', (r) => {
    if (r.url().endsWith('/voice/realtime-call')) traffic.sessions++;
    if (r.url().endsWith('/voice/transcribe')) traffic.uploads++;
    if (r.url().endsWith('/skills/converse')) traffic.converse++;
  });
  page.on('response', (r) => {
    if (r.status() < 400) return;
    if (expectedProviderFailure && r.url().endsWith('/voice/realtime-call') && r.status() === 503)
      expectedErrors.push({ kind: 'controlled-provider-503', status: 503 });
    else httpErrors.push({ path: new URL(r.url()).pathname, status: r.status() });
  });
  await page.addInitScript(() => {
    localStorage.setItem('clinicos.assistant.voiceFeedback', 'off');
    window.__voiceQA = {
      transcript: 'Registra pressione 120 su 80 per questo ospite.',
      sessions: [],
      streams: [],
      delayPermission: false,
      denyPermission: false,
    };
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        this.holdResume = window.__voiceQA.holdNextResume;
        window.__voiceQA.holdNextResume = false;
      }
      get state() {
        return super.state === 'closed' ? 'closed' : this.holdResume ? 'suspended' : super.state;
      }
      resume() {
        if (!this.holdResume) return super.resume();
        return new Promise((_resolve, reject) => {
          window.__voiceQA.rejectHeldResume = () =>
            reject(new Error('synthetic delayed old resume failure'));
        });
      }
    };
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (window.__voiceQA.denyPermission)
        throw new DOMException('Synthetic denied', 'NotAllowedError');
      if (window.__voiceQA.delayPermission) await new Promise((r) => setTimeout(r, 700));
      const stream = await original(constraints);
      window.__voiceQA.streams.push(stream);
      return stream;
    };
    class Channel extends EventTarget {
      readyState = 'connecting';
      constructor(peer) {
        super();
        this.peer = peer;
        this.commits = 0;
      }
      send(raw) {
        const event = JSON.parse(raw);
        if (event.type !== 'input_audio_buffer.commit') return;
        this.commits++;
        this.peer.timers.push(
          setTimeout(
            () =>
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: JSON.stringify(
                    window.__voiceQA.emptyAfterCommit
                      ? { type: 'error', error: { code: 'input_audio_buffer_commit_empty' } }
                      : {
                          type: 'conversation.item.input_audio_transcription.completed',
                          item_id: 'synthetic-turn',
                          transcript: window.__voiceQA.transcript,
                        },
                  ),
                }),
              ),
            100,
          ),
        );
      }
      close() {
        this.readyState = 'closed';
      }
    }
    window.RTCPeerConnection = class extends EventTarget {
      connectionState = 'new';
      constructor() {
        super();
        this.channel = new Channel(this);
        this.timers = [];
        this.closed = false;
        window.__voiceQA.sessions.push(this);
      }
      addTrack() {}
      createDataChannel() {
        return this.channel;
      }
      async createOffer() {
        return { type: 'offer', sdp: 'v=0\r\nsynthetic-offer' };
      }
      async setLocalDescription() {}
      async setRemoteDescription() {
        if (window.__voiceQA.holdNegotiation) {
          await new Promise((resolve) => {
            window.__voiceQA.releaseNegotiation = resolve;
          });
          if (this.closed) return;
        }
        this.connectionState = 'connected';
        this.channel.readyState = 'open';
        this.channel.dispatchEvent(new Event('open'));
        this.timers.push(
          setTimeout(
            () =>
              this.channel.dispatchEvent(
                new MessageEvent('message', {
                  data: JSON.stringify({
                    type: 'conversation.item.input_audio_transcription.delta',
                    item_id: 'synthetic-turn',
                    delta: 'Registra pressione',
                  }),
                }),
              ),
            450,
          ),
        );
      }
      close() {
        this.closed = true;
        this.connectionState = 'closed';
        this.timers.forEach(clearTimeout);
      }
    };
  });
  const shot = async (name) => {
    await page.screenshot({ path: path.join(out, 'screenshots', `${name}.png`), fullPage: true });
  };
  const state = async (value) =>
    page.waitForFunction(
      (v) => document.querySelector('[data-testid="am-voice"]')?.getAttribute('data-state') === v,
      value,
      { timeout: 20_000 },
    );
  const noTracks = async () =>
    page.waitForFunction(() =>
      window.__voiceQA.streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
    );
  try {
    await page.goto(front);
    await page
      .getByRole('button', { name: /Infermiere 1/ })
      .first()
      .click();
    await page.getByTestId('assistant-entry').click();
    await page.getByRole('dialog', { name: 'Milo · assistente clinico AI' }).waitFor();
    await page.getByRole('button', { name: 'Cambia ospite' }).click();
    await page.getByLabel('Cerca ospite').fill('Galli');
    await page.locator('.am-picker__item', { hasText: 'Galli Nora' }).first().click();
    await page.getByTestId('am-resident-name').getByText('Galli Nora').waitFor();
    await page.getByTestId('am-mic').waitFor();
    const patient = (
      await sql.query('SELECT id FROM "Patient" WHERE "medicalRecordNumber"=$1', [
        'DEMO-P4-Nora-Galli',
      ])
    ).rows[0];
    assert.ok(patient);
    const readings = async () =>
      (
        await sql.query(
          'SELECT count(*)::int n FROM "PatientParameterReading" WHERE "patientId"=$1',
          [patient.id],
        )
      ).rows[0].n;
    const before = await readings();
    await page.getByTestId('am-mic').click();
    await state('TRANSCRIPT_PARTIAL');
    check(
      'partial exact visible value',
      (await page.getByTestId('am-voice-partial').isVisible()) &&
        (await page.getByTestId('am-voice-partial').innerText()).includes('Registra pressione'),
    );
    check(
      'partial has no submission control',
      (await page.getByTestId('am-voice-send').count()) === 0,
    );
    check('partial triggers no assistant request', traffic.converse === 0);
    await shot('01-partial-display-only');
    await state('TRANSCRIPT_READY');
    check(
      'final transcript exact value',
      (await page.getByTestId('am-voice-transcript').inputValue()) ===
        'Registra pressione 120 su 80 per questo ospite.',
    );
    check(
      'one negotiation and no file/provider fallback',
      traffic.sessions === 1 && traffic.uploads === 0,
    );
    check(
      'one local end-of-turn commit',
      await page.evaluate(() => window.__voiceQA.sessions[0].channel.commits === 1),
    );
    await noTracks();
    check('final releases microphone tracks', true);
    check(
      'final alone performs no clinical write',
      (await readings()) === before && traffic.converse === 0,
    );
    await shot('02-final-operator-review');
    const previewResponse = page.waitForResponse(
      (r) => r.url().endsWith('/skills/converse') && r.request().method() === 'POST',
    );
    await page.getByTestId('am-voice-send').click();
    const preview = await (await previewResponse).json();
    check(
      'final submission enters existing policy preview',
      preview.status === 'NEEDS_CONFIRMATION' && preview.preview?.values?.Pressione === '120/80',
    );
    check('preview persists no clinical write', (await readings()) === before);
    await page.getByTestId('am-preview').waitFor();
    await shot('03-preview-zero-write');
    const confirmResponse = page.waitForResponse(
      (r) => r.url().endsWith('/skills/converse') && r.request().method() === 'POST',
    );
    await page.getByTestId('am-confirm').click();
    const confirmed = await (await confirmResponse).json();
    check('explicit UI confirmation completes', confirmed.status === 'COMPLETED');
    check('exactly one persisted reading', (await readings()) === before + 1);
    const stored = (
      await sql.query(
        'SELECT values FROM "PatientParameterReading" WHERE "patientId"=$1 ORDER BY "createdAt" DESC LIMIT 1',
        [patient.id],
      )
    ).rows[0].values;
    check('persisted values retain literal blood pressure', stored.pa === '120/80');
    await page.getByTestId('am-result').waitFor();
    await shot('04-confirmed-one-write');
    const submitted = traffic.converse;
    await page.getByTestId('am-mic').click();
    await state('TRANSCRIPT_PARTIAL');
    await page.getByTestId('am-voice-cancel').click();
    await state('CANCELLED');
    await noTracks();
    check(
      'cancel partial closes microphone and peer',
      await page.evaluate(() => window.__voiceQA.sessions.at(-1).closed),
    );
    check(
      'cancel never submits or uploads',
      traffic.converse === submitted && traffic.uploads === 0,
    );
    await shot('05-cancelled-partial');
    await page.evaluate(() => {
      window.__voiceQA.holdNegotiation = true;
    });
    await page.getByTestId('am-mic').click();
    await state('REQUESTING_PERMISSION');
    await page.waitForFunction(() => typeof window.__voiceQA.releaseNegotiation === 'function');
    check(
      'granted pending negotiation has live media and visible microphone indicator',
      await page.evaluate(
        () =>
          window.__voiceQA.streams
            .at(-1)
            .getAudioTracks()
            .some((t) => t.readyState === 'live') &&
          document.querySelector('.am-voice__dot')?.classList.contains('is-live'),
      ),
    );
    check(
      'pending negotiation exposes no Finish or submit action',
      (await page.getByTestId('am-mic').isDisabled()) &&
        (await page.getByTestId('am-voice-send').count()) === 0,
    );
    await shot('05a-pending-negotiation-microphone-live');
    await page.getByTestId('am-voice-cancel').click();
    await state('CANCELLED');
    await noTracks();
    check(
      'pending negotiation cancel clears visible microphone indicator',
      await page.evaluate(
        () => !document.querySelector('.am-voice__dot')?.classList.contains('is-live'),
      ),
    );
    await shot('05b-pending-negotiation-cancelled');
    await page.evaluate(() => {
      window.__voiceQA.holdNegotiation = false;
      window.__voiceQA.releaseNegotiation();
      delete window.__voiceQA.releaseNegotiation;
    });
    await page.evaluate(() => {
      window.__voiceQA.delayPermission = true;
    });
    await page.getByTestId('am-mic').click();
    await state('REQUESTING_PERMISSION');
    await page.getByTestId('am-voice-cancel').click();
    await state('CANCELLED');
    await page.waitForFunction(() => window.__voiceQA.streams.length >= 3);
    await noTracks();
    check('late permission stream stopped after cancellation', true);
    await page.evaluate(() => {
      window.__voiceQA.delayPermission = false;
      window.__voiceQA.denyPermission = true;
    });
    await page.getByTestId('am-mic').click();
    await state('ERROR');
    check(
      'permission denied offers text fallback',
      (await page.getByTestId('am-voice-notice').innerText()).includes('negato'),
    );
    await page.evaluate(() => {
      window.__voiceQA.denyPermission = false;
    });
    expectedProviderFailure = true;
    setProviderFailure(true);
    const failureResponse = page.waitForResponse(
      (r) => r.url().endsWith('/voice/realtime-call') && r.status() === 503,
    );
    await page.getByTestId('am-mic').click();
    await failureResponse;
    await state('ERROR');
    await noTracks();
    check('provider failure releases tracks without silent file fallback', traffic.uploads === 0);
    await shot('06-provider-failure-text-fallback');
    await page.getByTestId('am-voice-fallback').click();
    const textResponse = page.waitForResponse(
      (r) => r.url().endsWith('/skills/converse') && r.request().method() === 'POST',
    );
    await page.getByLabel('Messaggio per l’assistente').fill('Dimmi tutto su questo ospite');
    await page.getByLabel('Messaggio per l’assistente').press('Enter');
    const text = await (await textResponse).json();
    check('text Assistant works after realtime failure', text.status === 'COMPLETED');
    check(
      'only explicit confirmation changed clinical database',
      (await readings()) === before + 1,
    );
    await page.getByTestId('am-result').scrollIntoViewIfNeeded();
    await shot('07-text-assistant-after-failure');
    expectedProviderFailure = false;
    setProviderFailure(false);
    const beforeEdges = traffic.converse;
    // Regression for independent QA1: an empty-buffer error before commit cannot leave
    // LISTENING/PARTIAL displayed after capture shutdown. Exercise the real hook, not reducer copies.
    for (const phase of ['LISTENING', 'TRANSCRIPT_PARTIAL']) {
      for (const code of [
        'input_audio_buffer_commit_empty',
        'input_audio_buffer_commit_buffer_too_small',
      ]) {
        await page.getByTestId('am-mic').click();
        await state(phase);
        await page.evaluate(
          ({ phase, code }) => {
            const shown = document
              .querySelector('[data-testid="am-voice"]')
              ?.getAttribute('data-state');
            if (shown !== phase)
              throw new Error(`Fixture phase changed before injection: ${shown}`);
            const peer = window.__voiceQA.sessions.at(-1);
            if (peer.channel.commits !== 0)
              throw new Error('Early error fixture must precede commit');
            peer.channel.dispatchEvent(
              new MessageEvent('message', {
                data: JSON.stringify({ type: 'error', error: { code } }),
              }),
            );
          },
          { phase, code },
        );
        await state('ERROR');
        await noTracks();
        check(
          `early ${code} in ${phase} leaves recoverable ERROR and closed peer`,
          await page.evaluate(() => window.__voiceQA.sessions.at(-1).closed),
        );
        check(
          `early ${code} in ${phase} exposes retry and text fallback`,
          (await page.getByTestId('am-mic').isEnabled()) &&
            (await page.getByTestId('am-voice-fallback').isVisible()) &&
            (await page.getByTestId('am-mic').getAttribute('aria-pressed')) === 'false',
        );
        check(
          `early ${code} in ${phase} never submits, uploads or writes`,
          traffic.converse === beforeEdges &&
            traffic.uploads === 0 &&
            (await readings()) === before + 1,
        );
        await shot(`13-early-${phase.toLowerCase()}-${code}`);
      }
    }
    await page.evaluate(() => {
      window.__voiceQA.emptyAfterCommit = true;
    });
    await page.getByTestId('am-mic').click();
    await state('IDLE');
    await noTracks();
    check(
      'empty buffer after actual commit recovers to IDLE without an invented transcript',
      await page.evaluate(
        () =>
          window.__voiceQA.sessions.at(-1).closed &&
          window.__voiceQA.sessions.at(-1).channel.commits === 1,
      ),
    );
    check(
      'empty committed turn has no submit control or clinical write',
      (await page.getByTestId('am-voice-send').count()) === 0 &&
        traffic.converse === beforeEdges &&
        (await readings()) === before + 1,
    );
    await shot('14-empty-committed-idle');
    await page.evaluate(() => {
      window.__voiceQA.emptyAfterCommit = false;
    });
    await page.getByTestId('am-mic').click();
    await state('TRANSCRIPT_READY');
    check(
      'new capture works after early and committed buffer errors',
      (await page.getByTestId('am-voice-transcript').inputValue()) ===
        'Registra pressione 120 su 80 per questo ospite.',
    );
    await page.getByTestId('am-voice-discard').click();
    await state('CANCELLED');
    await noTracks();
    await shot('15-retry-after-buffer-errors');

    await page.getByTestId('am-mic').click();
    await state('TRANSCRIPT_PARTIAL');
    await page.evaluate(() => {
      const peer = window.__voiceQA.sessions.at(-1);
      peer.connectionState = 'failed';
      peer.dispatchEvent(new Event('connectionstatechange'));
    });
    await state('ERROR');
    await noTracks();
    check(
      'disconnect releases mic and shows safe fallback',
      (await page.getByTestId('am-voice-notice').innerText()).includes('interrotta'),
    );
    await shot('08-disconnected-release');
    await page.evaluate(() => {
      window.__voiceQA.holdNextResume = true;
    });
    await page.getByTestId('am-mic').click();
    await state('LISTENING');
    await page.getByTestId('am-voice-cancel').click();
    await state('CANCELLED');
    await page.evaluate(() => {
      window.__voiceQA.delayPermission = true;
    });
    await page.getByTestId('am-mic').click();
    await state('REQUESTING_PERMISSION');
    await page.evaluate(() => {
      window.__voiceQA.rejectHeldResume();
    });
    await state('LISTENING');
    check('old AudioContext rejection cannot cancel a newer pending microphone capture', true);
    await page.getByTestId('am-voice-cancel').click();
    await state('CANCELLED');
    await noTracks();
    await page.evaluate(() => {
      window.__voiceQA.delayPermission = false;
    });
    await shot('08b-stale-resume-preserves-new-capture');

    await page.getByTestId('am-mic').click();
    await state('TRANSCRIPT_PARTIAL');
    await page.getByRole('button', { name: 'Cambia ospite' }).click();
    await page.getByLabel('Cerca ospite').fill('Conti');
    await page.locator('.am-picker__item', { hasText: 'Conti Nino' }).first().click();
    await state('CANCELLED');
    await noTracks();
    check(
      'resident change discards partial and closes peer',
      await page.evaluate(() => window.__voiceQA.sessions.at(-1).closed),
    );
    check(
      'resident change never submits stale transcript',
      traffic.converse === beforeEdges &&
        (await page.getByTestId('am-voice-transcript').count()) === 0,
    );
    await shot('09-resident-change-discard');

    await page.evaluate(() => {
      window.__voiceQA.delayPermission = true;
      window.__voiceQA.hidden = false;
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (window.__voiceQA.hidden ? 'hidden' : 'visible'),
      });
    });
    const streamCount = await page.evaluate(() => window.__voiceQA.streams.length);
    await page.getByTestId('am-mic').click();
    await state('REQUESTING_PERMISSION');
    await page.evaluate(() => {
      window.__voiceQA.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await state('CANCELLED');
    await page.waitForFunction((count) => window.__voiceQA.streams.length > count, streamCount);
    await noTracks();
    check('hidden tab cancels pending permission and stops late stream', true);
    await page.evaluate(() => {
      window.__voiceQA.hidden = false;
    });
    await shot('10-hidden-pending-permission');

    const streamsBeforeUnmount = await page.evaluate(() => window.__voiceQA.streams.length);
    await page.getByTestId('am-mic').click();
    await state('REQUESTING_PERMISSION');
    await page.getByRole('button', { name: /Torna all.applicazione/ }).click();
    await page
      .getByRole('dialog', { name: 'Milo · assistente clinico AI' })
      .waitFor({ state: 'detached' });
    await page.waitForFunction(
      (count) => window.__voiceQA.streams.length > count,
      streamsBeforeUnmount,
    );
    await noTracks();
    check('unmount releases late permission stream without background capture', true);
    check(
      'lifecycle interruptions never write or upload',
      (await readings()) === before + 1 &&
        traffic.uploads === 0 &&
        traffic.converse === beforeEdges,
    );
    await shot('11-unmounted-no-capture');
    check(
      'all provider sessions closed',
      await page.evaluate(() => window.__voiceQA.sessions.every((s) => s.closed)),
    );
    await page.reload();
    await page
      .getByRole('button', { name: /Infermiere 1/ })
      .first()
      .click();
    await page.getByTestId('assistant-entry').click();
    await page.getByRole('dialog', { name: 'Milo · assistente clinico AI' }).waitFor();
    await page.getByRole('button', { name: 'Cambia ospite' }).click();
    await page.getByLabel('Cerca ospite').fill('Galli');
    await page.locator('.am-picker__item', { hasText: 'Galli Nora' }).first().click();
    const readbackResponse = page.waitForResponse(
      (r) => r.url().endsWith('/skills/converse') && r.request().method() === 'POST',
    );
    await page
      .getByLabel('Messaggio per l’assistente')
      .fill('Mostrami i parametri recenti di questo ospite');
    await page.getByLabel('Messaggio per l’assistente').press('Enter');
    const readback = await (await readbackResponse).json();
    check(
      'after reload authorized readback completes',
      readback.status === 'COMPLETED' && readback.skillId === 'vitals.recent',
    );
    await page.getByTestId('am-result').waitFor();
    check(
      'after reload visible persisted blood pressure is exact',
      (await page.getByTestId('am-result').innerText()).includes('120/80'),
    );
    check('reload/readback creates no second clinical write', (await readings()) === before + 1);
    await page.getByTestId('am-result').scrollIntoViewIfNeeded();
    await shot('12-reload-persisted-readback');
    check('no page or console errors', errors.length === 0);
    check('no unexpected HTTP errors', httpErrors.length === 0);
    return {
      checks,
      consoleErrors: errors,
      httpErrors,
      expectedErrors,
      realProviderProof: false,
      browser: 'system Chromium',
      transcription: 'synthetic transport fixture, real microphone/VAD/app/authz/database',
    };
  } catch (error) {
    await shot('failure').catch(() => {});
    writeFileSync(
      path.join(out, 'test-results', 'browser-failure.json'),
      JSON.stringify({ checks, errors, httpErrors, failure: error.message }, null, 2),
    );
    throw error;
  } finally {
    setProviderFailure(false);
    await context.tracing.stop({ path: path.join(out, 'trace', 'trace.zip') });
    await context.close();
    await browser.close();
  }
}

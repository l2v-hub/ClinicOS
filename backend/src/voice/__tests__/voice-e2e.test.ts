// Phase 5 — voice channel at the backend (Prompt 5 §4, §6, §9, §12, §15, §16).
//   • runtime STT client (createRuntimeSttProvider) against a fake runtime over real HTTP
//   • POST /skills/voice/transcribe on the REAL app: auth, capability gate, audio validation,
//     limits, provider failures, PHI-safe audit
//   • a transcript drives /skills/converse exactly like text: preview, zero write, a spoken
//     «conferma» never confirms, only the UI action does
// Sandbox: setSttProvider (scripted transcripts / outage) — the provider itself is exercised by
// scripts/voice/stt-provider-check.mjs with real audio.

process.env.SKILLS_INTERPRETER = 'deterministic';
process.env.VOICE_CHANNEL_ENABLED = 'true';

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { prisma } from '../../lib/prisma.js';
import {
  call,
  login,
  runTag,
  startApp,
  waitForAudit,
  type Session,
} from '../../authz/__tests__/harness-support.js';
import { setSttProvider } from '../../skills/index.js';
import { extractPatientQuery, extractValues } from '../../skills/interpreter.js';
import {
  MAX_UTTERANCE_BYTES,
  SttUnavailableError,
  createRuntimeSttProvider,
  type SpeechToTextProvider,
  type TranscriptResult,
} from '../stt.js';
import { DEFAULT_VAD, voiceVadConfig } from '../vad-config.js';

let base = '';
let close: () => Promise<void>;
let admin: Session;
let nurse: Session;
const ids: Record<string, string> = {};
const Tag = (runTag.replace(/[^a-z]/g, '').slice(-4) || 'voce').replace(/^./, (c) =>
  c.toUpperCase(),
);

/** 16 kHz mono PCM16 WAV with a 440 Hz tone (valid container; content irrelevant to the fake STT). */
function wav(ms = 800): Buffer {
  const rate = 16_000;
  const samples = Math.round((rate * ms) / 1000);
  const out = Buffer.alloc(44 + samples * 2);
  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(36 + samples * 2, 4);
  out.write('WAVE', 8, 'ascii');
  out.write('fmt ', 12, 'ascii');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36, 'ascii');
  out.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i += 1)
    out.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / rate)), 44 + i * 2);
  return out;
}

async function upload(
  session: Session | null,
  body: Buffer,
  contentType = 'audio/wav',
  headers: Record<string, string> = {},
) {
  const response = await fetch(`${base}/skills/voice/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-Utterance-Ms': '1800',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...headers,
    },
    body,
  });
  const text = await response.text();
  let parsed: any = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { status: response.status, body: parsed };
}

function scripted(text: string): SpeechToTextProvider {
  return {
    async transcribe(audio, locale) {
      assert.ok(audio.bytes.length > 44, 'the provider receives the audio bytes');
      return {
        text,
        locale,
        confidence: null,
        timestamps: [],
        empty: !text,
        metadata: { provider: 'fake', model: 'scripted', durationMs: 5, roundTripMs: 7 },
      } satisfies TranscriptResult;
    },
  };
}

before(async () => {
  ({ base, close } = await startApp());
  [admin, nurse] = await Promise.all(['SIM-ADMIN', 'SIM-NURSE-1'].map((id) => login(base, id)));
  const row = await prisma.patient.create({
    data: {
      medicalRecordNumber: `MRN-${runTag}-voice`,
      firstName: 'Vera',
      lastName: `Voce${Tag}`,
      dateOfBirth: new Date('1940-05-06T00:00:00.000Z'),
      sex: 'F',
      registeredById: 'SIM-NURSE-1',
    },
  });
  ids.nurse = row.id;
});

after(async () => {
  setSttProvider(null);
  await prisma.patientParameterReading.deleteMany({
    where: { patientId: { in: Object.values(ids) } },
  });
  await prisma.patient.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await close();
});

// ── runtime STT client (unit, real HTTP against a fake runtime) ─────────────────────────────

test('runtime STT client: bearer + base64 body, typed errors, missing config', async () => {
  let seen: { auth?: string; body?: any } = {};
  let reply: { status: number; body: unknown } = {
    status: 200,
    body: {
      text: ' Registra pressione 120 su 80. ',
      locale: 'it-IT',
      confidence: null,
      empty: false,
      metadata: {
        provider: 'google',
        model: 'gemini-x',
        durationMs: 900,
        usage: { inputTokens: 70, outputTokens: 12, totalTokens: 82, secret: 'x' },
      },
    },
  };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      seen = { auth: req.headers.authorization, body: JSON.parse(raw) };
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const env = { AI_RUNTIME_URL: `http://127.0.0.1:${port}/`, AI_RUNTIME_SERVICE_TOKEN: 'svc' };
  try {
    const audio = wav(300);
    const ok = await createRuntimeSttProvider(env).transcribe(
      { bytes: audio, mimeType: 'audio/wav' },
      'it-IT',
    );
    assert.equal(seen.auth, 'Bearer svc');
    assert.equal(Buffer.from(seen.body.audio_base64, 'base64').equals(audio), true);
    assert.equal(seen.body.mime_type, 'audio/wav');
    assert.equal(ok.text, 'Registra pressione 120 su 80.', 'trimmed, otherwise verbatim');
    assert.equal(ok.empty, false);
    assert.equal(ok.metadata.provider, 'google');
    assert.deepEqual(
      ok.metadata.usage,
      { inputTokens: 70, outputTokens: 12, totalTokens: 82 },
      'only numeric token counts pass through',
    );
    assert.ok(ok.metadata.roundTripMs >= 0);

    const cases: [number, unknown, string, number][] = [
      [503, { detail: { kind: 'not_configured' } }, 'stt_unavailable', 503],
      [504, { detail: { kind: 'timeout' } }, 'stt_timeout', 504],
      [400, { detail: { kind: 'invalid_audio' } }, 'stt_invalid_audio', 400],
      [502, { detail: { kind: 'provider_error' } }, 'stt_provider_error', 502],
    ];
    for (const [status, body, code, mapped] of cases) {
      reply = { status, body };
      await assert.rejects(
        createRuntimeSttProvider(env).transcribe({ bytes: audio, mimeType: 'audio/wav' }, 'it-IT'),
        (e: unknown) => e instanceof SttUnavailableError && e.code === code && e.status === mapped,
      );
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await assert.rejects(
    createRuntimeSttProvider({}).transcribe({ bytes: wav(), mimeType: 'audio/wav' }, 'it-IT'),
    (e: unknown) => e instanceof SttUnavailableError && e.code === 'stt_unavailable',
  );
  await assert.rejects(
    createRuntimeSttProvider({
      AI_RUNTIME_URL: 'http://127.0.0.1:9',
      AI_RUNTIME_SERVICE_TOKEN: 'x',
    }).transcribe({ bytes: wav(), mimeType: 'audio/wav' }, 'it-IT'),
    (e: unknown) => e instanceof SttUnavailableError && e.code === 'stt_unavailable',
  );
});

test('VAD parameters are configurable per environment', () => {
  assert.deepEqual(voiceVadConfig({}), DEFAULT_VAD);
  const tuned = voiceVadConfig({ VOICE_VAD_END_SILENCE_MS: '1200', VOICE_VAD_MIN_SPEECH_MS: 'x' });
  assert.equal(tuned.endSilenceMs, 1200);
  assert.equal(tuned.minSpeechMs, DEFAULT_VAD.minSpeechMs, 'invalid values are ignored');
});

test('QA M3: ordinary words after «per» are never turned into residents', () => {
  for (const phrase of [
    'paracetamolo 1 g per febbre',
    'trovato per terra',
    'dolore per stasera',
    'Registra pressione 120 su 80 per esposito.',
  ])
    assert.equal(extractPatientQuery(phrase), undefined, phrase);
  assert.equal(extractPatientQuery('Registra pressione 130 su 80 per Ferri.'), 'Ferri');
});

test('spoken blood pressure «120 su 80» is read literally as 120/80 (no other rewriting)', () => {
  assert.deepEqual(extractValues('Registra pressione 120 su 80 per questo ospite.'), {
    pa: '120/80',
  });
  assert.deepEqual(extractValues('il 30 su 09'), {}, 'a date-like pair is not a pressure');
  assert.deepEqual(extractValues('consumo 120 susine'), {});
  // QA M2: «su» is a pressure separator only next to «pressione»/«PA».
  assert.deepEqual(extractValues('Registra parametri: saturazione 95 su 100'), { spo2: '95' });
  assert.deepEqual(extractValues('Nota: Barthel 90 su 100'), {});
  assert.deepEqual(extractValues('saturazione 95 su 100 e pressione 130 su 85'), {
    pa: '130/85',
    spo2: '95',
  });
  assert.deepEqual(extractValues('pa 125 su 75'), { pa: '125/75' });
  assert.deepEqual(extractValues('la pressione è 120 su 80'), { pa: '120/80' });
  assert.deepEqual(extractValues('120/80'), { pa: '120/80' }, 'bare written pair unchanged');
  assert.deepEqual(extractValues('visita il 30/09'), {}, 'date unchanged');
});

// ── /skills/voice/* on the real app ─────────────────────────────────────────────────────────

test('voice status: capability-driven availability + VAD config', async () => {
  const forNurse = await call(base, nurse, 'GET', '/skills/voice/status');
  assert.equal(forNurse.status, 200, JSON.stringify(forNurse.body));
  assert.equal(forNurse.body.voiceAllowed, true);
  assert.equal(forNurse.body.locale, 'it-IT');
  assert.equal(forNurse.body.maxUtteranceBytes, MAX_UTTERANCE_BYTES);
  assert.equal(typeof forNurse.body.vad.endSilenceMs, 'number');
  const forAdmin = await call(base, admin, 'GET', '/skills/voice/status');
  assert.equal(forAdmin.body.voiceAllowed, false, 'administrator: voice.plan DENIED');
  const anonymous = await call(base, null, 'GET', '/skills/voice/status');
  assert.equal(anonymous.status, 401);
});

test('transcribe: auth, capability gate and audio validation before any provider call', async () => {
  let providerCalls = 0;
  setSttProvider({
    async transcribe(audio, locale) {
      providerCalls += 1;
      return scripted('ciao').transcribe(audio, locale);
    },
  });
  assert.equal((await upload(null, wav())).status, 401);
  const denied = await upload(admin, wav());
  assert.equal(denied.status, 403, JSON.stringify(denied.body));
  assert.equal(denied.body.code, 'voice_denied');
  assert.ok(
    await waitForAudit({
      operatorId: 'SIM-ADMIN',
      actionType: 'voice:transcribe',
      outcome: 'denied',
      channel: 'voce',
    }),
  );
  assert.equal((await upload(nurse, wav(), 'text/plain')).status, 400, 'not audio');
  assert.equal(
    (await upload(nurse, wav(), 'audio/webm')).status,
    400,
    'only validated containers (WAV) reach the provider',
  );
  assert.equal((await upload(nurse, Buffer.from('RIFF'))).status, 400, 'too short');
  assert.equal((await upload(nurse, Buffer.alloc(4000, 1))).status, 400, 'audio/wav but not RIFF');
  const tooBig = await upload(nurse, Buffer.alloc(MAX_UTTERANCE_BYTES + 10, 1));
  assert.equal(tooBig.status, 413, 'body over the utterance limit');
  process.env.VOICE_CHANNEL_ENABLED = 'false';
  try {
    const off = await upload(nurse, wav());
    assert.equal(off.status, 503, 'channel disabled in this environment');
    assert.equal(off.body.code, 'voice_disabled');
    const status = await call(base, nurse, 'GET', '/skills/voice/status');
    assert.equal(status.body.channelEnabled, false);
    assert.equal(status.body.sttConfigured, false);
  } finally {
    process.env.VOICE_CHANNEL_ENABLED = 'true';
  }
  assert.equal(providerCalls, 0, 'no invalid/unauthorized audio ever reaches the provider');
});

test('transcribe: transcript returned verbatim; audit has no text, no audio', async () => {
  const spoken = `Registra pressione 120 su 80 per Voce${Tag}`;
  setSttProvider(scripted(spoken));
  const result = await upload(nurse, wav(1500));
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.text, spoken);
  assert.equal(result.body.locale, 'it-IT');
  assert.equal(result.body.empty, false);
  assert.equal(result.body.metadata.provider, 'fake');
  const row = await waitForAudit({
    operatorId: 'SIM-NURSE-1',
    actionType: 'voice:transcribe',
    outcome: 'ok',
  });
  assert.ok(row, 'audit row written');
  const serialized = JSON.stringify(row);
  assert.equal(serialized.includes(`Voce${Tag}`), false, 'no transcript text in the audit');
  assert.equal(serialized.includes('pressione'), false);
  assert.ok((row!.fields as string[]).includes('audio:1-5s'));
});

test('I/J — provider failure and silence: typed error or empty, never an invented command', async () => {
  setSttProvider({
    async transcribe() {
      throw new SttUnavailableError('stt_unavailable', 'Trascrizione vocale non disponibile', 503);
    },
  });
  const down = await upload(nurse, wav());
  assert.equal(down.status, 503);
  assert.equal(down.body.code, 'stt_unavailable');
  setSttProvider({
    async transcribe() {
      throw new Error('boom');
    },
  });
  const crash = await upload(nurse, wav());
  assert.equal(crash.status, 502);
  assert.equal(crash.body.code, 'stt_provider_error');
  setSttProvider(scripted(''));
  const silent = await upload(nurse, wav());
  assert.equal(silent.status, 200);
  assert.equal(silent.body.empty, true);
  assert.equal(silent.body.text, '');
  assert.ok(
    await waitForAudit({
      operatorId: 'SIM-NURSE-1',
      actionType: 'voice:transcribe',
      outcome: 'empty',
    }),
  );
});

test('B/K — voice transcript → preview, zero write; spoken «conferma» never confirms; one write', async () => {
  const readings = () => prisma.patientParameterReading.count({ where: { patientId: ids.nurse } });
  const before = await readings();
  const context = { context: { currentPatientId: ids.nurse } };
  setSttProvider(scripted('Registra pressione 120 su 80 per questo ospite.'));
  const heard = await upload(nurse, wav(1800));
  assert.equal(heard.status, 200);
  const draft = await call(base, nurse, 'POST', '/skills/converse', {
    message: heard.body.text,
    inputChannel: 'voice',
    ...context,
  });
  assert.equal(draft.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(draft.body));
  assert.equal(draft.body.preview.values.Pressione, '120/80');
  assert.equal(await readings(), before, 'the transcript alone writes nothing');
  assert.ok(
    await waitForAudit({
      requestId: `skill-${draft.body.workflowId}`,
      actionType: 'skill:vitals.record:request',
      fields: { has: 'input:voice' },
    }),
    'the request audit records the voice origin',
  );

  setSttProvider(scripted('Conferma.'));
  const spokenYes = await upload(nurse, wav(600));
  const notConfirmed = await call(base, nurse, 'POST', '/skills/converse', {
    workflowId: draft.body.workflowId,
    message: spokenYes.body.text,
    inputChannel: 'voice',
    ...context,
  });
  assert.equal(notConfirmed.body.status, 'NEEDS_CONFIRMATION', JSON.stringify(notConfirmed.body));
  assert.match(notConfirmed.body.reply, /premi «Conferma»/);
  assert.equal(await readings(), before, 'a spoken «conferma» is not a confirmation');

  const confirmBody = {
    workflowId: draft.body.workflowId,
    action: 'confirm',
    previewId: draft.body.preview.previewId,
    ...context,
  };
  const [first, second] = await Promise.all([
    call(base, nurse, 'POST', '/skills/converse', confirmBody),
    call(base, nurse, 'POST', '/skills/converse', confirmBody),
  ]);
  const statuses = [first.body.status, second.body.status];
  assert.ok(statuses.includes('COMPLETED'), JSON.stringify(statuses));
  assert.equal(await readings(), before + 1, 'duplicate confirm → exactly one write');

  const bad = await call(base, nurse, 'POST', '/skills/converse', {
    message: 'ciao',
    inputChannel: 'telepathy',
  });
  assert.equal(bad.status, 400);
});

test('STT cost guard: per-operator utterance rate limit → 429, provider not called', async () => {
  let providerCalls = 0;
  setSttProvider({
    async transcribe(audio, locale) {
      providerCalls += 1;
      return scripted('ok').transcribe(audio, locale);
    },
  });
  let limited: Awaited<ReturnType<typeof upload>> | null = null;
  for (let i = 0; i < 25 && !limited; i += 1) {
    const r = await upload(nurse, wav(400));
    if (r.status === 429) limited = r;
  }
  assert.ok(limited, 'the 21st utterance within a minute is refused');
  assert.ok(providerCalls <= 20, `provider calls ${providerCalls}`);
});

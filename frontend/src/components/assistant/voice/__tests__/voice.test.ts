import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  audioReducer,
  canStartCapture,
  initialAudioSession,
  micOpen,
  type AudioEvent,
  type AudioSession,
} from '../audioSession';
import {
  RealtimeTransportError,
  openRealtimeTranscription,
  parseRealtimeEvent,
  type RealtimeEvent,
} from '../realtimeTransport';
import { SPOKEN_STATUS } from '../spokenStatus';
import { DEFAULT_VAD_CONFIG, createVad, rmsDb, type VadEvent } from '../vad';
import { STT_SAMPLE_RATE, encodeWav, resample, utteranceToWav } from '../wav';

const RATE = 48_000;
const FRAME = 2048;

function tone(ms: number, amplitude: number, hz = 220): Float32Array {
  const n = Math.round((RATE * ms) / 1000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / RATE);
  return out;
}

function noise(ms: number, amplitude: number, seed = 7): Float32Array {
  const n = Math.round((RATE * ms) / 1000);
  const out = new Float32Array(n);
  let x = seed;
  for (let i = 0; i < n; i += 1) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out[i] = amplitude * ((x / 2147483648) * 2 - 1);
  }
  return out;
}

function join(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Feeds a signal frame by frame; returns every event emitted. */
function run(signal: Float32Array, config = DEFAULT_VAD_CONFIG) {
  const vad = createVad(RATE, config);
  const events: VadEvent[] = [];
  for (let i = 0; i + FRAME <= signal.length; i += FRAME) {
    const event = vad.push(signal.subarray(i, i + FRAME));
    if (event) events.push(event);
  }
  return { vad, events };
}

// ── VAD ─────────────────────────────────────────────────────────────────────────────────────

test('VAD: speech between silences → one utterance (pre-roll kept, trailing silence ends it)', () => {
  const signal = join(noise(600, 0.001), tone(1200, 0.2), noise(1500, 0.001));
  const { events } = run(signal);
  assert.deepEqual(
    events.map((e) => e.type),
    ['speech_start', 'utterance'],
  );
  const utterance = events[1] as Extract<VadEvent, { type: 'utterance' }>;
  assert.ok(utterance.speechMs >= 1000 && utterance.speechMs <= 1400, String(utterance.speechMs));
  const seconds = utterance.samples.length / RATE;
  assert.ok(seconds > 1.2 && seconds < 2.6, `utterance length ${seconds}s`);
  assert.equal(utterance.capped, false);
});

test('VAD: silence only → no_speech after the timeout, nothing to send', () => {
  const { events } = run(noise(7000, 0.001));
  assert.deepEqual(events, [{ type: 'discarded', reason: 'no_speech' }]);
});

test('VAD: steady background noise is learned as floor → never «speech»', () => {
  const { events } = run(noise(7000, 0.05));
  assert.deepEqual(events, [{ type: 'discarded', reason: 'no_speech' }]);
});

test('VAD: a click / too-short sound is discarded, never sent', () => {
  const { events } = run(join(noise(600, 0.001), tone(150, 0.3), noise(1500, 0.001)));
  assert.deepEqual(events.at(-1), { type: 'discarded', reason: 'too_short' });
  assert.equal(
    events.some((e) => e.type === 'utterance'),
    false,
  );
});

test('VAD: pauses inside a sentence do not cut it; the max length caps it', () => {
  const sentence = join(
    noise(600, 0.001),
    tone(800, 0.2),
    noise(500, 0.001),
    tone(800, 0.2),
    noise(1500, 0.001),
  );
  const { events } = run(sentence);
  assert.deepEqual(
    events.map((e) => e.type),
    ['speech_start', 'utterance'],
  );
  const capped = run(join(noise(600, 0.001), tone(4000, 0.2)), {
    ...DEFAULT_VAD_CONFIG,
    maxUtteranceMs: 2000,
  });
  const last = capped.events.at(-1) as Extract<VadEvent, { type: 'utterance' }>;
  assert.equal(last.type, 'utterance');
  assert.equal(last.capped, true);
});

test('VAD: «Fine» (flush) closes the utterance now; with no speech it discards', () => {
  const { vad } = run(join(noise(600, 0.001), tone(900, 0.2)));
  const flushed = vad.flush();
  assert.equal(flushed.type, 'utterance');
  const quiet = run(noise(900, 0.001)).vad.flush();
  assert.deepEqual(quiet, { type: 'discarded', reason: 'no_speech' });
});

test('VAD: configurable end-of-turn silence', () => {
  const signal = join(
    noise(600, 0.001),
    tone(800, 0.2),
    noise(700, 0.001),
    tone(800, 0.2),
    noise(2500, 0.001),
  );
  const eager = run(signal, { ...DEFAULT_VAD_CONFIG, endSilenceMs: 400 });
  assert.equal(eager.events.filter((e) => e.type === 'utterance').length, 1);
  const first = eager.events.find((e) => e.type === 'utterance') as Extract<
    VadEvent,
    { type: 'utterance' }
  >;
  assert.ok(first.speechMs < 1100, 'short end-silence closes after the first phrase');
  const patient = run(signal, { ...DEFAULT_VAD_CONFIG, endSilenceMs: 1200 });
  const whole = patient.events.find((e) => e.type === 'utterance') as Extract<
    VadEvent,
    { type: 'utterance' }
  >;
  assert.ok(whole.speechMs > 2000, 'long end-silence keeps both phrases');
});

test('VAD (QA M4): speech starting right at the tap is detected and kept from the start', () => {
  // Syllable-like bursts from t=0 (no leading silence), gaps at room-noise level.
  const syllables: Float32Array[] = [];
  for (let i = 0; i < 6; i += 1) syllables.push(tone(220, 0.2), noise(90, 0.001, i + 3));
  const signal = join(...syllables, noise(1500, 0.001));
  const { events } = run(signal);
  const utterance = events.find((e) => e.type === 'utterance') as
    Extract<VadEvent, { type: 'utterance' }> | undefined;
  assert.ok(utterance, JSON.stringify(events.map((e) => e.type)));
  const speechSeconds = (6 * 310) / 1000;
  assert.ok(
    utterance.samples.length / RATE >= speechSeconds - 0.05,
    `kept ${utterance.samples.length / RATE}s of ${speechSeconds}s of speech`,
  );
});

test('VAD (QA M4): talking at the tap, then softer syllables → the sentence is not cut', () => {
  const parts: Float32Array[] = [];
  for (let i = 0; i < 4; i += 1) parts.push(tone(220, 0.25), noise(90, 0.001, i + 11));
  for (let i = 0; i < 6; i += 1) parts.push(tone(220, 0.03), noise(90, 0.001, i + 21));
  const { events } = run(join(...parts, noise(1500, 0.001)));
  const utterance = events.find((e) => e.type === 'utterance') as
    Extract<VadEvent, { type: 'utterance' }> | undefined;
  assert.ok(utterance, JSON.stringify(events.map((e) => e.type)));
  assert.ok(utterance.speechMs >= 2500, `voiced ${utterance.speechMs} ms of ≈3100`);
  assert.ok(utterance.samples.length / RATE >= 3.1, 'the whole sentence is kept');
});

test('rmsDb: silence is very low, a loud tone is near 0 dBFS', () => {
  assert.equal(rmsDb(new Float32Array(100)), -120);
  assert.ok(rmsDb(tone(50, 1)) > -4);
});

// ── WAV ─────────────────────────────────────────────────────────────────────────────────────

test('WAV: 16 kHz mono PCM16 header and samples', () => {
  const wav = encodeWav(new Float32Array([0, 1, -1, 0.5]), STT_SAMPLE_RATE);
  const view = new DataView(wav.buffer);
  const ascii = (o: number) => String.fromCharCode(...wav.slice(o, o + 4));
  assert.equal(ascii(0), 'RIFF');
  assert.equal(ascii(8), 'WAVE');
  assert.equal(ascii(36), 'data');
  assert.equal(view.getUint16(22, true), 1, 'mono');
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 8);
  assert.equal(view.getInt16(46, true), 0x7fff);
  assert.equal(view.getInt16(48, true), -0x8000);
});

test('WAV: resampling 48 kHz → 16 kHz keeps duration', () => {
  const second = tone(1000, 0.3);
  assert.equal(resample(second, RATE).length, 16_000);
  assert.equal(utteranceToWav(second, RATE).length, 44 + 32_000);
  assert.equal(resample(second, 16_000), second, 'same rate: untouched');
});

// ── audio session state machine ─────────────────────────────────────────────────────────────

function play(events: AudioEvent[], from: AudioSession = initialAudioSession) {
  return events.reduce(audioReducer, from);
}

test('session: push-to-talk happy path to AWAITING_CONFIRMATION and COMPLETED', () => {
  let s = play([{ type: 'start', residentId: 'r1' }, { type: 'listening' }]);
  assert.equal(s.state, 'LISTENING');
  assert.equal(micOpen(s.state), true);
  s = play([{ type: 'speech_start' }, { type: 'utterance', speechMs: 1800 }], s);
  assert.equal(s.state, 'TRANSCRIBING');
  assert.equal(micOpen(s.state), false, 'mic closed while transcribing');
  s = audioReducer(s, {
    type: 'transcribed',
    captureId: s.captureId,
    text: ' registra pressione 120 su 80 ',
    empty: false,
    sttMs: 1500,
  });
  assert.equal(s.state, 'TRANSCRIPT_FINAL');
  assert.equal(s.transcript, 'registra pressione 120 su 80', 'verbatim, only trimmed');
  s = audioReducer(s, { type: 'edit', text: 'registra pressione 130 su 80' });
  s = audioReducer(s, { type: 'submit' });
  assert.equal(s.state, 'PROCESSING');
  assert.equal(audioReducer(s, { type: 'submit' }), s, 'second submit ignored');
  s = audioReducer(s, { type: 'assistant', status: 'NEEDS_CONFIRMATION' });
  assert.equal(s.state, 'AWAITING_CONFIRMATION');
  s = audioReducer(s, { type: 'assistant', status: 'COMPLETED' });
  assert.equal(s.state, 'COMPLETED');
  assert.deepEqual(s.metrics, { speechMs: 1800, sttMs: 1500 });
});

test('session: a transcript is never sent by itself; empty STT goes back to IDLE', () => {
  let s = play([
    { type: 'start', residentId: null },
    { type: 'listening' },
    { type: 'speech_start' },
    { type: 'utterance', speechMs: 900 },
  ]);
  const ready = audioReducer(s, {
    type: 'transcribed',
    captureId: s.captureId,
    text: 'ciao',
    empty: false,
  });
  assert.equal(ready.state, 'TRANSCRIPT_FINAL', 'waits for the user');
  s = audioReducer(s, { type: 'transcribed', captureId: s.captureId, text: '', empty: true });
  assert.equal(s.state, 'IDLE');
  assert.match(s.notice ?? '', /nessun comando inviato/);
});

test('session: stale STT answers of a cancelled capture are ignored', () => {
  let s = play([
    { type: 'start', residentId: 'r1' },
    { type: 'listening' },
    { type: 'speech_start' },
    { type: 'utterance', speechMs: 900 },
  ]);
  const old = s.captureId;
  s = audioReducer(s, { type: 'cancel' });
  assert.equal(s.state, 'CANCELLED');
  const late = audioReducer(s, {
    type: 'transcribed',
    captureId: old,
    text: 'somministra',
    empty: false,
  });
  assert.equal(late, s);
  assert.equal(audioReducer(s, { type: 'failed', captureId: old, code: 'x', message: 'x' }), s);
});

test('session: resident change discards a pending transcript (never re-targeted)', () => {
  let s = play([
    { type: 'start', residentId: 'r1' },
    { type: 'listening' },
    { type: 'speech_start' },
    { type: 'utterance', speechMs: 900 },
  ]);
  s = audioReducer(s, {
    type: 'transcribed',
    captureId: s.captureId,
    text: 'registra pressione 120/80',
    empty: false,
  });
  s = audioReducer(s, { type: 'resident_changed', residentId: 'r2' });
  assert.equal(s.state, 'CANCELLED');
  assert.equal(s.transcript, '');
  assert.match(s.notice ?? '', /Ospite cambiato/);
  assert.equal(audioReducer(s, { type: 'submit' }), s, 'nothing left to submit');
});

test('session: STT / mic failures → ERROR with a code (text fallback), no transcript', () => {
  const s = play([
    { type: 'start', residentId: null },
    { type: 'listening' },
    { type: 'failed', code: 'mic_denied', message: 'Permesso negato' },
  ]);
  assert.equal(s.state, 'ERROR');
  assert.equal(s.errorCode, 'mic_denied');
  assert.equal(canStartCapture(s.state), true, 'retry allowed');
});

test('session: no new capture while audio or a request is in flight', () => {
  for (const state of [
    'REQUESTING_PERMISSION',
    'LISTENING',
    'SPEECH_ACTIVE',
    'TRANSCRIPT_PARTIAL',
    'TRANSCRIBING',
    'PROCESSING',
  ] as const) {
    const s = { ...initialAudioSession, state };
    assert.equal(audioReducer(s, { type: 'start', residentId: null }), s, state);
  }
});

test('session: discarded audio (silence / too short) → IDLE with a notice', () => {
  const s = play([
    { type: 'start', residentId: null },
    { type: 'listening' },
    { type: 'discarded', reason: 'no_speech' },
  ]);
  assert.equal(s.state, 'IDLE');
  assert.match(s.notice ?? '', /non è stato inviato nulla/);
});

test('spoken feedback never carries clinical data: fixed phrases only', () => {
  for (const phrase of Object.values(SPOKEN_STATUS))
    assert.doesNotMatch(phrase ?? '', /\d|mg|pressione|ospite/i);
});

// ── Azure gpt-live-transcribe: partial vs final, realtime events, WebRTC transport ─────────────

test('session: start → REQUESTING_PERMISSION; LISTENING only when the mic/transport is ready', () => {
  const s = audioReducer(initialAudioSession, { type: 'start', residentId: null });
  assert.equal(s.state, 'REQUESTING_PERMISSION');
  assert.equal(micOpen(s.state), false);
  assert.equal(audioReducer(s, { type: 'speech_start' }), s, 'no speech before listening');
  assert.equal(audioReducer(s, { type: 'listening' }).state, 'LISTENING');
  assert.equal(audioReducer(s, { type: 'cancel' }).state, 'CANCELLED', 'cancel while requesting');
});

test('session: PARTIAL transcripts are display-only — never submittable, never final', () => {
  let s = play([
    { type: 'start', residentId: 'r1' },
    { type: 'listening' },
    { type: 'speech_start' },
  ]);
  const id = s.captureId;
  s = audioReducer(s, { type: 'partial', captureId: id, delta: 'Registra ', atMs: 420 });
  assert.equal(s.state, 'TRANSCRIPT_PARTIAL');
  assert.equal(micOpen(s.state), true, 'still listening while partials arrive');
  s = audioReducer(s, { type: 'partial', captureId: id, delta: 'pressione', atMs: 600 });
  assert.equal(s.partial, 'Registra pressione');
  assert.equal(s.metrics.firstPartialMs, 420);
  assert.equal(audioReducer(s, { type: 'submit' }), s, 'a partial can never be sent');
  assert.equal(audioReducer(s, { type: 'edit', text: 'x' }), s, 'a partial is not editable');
  assert.equal(
    audioReducer(s, { type: 'partial', captureId: id - 1, delta: 'old' }),
    s,
    'late delta of an older capture ignored',
  );
  s = audioReducer(s, { type: 'utterance', speechMs: 1500 });
  assert.equal(s.state, 'TRANSCRIBING');
  s = audioReducer(s, { type: 'partial', captureId: id, delta: ' 120 su 80' });
  assert.equal(s.state, 'TRANSCRIBING', 'deltas after the commit do not reopen anything');
  s = audioReducer(s, {
    type: 'transcribed',
    captureId: id,
    text: 'Registra pressione 120 su 80.',
    empty: false,
    sttMs: 350,
  });
  assert.equal(s.state, 'TRANSCRIPT_FINAL');
  assert.equal(s.partial, '', 'partial cleared by the final');
  assert.equal(audioReducer(s, { type: 'submit' }).state, 'PROCESSING', 'only the final is sent');
});

test('parseRealtimeEvent: delta / completed / failed / error / ignored', () => {
  assert.deepEqual(
    parseRealtimeEvent({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'i1',
      delta: 'Ciao',
    }),
    { kind: 'partial', itemId: 'i1', delta: 'Ciao' },
  );
  assert.deepEqual(
    parseRealtimeEvent({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'i1',
      transcript: 'Ciao a tutti.',
    }),
    { kind: 'final', itemId: 'i1', transcript: 'Ciao a tutti.' },
  );
  assert.equal(
    parseRealtimeEvent({ type: 'conversation.item.input_audio_transcription.failed', error: {} })
      ?.kind,
    'failed',
  );
  assert.deepEqual(
    parseRealtimeEvent({ type: 'error', error: { code: 'input_audio_buffer_commit_empty' } }),
    {
      kind: 'error',
      code: 'input_audio_buffer_commit_empty',
      message: 'Errore del servizio realtime',
    },
  );
  assert.equal(parseRealtimeEvent({ type: 'session.updated' }), null);
  assert.equal(parseRealtimeEvent('nope'), null);
});

class FakeChannel {
  readyState = 'connecting';
  sent: string[] = [];
  private listeners: Record<string, ((e: { data?: string }) => void)[]> = {};
  addEventListener(type: string, fn: (e: { data?: string }) => void) {
    (this.listeners[type] ??= []).push(fn);
  }
  emit(type: string, data?: unknown) {
    if (type === 'open') this.readyState = 'open';
    for (const fn of this.listeners[type] ?? []) fn({ data: JSON.stringify(data) });
  }
  send(m: string) {
    this.sent.push(m);
  }
  close() {
    this.readyState = 'closed';
  }
}

function fakePeer() {
  const state = { channel: new FakeChannel(), tracks: 0, closed: false, remote: '' };
  class Peer {
    addTrack() {
      state.tracks += 1;
    }
    createDataChannel(label: string) {
      assert.equal(label, 'oai-events');
      return state.channel;
    }
    async createOffer() {
      return { type: 'offer', sdp: 'v=0 offer' };
    }
    async setLocalDescription() {}
    async setRemoteDescription(d: { sdp: string }) {
      state.remote = d.sdp;
      setTimeout(() => state.channel.emit('open'), 5);
    }
    close() {
      state.closed = true;
    }
  }
  return { state, Peer: Peer as unknown as typeof RTCPeerConnection };
}

const stream = { getAudioTracks: () => [{}] } as unknown as MediaStream;

test('WebRTC transport: SDP negotiated by ClinicOS (no token in the browser), events, commit, close', async () => {
  const { state, Peer } = fakePeer();
  const offers: string[] = [];
  const negotiate = async (offer: string) => {
    offers.push(offer);
    return 'v=0 answer';
  };
  const events: RealtimeEvent[] = [];
  const transport = await openRealtimeTranscription(negotiate, stream, (e) => events.push(e), {
    Peer,
  });
  assert.deepEqual(offers, ['v=0 offer']);
  assert.equal(state.remote, 'v=0 answer');
  assert.equal(state.tracks, 1);
  state.channel.emit('message', {
    type: 'conversation.item.input_audio_transcription.delta',
    item_id: 'i',
    delta: 'Ciao',
  });
  transport.commit();
  assert.deepEqual(JSON.parse(state.channel.sent[0]), { type: 'input_audio_buffer.commit' });
  state.channel.emit('message', {
    type: 'conversation.item.input_audio_transcription.completed',
    item_id: 'i',
    transcript: 'Ciao.',
  });
  assert.deepEqual(
    events.map((e) => e.kind),
    ['partial', 'final'],
  );
  transport.close();
  assert.equal(state.closed, true);
  transport.commit();
  assert.equal(state.channel.sent.length, 1, 'no commit after close');
});

test('WebRTC transport: negotiation refused → typed error, peer closed', async () => {
  const { state, Peer } = fakePeer();
  const refused = async () => {
    throw Object.assign(new Error('Trascrizione vocale non disponibile'), {
      code: 'stt_unavailable',
    });
  };
  await assert.rejects(
    openRealtimeTranscription(refused, stream, () => {}, { Peer }),
    (e: unknown) => e instanceof RealtimeTransportError && e.code === 'stt_unavailable',
  );
  assert.equal(state.closed, true);
});

test('WebRTC transport: cancel during negotiation closes the peer; a dropped link is reported', async () => {
  const pending = fakePeer();
  const controller = new AbortController();
  const slow = (_offer: string, signal: AbortSignal) =>
    new Promise<string>((_resolve, reject) =>
      signal.addEventListener('abort', () => reject(new Error('aborted'))),
    );
  const opening = openRealtimeTranscription(slow, stream, () => {}, {
    Peer: pending.Peer,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(opening);
  assert.equal(pending.state.closed, true, 'nothing keeps streaming after a cancel');

  const live = fakePeer();
  const events: RealtimeEvent[] = [];
  await openRealtimeTranscription(
    async () => 'v=0 answer',
    stream,
    (e) => events.push(e),
    {
      Peer: live.Peer,
    },
  );
  live.state.channel.emit('close');
  assert.deepEqual(events.at(-1), {
    kind: 'error',
    code: 'realtime_disconnected',
    message: 'Connessione di trascrizione interrotta',
  });
  assert.equal(live.state.closed, true);
});

test('WebRTC transport: a brief «disconnected» is tolerated, «failed» is reported at once', async () => {
  const listeners: Record<string, (() => void)[]> = {};
  const { state, Peer: BasePeer } = fakePeer();
  const Base = BasePeer as unknown as new () => object;
  class Peer extends Base {
    connectionState = 'connected';
    addEventListener(type: string, fn: () => void) {
      (listeners[type] ??= []).push(fn);
    }
  }
  const events: RealtimeEvent[] = [];
  const created: Peer[] = [];
  const Tracked = class extends Peer {
    constructor() {
      super();
      created.push(this);
    }
  } as unknown as typeof RTCPeerConnection;
  await openRealtimeTranscription(
    async () => 'v=0 answer',
    stream,
    (e) => events.push(e),
    {
      Peer: Tracked,
    },
  );
  const set = (s: string) => {
    created[0].connectionState = s;
    for (const fn of listeners.connectionstatechange ?? []) fn();
  };
  set('disconnected');
  set('connected');
  await new Promise((r) => setTimeout(r, 3_100));
  assert.equal(events.length, 0, 'recovered within the grace period: no error');
  set('failed');
  assert.equal(events.at(-1)?.kind, 'error');
  assert.equal(state.closed, true);
});

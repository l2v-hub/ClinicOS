import assert from 'node:assert/strict';
import { test } from 'node:test';
import { audioReducer, canStartCapture, initialAudioSession, micOpen } from '../audioSession';
import { openRealtimeTranscription, parseRealtimeEvent } from '../realtimeTransport';

test('realtime parser accepts bounded provider partial and final events', () => {
  assert.deepEqual(
    parseRealtimeEvent(
      { type: 'conversation.item.input_audio_transcription.delta', item_id: 'i1', delta: 'ciao' },
    ),
    { kind: 'partial', itemId: 'i1', delta: 'ciao' },
  );
  assert.deepEqual(
    parseRealtimeEvent(
      { type: 'conversation.item.input_audio_transcription.completed', item_id: 'i1', transcript: 'ciao mondo' },
    ),
    { kind: 'final', itemId: 'i1', transcript: 'ciao mondo' },
  );
  assert.deepEqual(parseRealtimeEvent({ type: 'input_audio_buffer.committed' }), {
    kind: 'committed',
  });
  assert.equal(parseRealtimeEvent('{malformed'), null);
  assert.equal(parseRealtimeEvent('x'.repeat(2001)), null);
  assert.equal(
    parseRealtimeEvent(
      { type: 'conversation.item.input_audio_transcription.delta', item_id: 'i1', delta: 'x'.repeat(2001) },
    ),
    null,
  );
  assert.equal(
    parseRealtimeEvent(
      { type: 'conversation.item.input_audio_transcription.completed', item_id: 'i1', transcript: 'x'.repeat(2001) },
    ),
    null,
  );
});

test('realtime parser retains item ids and replaces provider errors with fixed messages', () => {
  assert.deepEqual(
    parseRealtimeEvent(
      { type: 'conversation.item.input_audio_transcription.failed', item_id: 'i2', error: { message: 'secret provider detail' } },
    ),
    { kind: 'failed', message: 'Trascrizione non riuscita' },
  );
  assert.deepEqual(
    parseRealtimeEvent(
      { type: 'error', error: { code: 'provider_failure', message: 'secret provider detail' } },
    ),
    { kind: 'error', code: 'provider_failure', message: 'Errore del servizio realtime' },
  );
});

test('audio session waits for permission, displays partials without submission, and accepts only matching final', () => {
  let s = audioReducer(initialAudioSession, { type: 'start', residentId: 'r1' });
  const captureId = s.captureId;
  assert.equal(s.state, 'REQUESTING_PERMISSION');
  assert.equal(micOpen(s.state), false);
  assert.equal(canStartCapture(s.state), false);

  s = audioReducer(s, { type: 'listening' });
  assert.equal(s.state, 'LISTENING');
  assert.equal(micOpen(s.state), true);
  s = audioReducer(s, { type: 'partial', captureId, delta: 'registra ' });
  s = audioReducer(s, { type: 'partial', captureId, delta: 'pressione' });
  assert.equal(s.state, 'TRANSCRIPT_PARTIAL');
  assert.equal(s.partial, 'registra pressione');
  assert.equal(micOpen(s.state), true);
  assert.equal(canStartCapture(s.state), false);
  assert.equal(audioReducer(s, { type: 'submit' }), s, 'partial text cannot be submitted');

  s = audioReducer(s, { type: 'utterance', speechMs: 900 });
  assert.equal(s.state, 'TRANSCRIBING');
  const stale = audioReducer(s, {
    type: 'transcribed', captureId: captureId - 1, text: 'stale', empty: false,
  });
  assert.equal(stale, s);
  s = audioReducer(s, {
    type: 'transcribed', captureId, text: ' registra pressione 120 su 80 ', empty: false,
  });
  assert.equal(s.state, 'TRANSCRIPT_READY');
  assert.equal(s.transcript, 'registra pressione 120 su 80');
  assert.equal(s.partial, '');
});

test('cancel and resident change invalidate pending partial capture text', () => {
  let s = audioReducer(initialAudioSession, { type: 'start', residentId: 'r1' });
  const cancelledCapture = s.captureId;
  s = audioReducer(s, { type: 'partial', captureId: cancelledCapture, delta: 'segreto' });
  s = audioReducer(s, { type: 'cancel' });
  assert.equal(s.state, 'CANCELLED');
  assert.equal(s.partial, '');
  assert.notEqual(s.captureId, cancelledCapture);
  assert.equal(audioReducer(s, { type: 'partial', captureId: cancelledCapture, delta: 'in ritardo' }), s);

  s = audioReducer(initialAudioSession, { type: 'start', residentId: 'r1' });
  const changedCapture = s.captureId;
  s = audioReducer(s, { type: 'partial', captureId: changedCapture, delta: 'bozza' });
  s = audioReducer(s, { type: 'resident_changed', residentId: 'r2' });
  assert.equal(s.state, 'CANCELLED');
  assert.equal(s.partial, '');
  assert.notEqual(s.captureId, changedCapture);
});

class FakeChannel extends EventTarget {
  readyState = 'open';
  sent: string[] = [];
  closed = false;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 'closed';
  }

  dispatchEvent(event: Event) {
    const dispatched = super.dispatchEvent(event);
    if (event.type === 'message') this.onmessage?.(event as MessageEvent);
    if (event.type === 'open') this.onopen?.(event);
    if (event.type === 'close') this.onclose?.(event);
    return dispatched;
  }
}

class FakePeer extends EventTarget {
  static instances: FakePeer[] = [];
  connectionState = 'new';
  iceGatheringState = 'complete';
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  channel = new FakeChannel();
  closed = false;

  constructor() {
    super();
    FakePeer.instances.push(this);
  }

  addTrack() {}

  createDataChannel() {
    return this.channel;
  }

  async createOffer() {
    return { type: 'offer', sdp: 'offer-sdp' } as RTCSessionDescriptionInit;
  }

  async setLocalDescription(description: RTCSessionDescriptionInit) {
    this.localDescription = description;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    this.remoteDescription = description;
    this.connectionState = 'connected';
  }

  close() {
    this.closed = true;
    this.connectionState = 'closed';
  }
}

function resetPeers() {
  FakePeer.instances = [];
}

const stream = { getAudioTracks: () => [] } as unknown as MediaStream;
const fakePeerOptions = { Peer: FakePeer as unknown as typeof RTCPeerConnection };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => (resolve = yes));
  return { promise, resolve };
}

test('transport rejects a pre-aborted signal before creating a peer', async () => {
  resetPeers();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    openRealtimeTranscription(async () => 'answer-sdp', stream, () => {}, {
      ...fakePeerOptions,
      signal: controller.signal,
    }),
  );
  assert.equal(FakePeer.instances.length, 0);
});

test('transport cancellation during negotiation closes peer and channel', async () => {
  resetPeers();
  const controller = new AbortController();
  const negotiation = deferred<string>();
  const opening = openRealtimeTranscription(() => negotiation.promise, stream, () => {}, {
    ...fakePeerOptions,
    signal: controller.signal,
    connectTimeoutMs: 1000,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(FakePeer.instances.length, 1);
  controller.abort();
  await assert.rejects(opening);
  assert.equal(FakePeer.instances[0].closed, true);
  assert.equal(FakePeer.instances[0].channel.closed, true);
});

test('transport negotiation timeout closes peer and channel', async () => {
  resetPeers();
  await assert.rejects(
    openRealtimeTranscription(() => new Promise<string>(() => {}), stream, () => {}, {
      ...fakePeerOptions,
      connectTimeoutMs: 5,
    }),
  );
  assert.equal(FakePeer.instances[0].closed, true);
  assert.equal(FakePeer.instances[0].channel.closed, true);
});

test('transport commits at most once and close ignores later channel events', async () => {
  resetPeers();
  const events: unknown[] = [];
  const transport = await openRealtimeTranscription(async (offer) => {
    assert.equal(offer, 'offer-sdp');
    return 'answer-sdp';
  }, stream, (event) => events.push(event), fakePeerOptions);
  const peer = FakePeer.instances[0];
  assert.equal(peer.remoteDescription?.sdp, 'answer-sdp');
  await transport.commit();
  await transport.commit();
  assert.equal(peer.channel.sent.length, 1);
  assert.match(peer.channel.sent[0], /commit/);

  transport.close();
  peer.channel.dispatchEvent(new MessageEvent('message', {
    data: JSON.stringify({ type: 'conversation.item.input_audio_transcription.delta', item_id: 'i1', delta: 'late' }),
  }));
  assert.deepEqual(events, []);
  assert.equal(peer.closed, true);
  assert.equal(peer.channel.closed, true);
});

test('transport removes its abort listener when closed', async () => {
  resetPeers();
  const controller = new AbortController();
  let added = 0;
  let removed = 0;
  const signal = controller.signal;
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  signal.addEventListener = ((...args: Parameters<AbortSignal['addEventListener']>) => {
    if (args[0] === 'abort') added += 1;
    return add(...args);
  }) as AbortSignal['addEventListener'];
  signal.removeEventListener = ((...args: Parameters<AbortSignal['removeEventListener']>) => {
    if (args[0] === 'abort') removed += 1;
    return remove(...args);
  }) as AbortSignal['removeEventListener'];
  const transport = await openRealtimeTranscription(async () => 'answer-sdp', stream, () => {}, {
    ...fakePeerOptions,
    signal,
  });
  assert.equal(added, 1);
  transport.close();
  assert.equal(removed, 1);
});

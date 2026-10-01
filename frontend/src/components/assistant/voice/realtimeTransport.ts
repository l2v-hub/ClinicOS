// Phase 5 — realtime transport: browser WebRTC → Azure OpenAI Realtime API (GA) transcription
// session (`gpt-live-transcribe`). The SDP offer goes to ClinicOS, which mints the ephemeral session
// (configuration fixed server-side) and performs the exchange with Azure: neither the Azure key nor
// the ephemeral token ever reaches the browser, and no browser → Azure HTTP call is needed (CSP
// unchanged). Media then flows browser ↔ Azure over WebRTC.
//
//   offer ──▶ POST /skills/voice/realtime-call ──▶ runtime ──▶ Azure /openai/v1/realtime/calls
//   mic track ──WebRTC──▶ Azure
//   data channel "oai-events":  ◀ …input_audio_transcription.delta  (PARTIAL, display only)
//                               ▶ input_audio_buffer.commit         (local VAD end of turn / «Fine»)
//                               ◀ …input_audio_transcription.completed (FINAL)
//
// gpt-live-transcribe has no server VAD: the turn is committed by the client (our local VAD).

/**
 * SDP negotiation done by ClinicOS (backend → runtime → Azure `/openai/v1/realtime/calls` with an
 * ephemeral token minted and used server-side). Resolves with the SDP answer.
 */
export type NegotiateCall = (offerSdp: string, signal: AbortSignal) => Promise<string>;

export type RealtimeEvent =
  | { kind: 'partial'; itemId: string; delta: string }
  | { kind: 'final'; itemId: string; transcript: string }
  | { kind: 'failed'; message: string }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'committed' };

/** Pure: one Realtime server event → what ClinicOS cares about (null = ignore). */
export function parseRealtimeEvent(raw: unknown): RealtimeEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const itemId = typeof e.item_id === 'string' ? e.item_id : '';
  switch (e.type) {
    case 'conversation.item.input_audio_transcription.delta':
      return typeof e.delta === 'string' ? { kind: 'partial', itemId, delta: e.delta } : null;
    case 'conversation.item.input_audio_transcription.completed':
      return {
        kind: 'final',
        itemId,
        transcript: typeof e.transcript === 'string' ? e.transcript : '',
      };
    case 'conversation.item.input_audio_transcription.failed': {
      const err = (e.error ?? {}) as Record<string, unknown>;
      return { kind: 'failed', message: String(err.message ?? 'Trascrizione non riuscita') };
    }
    case 'input_audio_buffer.committed':
      return { kind: 'committed' };
    case 'error': {
      const err = (e.error ?? {}) as Record<string, unknown>;
      return {
        kind: 'error',
        code: String(err.code ?? err.type ?? 'error'),
        message: String(err.message ?? 'Errore del servizio realtime'),
      };
    }
    default:
      return null;
  }
}

export class RealtimeTransportError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface RealtimeTransport {
  /** End of the spoken turn: ask for the FINAL transcript. */
  commit(): void;
  /** Close the session (mic track is released by the capture hook). */
  close(): void;
}

const CONNECT_TIMEOUT_MS = 10_000;
const DISCONNECT_GRACE_MS = 3_000;

export async function openRealtimeTranscription(
  negotiate: NegotiateCall,
  stream: MediaStream,
  onEvent: (event: RealtimeEvent) => void,
  deps: { Peer?: typeof RTCPeerConnection; signal?: AbortSignal } = {},
): Promise<RealtimeTransport> {
  const Peer = deps.Peer ?? globalThis.RTCPeerConnection;
  if (!Peer)
    throw new RealtimeTransportError('webrtc_unsupported', 'Il browser non supporta WebRTC');
  const abort = new AbortController();
  deps.signal?.addEventListener('abort', () => abort.abort(), { once: true });
  const pc = new Peer();
  for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
  const channel = pc.createDataChannel('oai-events');
  let closed = false;
  let ready = false;
  const close = () => {
    if (closed) return;
    closed = true;
    abort.abort();
    try {
      channel.close();
    } catch {
      /* already closed */
    }
    pc.close();
  };
  // A dropped connection is reported at once (not after the final-transcript timeout).
  const dropped = () => {
    if (closed || !ready) return;
    close();
    onEvent({
      kind: 'error',
      code: 'realtime_disconnected',
      message: 'Connessione di trascrizione interrotta',
    });
  };
  channel.addEventListener('close', dropped);
  // `failed` is final; `disconnected` is often transient on tablet Wi-Fi: fatal only if it lasts.
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  pc.addEventListener?.('connectionstatechange', () => {
    if (disconnectTimer) clearTimeout(disconnectTimer);
    disconnectTimer = null;
    if (pc.connectionState === 'failed') dropped();
    else if (pc.connectionState === 'disconnected')
      disconnectTimer = setTimeout(() => {
        if (pc.connectionState === 'disconnected') dropped();
      }, DISCONNECT_GRACE_MS);
  });
  channel.addEventListener('message', (message: MessageEvent) => {
    if (closed) return;
    try {
      const event = parseRealtimeEvent(JSON.parse(String(message.data)));
      if (event) onEvent(event);
    } catch {
      /* non-JSON frame: ignored */
    }
  });
  try {
    if (abort.signal.aborted) throw new RealtimeTransportError('realtime_cancelled', 'Annullato');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // Raced with the abort: a cancel can never leave the negotiation hanging.
    const answer = await new Promise<string>((resolve, reject) => {
      const cancelled = () => reject(new RealtimeTransportError('realtime_cancelled', 'Annullato'));
      if (abort.signal.aborted) return cancelled();
      abort.signal.addEventListener('abort', cancelled, { once: true });
      negotiate(offer.sdp ?? '', abort.signal).then(resolve, reject);
    });
    if (abort.signal.aborted) throw new RealtimeTransportError('realtime_cancelled', 'Annullato');
    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
    if (channel.readyState !== 'open')
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new RealtimeTransportError('realtime_timeout', 'Connessione realtime troppo lenta'),
            ),
          CONNECT_TIMEOUT_MS,
        );
        channel.addEventListener('open', () => {
          clearTimeout(timer);
          resolve();
        });
        abort.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new RealtimeTransportError('realtime_cancelled', 'Annullato'));
        });
      });
  } catch (error) {
    close();
    if (error instanceof RealtimeTransportError) throw error;
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : 'realtime_failed';
    throw new RealtimeTransportError(
      code,
      error instanceof Error && error.message ? error.message : 'Connessione realtime non riuscita',
    );
  }
  ready = true;
  return {
    commit() {
      if (!closed && channel.readyState === 'open')
        channel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    },
    close,
  };
}

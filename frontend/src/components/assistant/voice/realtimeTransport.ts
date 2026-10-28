// Optional realtime transport. SDP negotiation is proxied by ClinicOS; credentials remain server-side.
// Partial text is display-only; only a local end-of-turn commit requests a final transcript.
export type NegotiateCall = (offerSdp: string, signal: AbortSignal) => Promise<string>;
export type RealtimeEvent =
  | { kind: 'partial'; itemId: string; delta: string }
  | { kind: 'final'; itemId: string; transcript: string }
  | { kind: 'failed'; message: string }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'committed' };

export function parseRealtimeEvent(raw: unknown): RealtimeEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const itemId = typeof e.item_id === 'string' ? e.item_id.slice(0, 200) : '';
  switch (e.type) {
    case 'conversation.item.input_audio_transcription.delta':
      return typeof e.delta === 'string' && e.delta.length <= 2000
        ? { kind: 'partial', itemId, delta: e.delta }
        : null;
    case 'conversation.item.input_audio_transcription.completed':
      return typeof e.transcript === 'string' && e.transcript.length <= 2000
        ? { kind: 'final', itemId, transcript: e.transcript }
        : null;
    case 'conversation.item.input_audio_transcription.failed':
      return { kind: 'failed', message: 'Trascrizione non riuscita' };
    case 'input_audio_buffer.committed':
      return { kind: 'committed' };
    case 'error': {
      const err =
        e.error && typeof e.error === 'object' ? (e.error as Record<string, unknown>) : {};
      return {
        kind: 'error',
        code: typeof err.code === 'string' ? err.code.slice(0, 80) : 'error',
        message: 'Errore del servizio realtime',
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
  commit(): void;
  close(): void;
}

export async function openRealtimeTranscription(
  negotiate: NegotiateCall,
  stream: MediaStream,
  onEvent: (event: RealtimeEvent) => void,
  deps: { Peer?: typeof RTCPeerConnection; signal?: AbortSignal; connectTimeoutMs?: number } = {},
): Promise<RealtimeTransport> {
  const cancelled = () => new RealtimeTransportError('realtime_cancelled', 'Annullato');
  if (deps.signal?.aborted) throw cancelled();
  const Peer = deps.Peer ?? globalThis.RTCPeerConnection;
  if (!Peer)
    throw new RealtimeTransportError('webrtc_unsupported', 'Il browser non supporta WebRTC');
  const abort = new AbortController();
  const pc = new Peer();
  let channel: RTCDataChannel | null = null;
  let closed = false;
  let ready = false;
  let committed = false;
  let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  const relayAbort = () => close();
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(disconnectTimer);
    clearTimeout(connectTimer);
    deps.signal?.removeEventListener('abort', relayAbort);
    abort.abort();
    try {
      channel?.close();
    } catch {
      /* already closed */
    }
    pc.close();
  };
  deps.signal?.addEventListener('abort', relayAbort, { once: true });
  if (deps.signal?.aborted) {
    close();
    throw cancelled();
  }
  const dropped = () => {
    if (closed || !ready) return;
    close();
    onEvent({
      kind: 'error',
      code: 'realtime_disconnected',
      message: 'Connessione di trascrizione interrotta',
    });
  };
  try {
    for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
    channel = pc.createDataChannel('oai-events');
    channel.addEventListener('close', dropped);
    pc.addEventListener('connectionstatechange', () => {
      clearTimeout(disconnectTimer);
      if (pc.connectionState === 'failed') dropped();
      else if (pc.connectionState === 'disconnected')
        disconnectTimer = setTimeout(() => {
          if (pc.connectionState === 'disconnected') dropped();
        }, 3000);
    });
    channel.addEventListener('message', (message: MessageEvent) => {
      if (closed || typeof message.data !== 'string' || message.data.length > 12_000) return;
      try {
        const event = parseRealtimeEvent(JSON.parse(message.data));
        if (event) onEvent(event);
      } catch {
        /* ignore malformed provider messages */
      }
    });
    const connect = async () => {
      const check = () => {
        if (abort.signal.aborted) throw cancelled();
      };
      const offer = await pc.createOffer();
      check();
      await pc.setLocalDescription(offer);
      check();
      const answer = await negotiate(offer.sdp ?? '', abort.signal);
      check();
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      check();
      if (channel!.readyState !== 'open')
        await new Promise<void>((resolve, reject) => {
          const opened = () => {
            cleanup();
            resolve();
          };
          const stopped = () => {
            cleanup();
            reject(cancelled());
          };
          const cleanup = () => {
            channel?.removeEventListener('open', opened);
            abort.signal.removeEventListener('abort', stopped);
          };
          channel!.addEventListener('open', opened, { once: true });
          abort.signal.addEventListener('abort', stopped, { once: true });
          if (abort.signal.aborted) stopped();
        });
    };
    await new Promise<void>((resolve, reject) => {
      const stopped = () => {
        cleanup();
        reject(cancelled());
      };
      const cleanup = () => {
        clearTimeout(connectTimer);
        abort.signal.removeEventListener('abort', stopped);
      };
      connectTimer = setTimeout(() => {
        cleanup();
        reject(new RealtimeTransportError('realtime_timeout', 'Connessione realtime troppo lenta'));
      }, deps.connectTimeoutMs ?? 15_000);
      abort.signal.addEventListener('abort', stopped, { once: true });
      connect().then(
        () => {
          cleanup();
          resolve();
        },
        (error) => {
          cleanup();
          reject(error);
        },
      );
    });
    if (abort.signal.aborted) throw cancelled();
    ready = true;
    return {
      commit() {
        if (!closed && !committed && channel?.readyState === 'open') {
          committed = true;
          try {
            channel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
          } catch {
            dropped();
          }
        }
      },
      close,
    };
  } catch (error) {
    close();
    if (error instanceof RealtimeTransportError) throw error;
    throw new RealtimeTransportError('realtime_failed', 'Connessione realtime non riuscita');
  }
}

// Phase 5 — speech-to-text contract (provider-neutral). Voice is a CHANNEL: the transcript it
// produces is shown to the user and then enters the SAME Assistant path as typed text
// (/skills/converse). Nothing here interprets or acts.
//
//   SpeechToTextProvider.transcribe(audio, locale, context?) → TranscriptResult
//
// Default provider: the AI runtime (`POST {AI_RUNTIME_URL}/v1/voice/transcribe`), which owns the
// provider credentials and the model choice (AI_STT_MODEL, e.g. google:gemini-3.5-flash-lite).
// Audio lives only in memory for the duration of the request; it is never stored or logged.

export interface Utterance {
  bytes: Buffer;
  mimeType: string;
  /** Captured speech duration reported by the client (after VAD trimming). */
  durationMs?: number;
  /** Where the audio came from (browser mic today; clip-on / wearable later). Never used by skills. */
  source?: string;
}

export interface TranscriptResult {
  text: string;
  locale: string;
  /** Provider confidence when available (Gemini: not provided). */
  confidence: number | null;
  timestamps: { startMs: number; endMs: number; text: string }[];
  /** True when the provider heard no intelligible speech: nothing must be sent to the Assistant. */
  empty: boolean;
  metadata: {
    provider: string;
    model: string;
    durationMs: number;
    roundTripMs: number;
    /** Provider token counts when reported (cost measurement). */
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  };
  error?: { code: string; message: string };
}

/**
 * Realtime (WebRTC) negotiation result for the browser: the SDP ANSWER only. The provider API key
 * AND the ephemeral session token stay server-side (the runtime mints the token and performs the
 * SDP exchange itself); the session configuration is fixed there.
 */
export interface RealtimeCallAnswer {
  sdp: string;
  model: string;
  deployment: string;
  /** Unix seconds of the ephemeral session token, as reported by the provider. */
  expiresAt: number | null;
  transport: 'webrtc';
  /** Test-only provider (AI_STT_PROVIDER=mock). */
  mock?: boolean;
}

export interface SpeechToTextProvider {
  /** Server transport: one finished utterance → final transcript. */
  transcribe(
    audio: Utterance,
    locale: string,
    context?: { requestId?: string },
  ): Promise<TranscriptResult>;
  /** Realtime transport (optional per provider): SDP offer → SDP answer (browser WebRTC). */
  negotiateRealtimeCall?(
    offerSdp: string,
    context?: { requestId?: string },
  ): Promise<RealtimeCallAnswer>;
}

export class SttUnavailableError extends Error {
  constructor(
    public readonly code:
      'stt_unavailable' | 'stt_timeout' | 'stt_provider_error' | 'stt_invalid_audio',
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const STT_TIMEOUT_MS = 25_000;

function runtimeError(status: number, body: Record<string, unknown> | null): SttUnavailableError {
  const detail = (body?.detail ?? {}) as { kind?: string; message?: string };
  const byKind: Record<string, string> = {
    not_configured:
      'Trascrizione vocale non disponibile: servizio o deployment STT non configurato',
    auth_failed: 'Trascrizione vocale: credenziali del servizio STT non valide',
    rate_limited: 'Trascrizione vocale: troppe richieste al servizio STT, riprova tra poco',
    unavailable: 'Servizio di trascrizione non raggiungibile',
  };
  if (status === 503 || (detail.kind && detail.kind in byKind))
    return new SttUnavailableError(
      'stt_unavailable',
      byKind[detail.kind ?? ''] ?? 'Trascrizione vocale non disponibile',
      503,
    );
  if (status === 504)
    return new SttUnavailableError('stt_timeout', 'Trascrizione troppo lenta', 504);
  if (status === 400 && detail.kind === 'invalid_sdp')
    return new SttUnavailableError('stt_provider_error', 'Negoziazione WebRTC non valida', 502);
  if (status === 400) return new SttUnavailableError('stt_invalid_audio', 'Audio non valido', 400);
  return new SttUnavailableError('stt_provider_error', 'Errore del servizio di trascrizione', 502);
}

export function createRuntimeSttProvider(
  env: NodeJS.ProcessEnv = process.env,
): SpeechToTextProvider {
  return {
    async negotiateRealtimeCall(offerSdp) {
      const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
      const token = env.AI_RUNTIME_SERVICE_TOKEN;
      if (!base || !token)
        throw new SttUnavailableError(
          'stt_unavailable',
          'Trascrizione vocale non configurata',
          503,
        );
      let response: Response;
      try {
        response = await fetch(`${base}/v1/voice/realtime-call`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sdp: offerSdp }),
          signal: AbortSignal.timeout(18_000),
        });
      } catch (error) {
        const timeout = error instanceof Error && error.name === 'TimeoutError';
        throw new SttUnavailableError(
          timeout ? 'stt_timeout' : 'stt_unavailable',
          timeout
            ? 'Connessione di trascrizione troppo lenta'
            : 'Servizio di trascrizione non raggiungibile',
          timeout ? 504 : 503,
        );
      }
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) throw runtimeError(response.status, body);
      if (typeof body?.sdp !== 'string' || !body.sdp.startsWith('v='))
        throw new SttUnavailableError('stt_provider_error', 'Risposta SDP non valida', 502);
      return {
        sdp: body.sdp,
        model: String(body.model ?? ''),
        deployment: String(body.deployment ?? ''),
        expiresAt: typeof body.expiresAt === 'number' ? body.expiresAt : null,
        transport: 'webrtc',
        ...(body.mock === true ? { mock: true } : {}),
      };
    },
    async transcribe(audio, locale) {
      const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
      const token = env.AI_RUNTIME_SERVICE_TOKEN;
      if (!base || !token)
        throw new SttUnavailableError(
          'stt_unavailable',
          'Trascrizione vocale non configurata',
          503,
        );
      const t0 = Date.now();
      let response: Response;
      try {
        response = await fetch(`${base}/v1/voice/transcribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: audio.bytes.toString('base64'),
            mime_type: audio.mimeType,
            locale,
          }),
          signal: AbortSignal.timeout(STT_TIMEOUT_MS),
        });
      } catch (error) {
        const timeout = error instanceof Error && error.name === 'TimeoutError';
        throw new SttUnavailableError(
          timeout ? 'stt_timeout' : 'stt_unavailable',
          timeout ? 'Trascrizione troppo lenta' : 'Servizio di trascrizione non raggiungibile',
          timeout ? 504 : 503,
        );
      }
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        const detail = (body?.detail ?? {}) as { kind?: string };
        if (response.status === 503 || detail.kind === 'not_configured')
          throw new SttUnavailableError(
            'stt_unavailable',
            'Trascrizione vocale non disponibile',
            503,
          );
        if (response.status === 504)
          throw new SttUnavailableError('stt_timeout', 'Trascrizione troppo lenta', 504);
        if (response.status === 400)
          throw new SttUnavailableError('stt_invalid_audio', 'Audio non valido', 400);
        throw new SttUnavailableError(
          'stt_provider_error',
          'Errore del servizio di trascrizione',
          502,
        );
      }
      const metadata = (body?.metadata ?? {}) as {
        provider?: string;
        model?: string;
        durationMs?: number;
        usage?: Record<string, unknown>;
      };
      const usage = Object.fromEntries(
        ['inputTokens', 'outputTokens', 'totalTokens']
          .map((k) => [k, metadata.usage?.[k]])
          .filter(([, v]) => typeof v === 'number'),
      );
      const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 2000) : '';
      return {
        text,
        locale: typeof body?.locale === 'string' ? body.locale : locale,
        confidence: typeof body?.confidence === 'number' ? body.confidence : null,
        timestamps: [],
        empty: body?.empty === true || !text,
        metadata: {
          provider: String(metadata.provider ?? 'runtime'),
          model: String(metadata.model ?? ''),
          durationMs: Number(metadata.durationMs ?? 0),
          roundTripMs: Date.now() - t0,
          ...(Object.keys(usage).length ? { usage } : {}),
        },
      };
    },
  };
}

/** WAV sanity check (RIFF/WAVE, PCM) — other containers are validated by the provider. */
export function looksLikeWav(bytes: Buffer): boolean {
  return (
    bytes.length > 44 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WAVE'
  );
}

// WAV only: it is the only container validated here (RIFF/WAVE) before a paid provider call.
// Other containers (webm/ogg from a future device) need their own validation first.
export const STT_MIME_TYPES = new Set(['audio/wav', 'audio/x-wav']);
export const MAX_UTTERANCE_BYTES = 2 * 1024 * 1024;
/** ~30 ms of 16 kHz PCM16: anything shorter cannot hold a word. */
export const MIN_UTTERANCE_BYTES = 1000;

/**
 * Per-environment switch of the voice channel (default OFF). The AI runtime is shared between
 * environments, so enabling STT there must not silently turn voice on everywhere: each backend
 * opts in with VOICE_CHANNEL_ENABLED=true (sending audio to the STT provider is a privacy decision).
 */
export function voiceChannelEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.VOICE_CHANNEL_ENABLED || '').trim().toLowerCase() === 'true';
}

export interface RuntimeSttStatus {
  available: boolean;
  provider: string | null;
  model: string | null;
  deployment: string | null;
  transports: string[];
}

const NO_STT: RuntimeSttStatus = {
  available: false,
  provider: null,
  model: null,
  deployment: null,
  transports: [],
};
let runtimeStatusCache: { at: number; status: RuntimeSttStatus } | null = null;

/** The runtime's STT configuration (GET /v1/voice/stt-status, cached 60 s). No secrets. */
export async function runtimeSttStatus(
  env: NodeJS.ProcessEnv = process.env,
): Promise<RuntimeSttStatus> {
  const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
  const token = env.AI_RUNTIME_SERVICE_TOKEN;
  if (!base || !token) return NO_STT;
  if (runtimeStatusCache && Date.now() - runtimeStatusCache.at < 60_000)
    return runtimeStatusCache.status;
  let status: RuntimeSttStatus = NO_STT;
  try {
    const response = await fetch(`${base}/v1/voice/stt-status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2_000),
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (response.ok && body?.available === true)
      status = {
        available: true,
        provider: typeof body.provider === 'string' ? body.provider : null,
        model: typeof body.model === 'string' ? body.model : null,
        deployment: typeof body.deployment === 'string' ? body.deployment : null,
        transports: Array.isArray(body.transports) ? body.transports.map(String) : ['server'],
      };
  } catch {
    status = NO_STT;
  }
  runtimeStatusCache = { at: Date.now(), status };
  return status;
}

/** Non-destructive STT diagnostic (endpoint, auth, deployment) from the runtime. */
export async function runtimeSttHealth(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Record<string, unknown>> {
  const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
  const token = env.AI_RUNTIME_SERVICE_TOKEN;
  if (!base || !token) return { ok: false, code: 'runtime_not_configured' };
  try {
    const response = await fetch(`${base}/v1/voice/health`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !body) return { ok: false, code: 'runtime_error', status: response.status };
    const pick = ['ok', 'code', 'message', 'provider', 'deployment', 'model', 'endpointHost'];
    return Object.fromEntries(pick.filter((k) => k in body).map((k) => [k, body[k]]));
  } catch {
    return { ok: false, code: 'runtime_unreachable' };
  }
}

/** Realtime transport for this backend: VOICE_STT_TRANSPORT (webrtc|server), else what the STT offers. */
export function voiceTransport(
  status: RuntimeSttStatus,
  env: NodeJS.ProcessEnv = process.env,
): 'webrtc' | 'server' {
  const wanted = (env.VOICE_STT_TRANSPORT || '').trim().toLowerCase();
  if (wanted === 'server') return 'server';
  return status.transports.includes('webrtc') ? 'webrtc' : 'server';
}

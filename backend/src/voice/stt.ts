// Phase 5 — speech-to-text contract (provider-neutral). Voice is a CHANNEL: the transcript it
// produces is shown to the user and then enters the SAME Assistant path as typed text
// (/skills/converse). Nothing here interprets or acts.
//
//   SpeechToTextProvider.transcribe(audio, locale, context?) → TranscriptResult
//
// Default provider: the AI runtime (`POST {AI_RUNTIME_URL}/v1/voice/transcribe`), which owns the
// provider credentials and the model choice (AI_STT_MODEL, e.g. google:gemini-3.5-flash-lite).
// Audio lives only in memory for the duration of the request; it is never stored or logged.

import { classifyAiFailure, correlationHeaders, recordAiCall } from '../lib/observability.js';
import { aiEnabled } from '../lib/ai-flags.js';
import type { AiCallMeta } from '../lib/observability.js';

/** STT metadata -> provider-agnostic call metadata (provider/model/usage), never the transcript. */
function sttMeta(body: Record<string, unknown> | null): AiCallMeta | undefined {
  const meta = body?.metadata as
    { provider?: string; model?: string; usage?: AiCallMeta['usage'] } | undefined;
  return meta
    ? { provider: meta.provider, model: meta.model, role: 'stt', usage: meta.usage }
    : undefined;
}

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

export interface RealtimeCallAnswer {
  sdp: string;
  model: string;
  deployment: string;
  expiresAt: number | null;
  transport: 'webrtc';
}

export interface SpeechToTextProvider {
  negotiateRealtimeCall?(
    offerSdp: string,
    context?: { requestId?: string; signal?: AbortSignal },
  ): Promise<RealtimeCallAnswer>;
  transcribe(
    audio: Utterance,
    locale: string,
    context?: { requestId?: string },
  ): Promise<TranscriptResult>;
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

export function createRuntimeSttProvider(
  env: NodeJS.ProcessEnv = process.env,
): SpeechToTextProvider {
  return {
    async negotiateRealtimeCall(offerSdp, context) {
      const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
      const token = env.AI_RUNTIME_SERVICE_TOKEN;
      if (!base || !token)
        throw new SttUnavailableError(
          'stt_unavailable',
          'Trascrizione vocale non configurata',
          503,
        );
      const signal = context?.signal
        ? AbortSignal.any([context.signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000);
      let response: Response;
      try {
        response = await fetch(`${base}/v1/voice/realtime-call`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...correlationHeaders(),
          },
          body: JSON.stringify({ sdp: offerSdp }),
          signal,
        });
        const body = await boundedRuntimeJson(response);
        if (!response.ok)
          throw new SttUnavailableError(
            response.status === 504
              ? 'stt_timeout'
              : response.status === 503
                ? 'stt_unavailable'
                : 'stt_provider_error',
            'Trascrizione realtime non disponibile',
            response.status === 504 ? 504 : response.status === 503 ? 503 : 502,
          );
        if (
          typeof body?.sdp !== 'string' ||
          !body.sdp.startsWith('v=0') ||
          Buffer.byteLength(body.sdp) > 64_000
        )
          throw new SttUnavailableError('stt_provider_error', 'Risposta SDP non valida', 502);
        // Allowlist only the answer metadata: credentials from a malformed runtime cannot escape.
        return {
          sdp: body.sdp,
          model: typeof body.model === 'string' ? body.model.slice(0, 200) : '',
          deployment: typeof body.deployment === 'string' ? body.deployment.slice(0, 200) : '',
          expiresAt:
            typeof body.expiresAt === 'number' && Number.isFinite(body.expiresAt)
              ? body.expiresAt
              : null,
          transport: 'webrtc',
        };
      } catch (error) {
        if (error instanceof SttUnavailableError) throw error;
        const timeout = error instanceof Error && error.name === 'TimeoutError';
        throw new SttUnavailableError(
          timeout ? 'stt_timeout' : 'stt_unavailable',
          timeout ? 'Connessione realtime troppo lenta' : 'Trascrizione realtime non disponibile',
          timeout ? 504 : 503,
        );
      }
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
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...correlationHeaders(),
          },
          body: JSON.stringify({
            audio_base64: audio.bytes.toString('base64'),
            mime_type: audio.mimeType,
            locale,
          }),
          signal: AbortSignal.timeout(STT_TIMEOUT_MS),
        });
      } catch (error) {
        const timeout = error instanceof Error && error.name === 'TimeoutError';
        recordAiCall('stt', classifyAiFailure(error), Date.now() - t0);
        throw new SttUnavailableError(
          timeout ? 'stt_timeout' : 'stt_unavailable',
          timeout ? 'Trascrizione troppo lenta' : 'Servizio di trascrizione non raggiungibile',
          timeout ? 504 : 503,
        );
      }
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      // Phase 9: audio size is recorded as bytes in the size slot (never the audio itself).
      recordAiCall(
        'stt',
        response.ok ? (body ? 'ok' : 'malformed') : classifyAiFailure(null, response.status),
        Date.now() - t0,
        audio.bytes.length,
        sttMeta(body),
      );
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
  return aiEnabled(env) && (env.VOICE_CHANNEL_ENABLED || '').trim().toLowerCase() === 'true';
}

export interface RuntimeSttStatus {
  available: boolean;
  realtime: { enabled: boolean; available: boolean; model: string | null; transports: string[] };
}
const NO_STT: RuntimeSttStatus = {
  available: false,
  realtime: { enabled: false, available: false, model: null, transports: [] },
};

async function boundedRuntimeJson(response: Response): Promise<Record<string, unknown> | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 96_000)
        throw new SttUnavailableError('stt_provider_error', 'Risposta STT troppo grande', 502);
      chunks.push(value);
    }
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return data !== null && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof SttUnavailableError) throw error;
    return null;
  } finally {
    reader.releaseLock();
  }
}

/** Configuration availability only; never creates a session or claims provider readiness.
 * No cross-environment cache: changing the runtime/credential cannot reuse another backend's status.
 */
export async function runtimeSttStatus(
  env: NodeJS.ProcessEnv = process.env,
): Promise<RuntimeSttStatus> {
  const base = env.AI_RUNTIME_URL?.replace(/\/$/, '');
  const token = env.AI_RUNTIME_SERVICE_TOKEN;
  if (!base || !token) return NO_STT;
  try {
    const response = await fetch(`${base}/v1/voice/stt-status`, {
      headers: { Authorization: `Bearer ${token}`, ...correlationHeaders() },
      signal: AbortSignal.timeout(2_000),
    });
    const body = await boundedRuntimeJson(response);
    if (!response.ok || !body) return NO_STT;
    const rt =
      body.realtime && typeof body.realtime === 'object'
        ? (body.realtime as Record<string, unknown>)
        : {};
    return {
      available: body.available === true,
      realtime: {
        enabled: rt.enabled === true,
        available: rt.available === true,
        model: typeof rt.model === 'string' ? rt.model.slice(0, 200) : null,
        transports:
          Array.isArray(rt.transports) && rt.transports.includes('webrtc') ? ['webrtc'] : [],
      },
    };
  } catch {
    return NO_STT;
  }
}

export async function runtimeSttAvailable(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  return (await runtimeSttStatus(env)).available;
}

/** WebRTC requires explicit opt-in in the runtime. The existing file path stays the default. */
export function voiceTransport(
  status: RuntimeSttStatus,
  env: NodeJS.ProcessEnv = process.env,
): 'webrtc' | 'server' {
  return (env.VOICE_STT_TRANSPORT || '').trim().toLowerCase() !== 'server' &&
    status.realtime.enabled
    ? 'webrtc'
    : 'server';
}

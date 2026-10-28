// Phase 5 — voice channel client: `/skills/voice/*`. Same identity headers as the Assistant; the
// backend gates the channel with the existing `voice.plan` capability.

import { API_URL } from '../../../config';
import { operatorHeaders } from '../../../lib/operatorSession';
import { AssistantHttpError } from '../assistantApi';
import { DEFAULT_VAD_CONFIG, type VadConfig } from './vad';

export interface VoiceStatus {
  voiceAllowed: boolean;
  transport?: 'server' | 'webrtc';
  /** VOICE_CHANNEL_ENABLED on this backend (per environment, default off). */
  channelEnabled: boolean;
  /** Channel on AND the runtime has an STT model configured. */
  sttConfigured: boolean;
  locale: string;
  maxUtteranceBytes: number;
  vad: VadConfig & { sessionIdleTimeoutMs?: number };
}

export interface VoiceTranscript {
  text: string;
  locale: string;
  confidence: number | null;
  empty: boolean;
  metadata: { provider: string; model: string; durationMs: number; roundTripMs: number };
}

export async function loadVoiceStatus(): Promise<VoiceStatus> {
  const response = await fetch(`${API_URL}/skills/voice/status`, {
    cache: 'no-store',
    headers: { ...operatorHeaders() },
  });
  if (!response.ok) throw new AssistantHttpError(response.status, 'Stato voce non disponibile');
  const body = (await response.json()) as VoiceStatus;
  return { ...body, vad: { ...DEFAULT_VAD_CONFIG, ...(body.vad ?? {}) } };
}

/** Sends ONE finished utterance. Throws AssistantHttpError with the backend code on failure. */
export async function transcribeUtterance(
  wav: Uint8Array,
  speechMs: number,
  signal?: AbortSignal,
): Promise<VoiceTranscript> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/skills/voice/transcribe`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        ...operatorHeaders(),
        'Content-Type': 'audio/wav',
        'X-Utterance-Ms': String(Math.round(speechMs)),
        'X-Audio-Source': 'browser-mic',
      },
      body: new Blob([wav as BlobPart], { type: 'audio/wav' }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AssistantHttpError(
      0,
      'Servizio di trascrizione non raggiungibile.',
      'stt_unreachable',
    );
  }
  const body = (await response.json().catch(() => null)) as
    (VoiceTranscript & { error?: string; code?: string }) | null;
  if (!response.ok)
    throw new AssistantHttpError(
      response.status,
      body?.error || `Trascrizione non riuscita (${response.status}).`,
      response.status === 413 ? 'utterance_too_long' : body?.code,
    );
  return body as VoiceTranscript;
}

/** SDP only. Provider credentials and ephemeral session tokens stay in the runtime. */
export async function negotiateRealtimeCall(
  offerSdp: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${API_URL}/skills/voice/realtime-call`, {
    method: 'POST',
    cache: 'no-store',
    headers: { ...operatorHeaders(), 'Content-Type': 'application/sdp' },
    body: offerSdp,
    signal,
  });
  const body = (await response.json().catch(() => null)) as { sdp?: unknown; code?: string } | null;
  if (!response.ok)
    throw new AssistantHttpError(
      response.status,
      'Trascrizione realtime non disponibile',
      body?.code,
    );
  if (
    typeof body?.sdp !== 'string' ||
    !body.sdp.startsWith('v=0') ||
    new TextEncoder().encode(body.sdp).length > 64_000
  )
    throw new AssistantHttpError(502, 'Risposta SDP non valida', 'stt_provider_error');
  return body.sdp;
}

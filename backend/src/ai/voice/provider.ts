// Issue #201: a server-side STT provider seam + a deterministic fake for tests.
//
// Audio is transcribed CLIENT-SIDE (Web Speech API) and never reaches this backend, so the only
// server-side "voice provider" concern is probing whether a configured STT model advertises the
// required capabilities (config.ts::REQUIRED_STT_CAPABILITIES). Real capability verification lives in
// the AI runtime and needs live credentials — untestable deterministically. This module introduces a
// small `VoiceSttProvider` interface and a `FakeVoiceSttProvider` test double (success / failure /
// timeout) so the degradation logic can be covered without any provider credentials or network.
//
// It changes NO runtime behaviour: `sttStatus()` keeps reporting configured intent. `probeSttStatus()`
// is an opt-in helper (used by tests now, available for future runtime wiring, e.g. #195/#198).

import {
  REQUIRED_STT_CAPABILITIES,
  loadVoiceConfig,
  type SttStatus,
  type VoiceConfig,
} from './config.js';

export interface SttProbeResult {
  model: string;
  capabilities: readonly string[];
}

/** A provider that can probe server-side STT capabilities. Rejects on provider error; must honour the
 *  AbortSignal so the caller can enforce a timeout. */
export interface VoiceSttProvider {
  probe(signal?: AbortSignal): Promise<SttProbeResult>;
}

export type FakeSttMode = 'success' | 'failure' | 'timeout';

export interface FakeVoiceSttProviderOptions {
  mode?: FakeSttMode;
  model?: string;
  /** Capabilities returned in 'success' mode (default: exactly the required set). */
  capabilities?: readonly string[];
  /** Error thrown/rejected in 'failure' mode. */
  error?: Error;
}

/** Deterministic STT provider double. No network, no credentials.
 *  - success: resolves with the configured capabilities.
 *  - failure: rejects with the configured error.
 *  - timeout: never resolves on its own — resolves ONLY if the caller's AbortSignal fires (rejected).
 */
export class FakeVoiceSttProvider implements VoiceSttProvider {
  private readonly opts: Required<Pick<FakeVoiceSttProviderOptions, 'mode' | 'model'>> &
    FakeVoiceSttProviderOptions;

  constructor(opts: FakeVoiceSttProviderOptions = {}) {
    this.opts = {
      mode: opts.mode ?? 'success',
      model: opts.model ?? 'fake:stt-it',
      capabilities: opts.capabilities,
      error: opts.error,
    };
  }

  probe(signal?: AbortSignal): Promise<SttProbeResult> {
    const { mode, model } = this.opts;
    if (mode === 'success') {
      return Promise.resolve({
        model,
        capabilities: this.opts.capabilities ?? [...REQUIRED_STT_CAPABILITIES],
      });
    }
    if (mode === 'failure') {
      return Promise.reject(this.opts.error ?? new Error('provider non disponibile'));
    }
    // 'timeout': settle only when aborted by the caller's timeout.
    return new Promise<SttProbeResult>((_resolve, reject) => {
      if (signal?.aborted) return reject(abortError());
      signal?.addEventListener('abort', () => reject(abortError()), { once: true });
    });
  }
}

function abortError(): Error {
  const e = new Error('probe aborted');
  e.name = 'AbortError';
  return e;
}

/** Probe a provider and map the outcome to an SttStatus, enforcing a timeout.
 *  Degraded (never throws) on: no model configured, missing capabilities, provider error, or timeout. */
export async function probeSttStatus(
  provider: VoiceSttProvider,
  cfg: VoiceConfig = loadVoiceConfig(),
  opts: { timeoutMs?: number } = {},
): Promise<SttStatus> {
  if (!cfg.sttModel) {
    return {
      available: false,
      model: null,
      degraded: true,
      reason: 'AI_STT_MODEL non configurato',
    };
  }
  const timeoutMs = opts.timeoutMs ?? 3000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await provider.probe(ac.signal);
    const missing = REQUIRED_STT_CAPABILITIES.filter((c) => !res.capabilities.includes(c));
    if (missing.length > 0) {
      return {
        available: false,
        model: res.model,
        degraded: true,
        reason: `capability mancanti: ${missing.join(', ')}`,
      };
    }
    return { available: true, model: res.model, degraded: false };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      available: false,
      model: cfg.sttModel,
      degraded: true,
      reason: isTimeout
        ? `timeout STT (${timeoutMs}ms)`
        : `provider STT non disponibile: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

import { loadAiConfig } from '../../config.js';
import { ImportSessionError, object, type Json } from './model.js';
export type RuntimeUnit = {
  externalId: string;
  inputHash: string;
  mode: 'ocr' | 'extraction';
  files: Array<{ filename: string; mime_type: string; content_base64: string; sort_order: number }>;
  schema: unknown;
  prompt: string;
  runtimeJobId: string | null;
  runtimeAttempt: number;
};
export async function executeRuntimeUnit(
  unit: RuntimeUnit,
  checkpoint: (id: string, attempt: number) => Promise<void>,
  current: () => Promise<void>,
  pollMs = 1000,
): Promise<{ data: unknown; model: string }> {
  const cfg = loadAiConfig();
  const base = process.env.AI_RUNTIME_URL?.replace(/\/$/, '');
  const token = process.env.AI_RUNTIME_SERVICE_TOKEN;
  if (!base || !token)
    throw new ImportSessionError(503, 'runtime_config', 'Servizio di elaborazione non configurato');
  async function request(path: string, body?: unknown, allow404 = false) {
    await current();
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(Math.min(cfg.requestTimeoutMs, 300000)),
    });
    if (response.status === 404 && allow404) return null;
    if (!response.ok)
      throw new ImportSessionError(
        response.status,
        'runtime_http',
        response.status === 413
          ? 'La pagina supera il limite di elaborazione. Riduci la dimensione e riprova.'
          : `Servizio di elaborazione non disponibile (HTTP ${response.status})`,
      );
    return object(await response.json());
  }
  function assertEcho(value: Json, expected?: number) {
    if (
      value.input_hash !== unit.inputHash ||
      !Number.isSafeInteger(value.attempt) ||
      Number(value.attempt) < 0 ||
      (expected !== undefined && value.attempt !== expected)
    )
      throw new ImportSessionError(
        503,
        'runtime_contract',
        'Risposta del servizio non coerente con il tentativo corrente',
      );
  }
  function assertComplete(value: Json) {
    const reason = String(value.finish_reason ?? '').toLowerCase();
    const kind = String(object(value.error).kind ?? '');
    if (
      value.truncated === true ||
      [
        'length',
        'max_tokens',
        'max_output_tokens',
        'output_truncated',
        'output_incomplete',
        'incomplete',
      ].includes(reason) ||
      ['output_truncated', 'output_incomplete'].includes(kind)
    )
      throw new ImportSessionError(
        422,
        kind === 'output_incomplete' ? 'output_incomplete' : 'output_truncated',
        'Testo non completo. Rivedi o rifai la pagina.',
      );
  }
  let expectedAttempt = unit.runtimeAttempt;
  let runtimeId = unit.runtimeJobId;
  let state = runtimeId
    ? await request(`/v1/document-jobs/${encodeURIComponent(runtimeId)}`, undefined, true)
    : null;
  if (!state) {
    const body = {
      external_job_id: unit.externalId,
      input_hash: unit.inputHash,
      files: unit.files,
      schema: unit.schema,
      prompt: unit.prompt,
    };
    const capabilities = await request('/v1/runtime/capabilities');
    if (capabilities?.document_job_contract_version !== 2)
      throw new ImportSessionError(
        503,
        'runtime_contract',
        'Il servizio di elaborazione deve essere aggiornato prima di procedere',
      );
    const max = Number(capabilities.max_upload_bytes);
    if (Number.isFinite(max) && max > 0 && Buffer.byteLength(JSON.stringify(body)) > max)
      throw new ImportSessionError(
        413,
        'runtime_size',
        'La pagina supera il limite del servizio. Riduci la dimensione e riprova.',
      );
    state = (await request('/v1/document-jobs', body))!;
    assertEcho(state);
    runtimeId = String(state.job_id ?? state.id ?? '');
    if (!runtimeId)
      throw new ImportSessionError(503, 'runtime_contract', 'Risposta del servizio non valida');
    expectedAttempt = Number(state.attempt);
    await checkpoint(runtimeId, expectedAttempt);
  } else {
    assertEcho(state);
    // The next attempt is persisted before run/retry. A lost request may still leave
    // the previous terminal/created state, which is retried with the same CAS value.
    const pendingRequest =
      ['created', 'failed', 'retryable_error'].includes(String(state.status)) &&
      state.attempt === expectedAttempt - 1;
    if (!pendingRequest) assertEcho(state, expectedAttempt);
  }
  assertComplete(state);
  if (['failed', 'retryable_error'].includes(String(state.status))) {
    const previousAttempt = Number(state.attempt);
    expectedAttempt = previousAttempt + 1;
    await checkpoint(runtimeId!, expectedAttempt);
    state = (await request(`/v1/document-jobs/${encodeURIComponent(runtimeId!)}/retry`, {
      expected_attempt: previousAttempt,
    }))!;
  } else if (state.status === 'created') {
    expectedAttempt = Number(state.attempt) + 1;
    await checkpoint(runtimeId!, expectedAttempt);
    state = (await request(`/v1/document-jobs/${encodeURIComponent(runtimeId!)}/run`, {
      mode: unit.mode,
    }))!;
  }
  assertEcho(state, expectedAttempt);
  assertComplete(state);
  const deadline = Date.now() + cfg.jobMaxDurationMs;
  while (Date.now() < deadline) {
    await current();
    if (state.status === 'review_ready') {
      const result = (await request(`/v1/document-jobs/${encodeURIComponent(runtimeId!)}/result`))!;
      assertEcho(result, expectedAttempt);
      assertComplete(result);
      if (result.truncated === true || result.status !== 'review_ready' || !result.data)
        throw new ImportSessionError(
          422,
          'output_truncated',
          'Elaborazione incompleta. Rivedi o rifai la pagina.',
        );
      return { data: result.data, model: String(result.model ?? 'runtime') };
    }
    if (['failed', 'retryable_error', 'cancelled'].includes(String(state.status))) {
      const kind = String(object(state.error).kind ?? 'runtime_failed');
      throw new ImportSessionError(
        503,
        ['output_truncated', 'output_incomplete'].includes(kind) ? kind : 'runtime_failed',
        ['output_truncated', 'output_incomplete'].includes(kind)
          ? 'Testo non completo. Rivedi o rifai la pagina.'
          : 'Elaborazione non riuscita. Le altre pagine sono conservate.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    state = (await request(`/v1/document-jobs/${encodeURIComponent(runtimeId!)}`))!;
    assertEcho(state, expectedAttempt);
    assertComplete(state);
  }
  throw new ImportSessionError(
    503,
    'runtime_timeout',
    'Tempo di elaborazione superato. Riprova la pagina.',
  );
}

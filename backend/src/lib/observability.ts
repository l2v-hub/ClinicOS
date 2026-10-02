// Phase 9: technical observability — correlation id, structured access log, in-process metrics.
//
// OBSERVABILITY ≠ AUDIT. The audit table (AiAuditEvent, append-only) stays the durable business /
// security record; this module only carries technical telemetry. Nothing here may contain clinical
// content: no bodies, no query strings, no patient names, no prompts, no tokens. Path segments that
// look like identifiers are collapsed to ':id' so a log line never names a resident.
//
//   X-Request-Id  accepted from the caller when well formed (≤64 [A-Za-z0-9._-]), else generated;
//                 echoed on the response and forwarded to the AI runtime (correlationHeaders()).
//   /metrics      Prometheus text format, only with `Authorization: Bearer $METRICS_TOKEN`
//                 (404 when METRICS_TOKEN is unset — fail closed, no anonymous telemetry).

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

/** Correlation id of the HTTP request being served (undefined outside a request). */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Headers to forward on service-to-service calls so the runtime logs the same correlation id. */
export function correlationHeaders(): Record<string, string> {
  const id = currentRequestId();
  return id ? { 'X-Request-Id': id } : {};
}

/** Run `fn` inside a correlation context (tests, background jobs). */
export function withRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

// ── Metrics registry (single process; Railway runs one replica) ─────────────────────────────────

type Labels = Record<string, string>;
const counters = new Map<string, { help: string; values: Map<string, number> }>();
const LATENCY_BUCKETS_MS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000];
const histograms = new Map<
  string,
  { help: string; series: Map<string, { buckets: number[]; sum: number; count: number }> }
>();

function labelKey(labels: Labels): string {
  return Object.keys(labels)
    .sort()
    .map(
      (key) =>
        `${key}="${String(labels[key])
          .replace(/["\\\n]/g, '_')
          .slice(0, 60)}"`,
    )
    .join(',');
}

export function incCounter(name: string, help: string, labels: Labels = {}, by = 1): void {
  let metric = counters.get(name);
  if (!metric) {
    metric = { help, values: new Map() };
    counters.set(name, metric);
  }
  const key = labelKey(labels);
  metric.values.set(key, (metric.values.get(key) ?? 0) + by);
}

export function observeHistogram(name: string, help: string, labels: Labels, value: number): void {
  let metric = histograms.get(name);
  if (!metric) {
    metric = { help, series: new Map() };
    histograms.set(name, metric);
  }
  const key = labelKey(labels);
  let series = metric.series.get(key);
  if (!series) {
    series = { buckets: LATENCY_BUCKETS_MS.map(() => 0), sum: 0, count: 0 };
    metric.series.set(key, series);
  }
  LATENCY_BUCKETS_MS.forEach((bound, i) => {
    if (value <= bound) series!.buckets[i] += 1;
  });
  series.sum += value;
  series.count += 1;
}

/** Test hook. */
export function resetMetrics(): void {
  counters.clear();
  histograms.clear();
}

export function renderMetrics(): string {
  const lines: string[] = [];
  for (const [name, metric] of counters) {
    lines.push(`# HELP ${name} ${metric.help}`, `# TYPE ${name} counter`);
    for (const [key, value] of metric.values)
      lines.push(`${name}${key ? `{${key}}` : ''} ${value}`);
  }
  for (const [name, metric] of histograms) {
    lines.push(`# HELP ${name} ${metric.help}`, `# TYPE ${name} histogram`);
    for (const [key, series] of metric.series) {
      const prefix = key ? `${key},` : '';
      LATENCY_BUCKETS_MS.forEach((bound, i) =>
        lines.push(`${name}_bucket{${prefix}le="${bound}"} ${series.buckets[i]}`),
      );
      lines.push(`${name}_bucket{${prefix}le="+Inf"} ${series.count}`);
      lines.push(`${name}_sum${key ? `{${key}}` : ''} ${Math.round(series.sum)}`);
      lines.push(`${name}_count${key ? `{${key}}` : ''} ${series.count}`);
    }
  }
  lines.push(
    '# HELP process_uptime_seconds Process uptime',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${Math.round(process.uptime())}`,
    '# HELP process_resident_memory_bytes Resident memory',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes ${process.memoryUsage().rss}`,
  );
  return `${lines.join('\n')}\n`;
}

// ── Domain-level helpers used at the few AI / authorization call sites ──────────────────────────

export type AiCallKind =
  'skill_route' | 'assistant_plan' | 'assistant_compose' | 'briefing' | 'stt' | 'diary_therapy';
export type AiCallOutcome =
  | 'ok'
  | 'timeout'
  | 'rate_limited'
  | 'http_error'
  | 'malformed'
  | 'network_error'
  | 'content_filter';

/** Record one AI provider/runtime call: outcome, latency and request size (chars, not content). */
/** Provider-agnostic call metadata returned by the AI runtime (`ai` field / STT metadata). */
export interface AiCallMeta {
  provider?: string;
  model?: string;
  role?: string;
  fallbackUsed?: boolean;
  /** Normalized error code from the runtime (AUTH_ERROR, RATE_LIMIT, ...) on failures. */
  code?: string;
  /** Estimated USD from the runtime's configured price table (absent = unpriced). */
  estimatedUsd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cached_input_tokens?: number;
    reasoning_tokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    audioSeconds?: number;
    estimatedUsd?: number;
  };
}

const LABEL = /^[a-z0-9_.:-]{1,48}$/i;
const label = (value: unknown, fallback = 'unknown'): string =>
  typeof value === 'string' && LABEL.test(value) ? value : fallback;

/** Parse the runtime's `ai` metadata defensively (it is external input). */
export function aiMetaOf(payload: unknown): AiCallMeta | undefined {
  const ai = (payload as { ai?: unknown } | null)?.ai;
  return ai && typeof ai === 'object' ? (ai as AiCallMeta) : undefined;
}

/** Normalized error code from a runtime error response ({detail: {code}}), never its text. */
export async function runtimeErrorMeta(
  response: globalThis.Response,
): Promise<AiCallMeta | undefined> {
  try {
    const body = (await response.json()) as { detail?: { code?: unknown } } | null;
    const code = body?.detail?.code;
    return typeof code === 'string' ? { code } : undefined;
  } catch {
    return undefined;
  }
}

export function recordAiCall(
  kind: AiCallKind,
  outcome: AiCallOutcome,
  durationMs: number,
  requestChars = 0,
  meta?: AiCallMeta,
): void {
  // Provider/role labels come from configuration (bounded set), sanitized anyway.
  const provider = label(meta?.provider, 'runtime');
  const role = label(meta?.role, kind);
  incCounter('clinicos_ai_calls_total', 'AI runtime/provider calls', {
    kind,
    outcome,
    provider,
    role,
  });
  const usage = meta?.usage ?? {};
  const tokens: [string, unknown][] = [
    ['input', usage.input_tokens ?? usage.inputTokens],
    ['output', usage.output_tokens ?? usage.outputTokens],
    ['cached_input', usage.cached_input_tokens],
    ['reasoning', usage.reasoning_tokens],
  ];
  for (const [direction, value] of tokens) {
    if (typeof value === 'number' && value > 0) {
      incCounter(
        'clinicos_ai_tokens_total',
        'Provider-reported tokens',
        { kind, provider, direction },
        value,
      );
    }
  }
  if (typeof usage.audioSeconds === 'number' && usage.audioSeconds > 0) {
    incCounter(
      'clinicos_ai_audio_seconds_total',
      'Seconds of audio transcribed',
      { provider },
      usage.audioSeconds,
    );
  }
  const usd = meta?.estimatedUsd ?? usage.estimatedUsd;
  if (typeof usd === 'number' && usd > 0) {
    incCounter(
      'clinicos_ai_estimated_usd_total',
      'Estimated spend from the runtime price table (not a billing figure)',
      { kind, provider },
      usd,
    );
  }
  if (meta?.fallbackUsed) {
    incCounter('clinicos_ai_provider_fallback_total', 'Calls served by the fallback provider', {
      kind,
      provider,
    });
  }
  observeHistogram('clinicos_ai_call_duration_ms', 'AI call latency (ms)', { kind }, durationMs);
  if (requestChars > 0) {
    incCounter(
      'clinicos_ai_request_chars_total',
      'Characters sent to the AI runtime (context size proxy for tokens)',
      { kind },
      requestChars,
    );
  }
  const req = currentRequestId();
  logEvent('ai_call', {
    kind,
    outcome,
    ms: Math.round(durationMs),
    chars: requestChars,
    req,
    provider,
    model: meta?.model ? label(meta.model) : undefined,
    role,
    code: meta?.code ? label(meta.code) : undefined,
    inTok: usage.input_tokens ?? usage.inputTokens,
    outTok: usage.output_tokens ?? usage.outputTokens,
    fallback: meta?.fallbackUsed || undefined,
  });
}

/** Classify a thrown fetch error / non-OK status into a metric outcome. */
export function classifyAiFailure(error: unknown, status?: number): AiCallOutcome {
  if (status === 429) return 'rate_limited';
  if (status !== undefined) return 'http_error';
  const name = (error as { name?: string })?.name;
  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout';
  if (error instanceof SyntaxError) return 'malformed';
  return 'network_error';
}

/** A fallback path (deterministic interpreter, structured answer, classic GUI) was used. */
export function recordFallback(component: string, reason: string): void {
  incCounter('clinicos_ai_fallback_total', 'AI degraded to a deterministic/classic path', {
    component,
    reason,
  });
}

// ── Structured logging ──────────────────────────────────────────────────────────────────────────

const SENSITIVE_KEY =
  /token|secret|password|authorization|api[-_]?key|cookie|prompt|transcript|text|body|name|note/i;

/** One JSON line per event. Values under sensitive-looking keys are dropped, strings capped. */
export function logEvent(event: string, fields: Record<string, unknown>): void {
  if (!structuredLogEnabled()) return;
  const safe: Record<string, unknown> = { ts: new Date().toISOString(), evt: event };
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (SENSITIVE_KEY.test(key)) {
      safe[key] = '[redacted]';
      continue;
    }
    safe[key] = typeof value === 'string' ? value.slice(0, 120) : value;
  }
  console.log(JSON.stringify(safe));
}

const ID_SEGMENT =
  /^(?:[0-9]+|[0-9a-f]{8}-[0-9a-f-]{27,}|c[a-z0-9]{20,}|[A-Za-z0-9_-]{20,}|[A-Z]{2,}-[A-Z0-9-]+)$/;

/** Route shape without identifiers or query string: /patients/ckx…/vitals → /patients/:id/vitals. */
export function routeShape(path: string): string {
  return (
    path
      .split('?')[0]
      .split('/')
      .map((segment) => (segment && ID_SEGMENT.test(segment) ? ':id' : segment))
      .join('/')
      .slice(0, 120) || '/'
  );
}

export function structuredLogEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const configured = (env.ACCESS_LOG || '').trim().toLowerCase();
  if (configured) return configured === 'true';
  return env.NODE_ENV === 'production';
}

// Top-level routers mounted in app.ts (metric label whitelist; anything else → 'other').
const KNOWN_AREAS = new Set([
  'root',
  'health',
  'ready',
  'metrics',
  'auth',
  'authz',
  'admin',
  'me',
  'patients',
  'appointments',
  'therapy-slots',
  'patient-intake',
  'consegne',
  'operators',
  'farmaci',
  'notes',
  'intake',
  'ai',
  'tools',
  'skills',
  'internal',
]);

/** Correlation + access log + HTTP metrics. Mount first. */
export function requestObservability(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header('X-Request-Id') || '';
  const requestId = REQUEST_ID_PATTERN.test(inbound) ? inbound : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  const started = process.hrtime.bigint();
  // Error/denial taxonomy: keep only the machine `code` of a 4xx/5xx JSON body (e.g.
  // capability_denied, resident_out_of_scope, authz_unavailable) — never any other field.
  let errorCode: string | undefined;
  const json = res.json.bind(res);
  res.json = (payload?: unknown) => {
    if (res.statusCode >= 400 && payload && typeof payload === 'object') {
      const code = (payload as { code?: unknown }).code;
      if (typeof code === 'string' && /^[a-z0-9_.-]{1,48}$/i.test(code)) errorCode = code;
    }
    return json(payload);
  };
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    // Probes and the metrics scrape would drown the signal.
    if (req.path === '/health' || req.path === '/ready' || req.path === '/metrics') return;
    const route = routeShape(req.originalUrl || req.path);
    // Bounded label set: an anonymous scanner hitting random paths must not grow the registry.
    const first = route.split('/')[1] || 'root';
    const area = KNOWN_AREAS.has(first) ? first : 'other';
    const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
    incCounter('clinicos_http_requests_total', 'HTTP requests', {
      method: req.method,
      area,
      status: statusClass,
    });
    observeHistogram('clinicos_http_request_duration_ms', 'HTTP latency (ms)', { area }, ms);
    if (res.statusCode === 401 || res.statusCode === 403) {
      incCounter('clinicos_http_denied_total', 'HTTP 401/403 responses', {
        area,
        status: String(res.statusCode),
      });
    }
    if (errorCode) {
      incCounter('clinicos_http_error_codes_total', 'Error/denial codes (authz, scope, auth, AI)', {
        area,
        code: errorCode,
      });
    }
    if (res.statusCode === 503) {
      incCounter('clinicos_http_unavailable_total', 'HTTP 503 (fail-closed) responses', { area });
    }
    logEvent('http', {
      req: requestId,
      method: req.method,
      route,
      status: res.statusCode,
      ms: Math.round(ms),
      code: errorCode,
      src: (req as { identitySource?: string }).identitySource,
    });
  });
  storage.run({ requestId }, () => next());
}

function bearerMatches(header: string | undefined, expected: string): boolean {
  const match = /^Bearer\s+(.+)$/i.exec((header || '').trim());
  if (!match) return false;
  const given = Buffer.from(match[1].trim());
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/** GET /metrics — token-gated; 404 when METRICS_TOKEN is unset so it is never anonymous. */
export function metricsHandler(req: Request, res: Response): void {
  const token = process.env.METRICS_TOKEN;
  res.setHeader('Cache-Control', 'no-store');
  if (!token || token.length < 24) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!bearerMatches(req.header('Authorization'), token)) {
    res.status(401).json({ error: 'Non autorizzato', code: 'metrics_token_required' });
    return;
  }
  res.type('text/plain; version=0.0.4').send(renderMetrics());
}

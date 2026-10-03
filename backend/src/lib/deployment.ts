// Phase 9: deployment tier + startup configuration validation.
//
// The tier answers "what kind of deployment is this?" independently from NODE_ENV (the demo runs
// with NODE_ENV=production on synthetic data). A REAL production deployment can never enable the
// Role Simulator or the demo identity headers, whatever the other flags say (fail closed).
//
//   CLINICOS_ENV = development | test | staging | demo | production   (explicit, preferred)
//   unset → derived: NODE_ENV=production + DEMO_DATASET_ID=synthetic-v1 → demo
//                    NODE_ENV=production otherwise                       → production
//                    NODE_ENV=test → test, anything else                  → development
//
// validateDeploymentConfig() never reads or prints secret VALUES — only presence/shape.

export type DeploymentTier = 'development' | 'test' | 'staging' | 'demo' | 'production';

const TIERS: readonly DeploymentTier[] = ['development', 'test', 'staging', 'demo', 'production'];
const SYNTHETIC_DATASET = 'synthetic-v1';

function flag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function deploymentTier(env: NodeJS.ProcessEnv = process.env): DeploymentTier {
  const explicit = (env.CLINICOS_ENV || '').trim().toLowerCase();
  if (explicit) {
    // A misspelled tier must not silently relax anything: treat it as production.
    return (TIERS as readonly string[]).includes(explicit)
      ? (explicit as DeploymentTier)
      : 'production';
  }
  if (env.NODE_ENV === 'production') {
    return env.DEMO_DATASET_ID === SYNTHETIC_DATASET ? 'demo' : 'production';
  }
  return env.NODE_ENV === 'test' ? 'test' : 'development';
}

/** True only on a real production deployment: demo identities and the simulator are forbidden. */
export function isRealProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return deploymentTier(env) === 'production';
}

export interface ConfigReport {
  tier: DeploymentTier;
  errors: string[];
  warnings: string[];
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isLoopbackOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function positiveInt(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') return true;
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/**
 * Validate the configuration for the current tier. `errors` are dangerous combinations: the server
 * refuses to start with them when NODE_ENV=production. `warnings` are degraded-but-safe states.
 */
export function validateDeploymentConfig(env: NodeJS.ProcessEnv = process.env): ConfigReport {
  const tier = deploymentTier(env);
  const errors: string[] = [];
  const warnings: string[] = [];
  const authMode = (env.AUTH_MODE || '').trim().toLowerCase();
  const hosted = tier === 'production' || tier === 'staging' || tier === 'demo';

  const explicitTier = (env.CLINICOS_ENV || '').trim().toLowerCase();
  if (explicitTier && !(TIERS as readonly string[]).includes(explicitTier)) {
    errors.push(`CLINICOS_ENV non valido (${explicitTier.slice(0, 20)}): trattato come production`);
  }

  if (!env.DATABASE_URL) errors.push('DATABASE_URL assente');
  if (!explicitTier && env.NODE_ENV === 'production') {
    // Derived tier: DEMO_DATASET_ID alone would turn a production service into «demo». Set the
    // tier explicitly on every hosted environment (production: CLINICOS_ENV=production).
    warnings.push(
      `CLINICOS_ENV non impostato: tier derivato «${tier}» (impostarlo esplicitamente)`,
    );
  }

  // ── Identity ────────────────────────────────────────────────────────────────────────────────
  if (authMode === 'entra') {
    if (!(env.ENTRA_TENANT_ID || '').trim() || !(env.ENTRA_AUDIENCE || '').trim()) {
      errors.push('AUTH_MODE=entra senza ENTRA_TENANT_ID/ENTRA_AUDIENCE');
    }
    if (hosted && env.ENTRA_JWKS_URL && !isHttpsUrl(env.ENTRA_JWKS_URL)) {
      errors.push('ENTRA_JWKS_URL deve essere https');
    }
  } else if (authMode === 'demo') {
    if (tier === 'production') {
      errors.push('AUTH_MODE=demo in produzione reale: identità demo vietate');
    }
  } else if (authMode) {
    errors.push(`AUTH_MODE non supportato (${authMode.slice(0, 20)})`);
  } else if (hosted) {
    warnings.push('AUTH_MODE non impostato: API cliniche disabilitate (503, fail closed)');
  }

  // ── Role Simulator / demo identities ────────────────────────────────────────────────────────
  if (tier === 'production') {
    for (const name of [
      'ROLE_SIMULATOR_ENABLED',
      'ROLE_SIMULATOR_ALLOW_PRODUCTION',
      'ALLOW_PRODUCTION_DEMO_AUTH',
    ]) {
      if (flag(env[name])) errors.push(`${name}=true in produzione reale`);
    }
    if (env.DEMO_DATASET_ID === SYNTHETIC_DATASET) {
      errors.push('DEMO_DATASET_ID=synthetic-v1 con CLINICOS_ENV=production');
    }
  }
  if (flag(env.ROLE_SIMULATOR_ENABLED) && env.NODE_ENV === 'production') {
    if ((env.ROLE_SIMULATOR_SECRET || '').length < 32) {
      errors.push('Simulatore attivo senza ROLE_SIMULATOR_SECRET (≥32 caratteri)');
    }
  }

  // ── Authorization ───────────────────────────────────────────────────────────────────────────
  if ((env.AUTHZ_ENFORCEMENT || '').trim().toLowerCase() === 'off' && hosted) {
    errors.push('AUTHZ_ENFORCEMENT=off su un ambiente ospitato');
  }
  if ((env.AUTHZ_UNMAPPED_ROUTES || '').trim().toLowerCase() === 'allow' && hosted) {
    errors.push('AUTHZ_UNMAPPED_ROUTES=allow su un ambiente ospitato');
  }

  // ── CORS ────────────────────────────────────────────────────────────────────────────────────
  const origins = [env.FRONTEND_URL, env.FRONTEND_URLS]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  if (hosted) {
    if (origins.length === 0) warnings.push('FRONTEND_URL non impostato: nessuna origine browser');
    for (const origin of origins) {
      if (isHttpsUrl(origin)) continue;
      if (isLoopbackOrigin(origin)) {
        // A developer origin on a hosted backend is a smell, not an exposure: every clinical call
        // still needs a verified identity. Flag it for removal without blocking the deploy.
        warnings.push(`Origine CORS di sviluppo su ambiente ospitato: ${origin.slice(0, 60)}`);
      } else {
        errors.push(`Origine CORS non https o jolly: ${origin.slice(0, 60)}`);
      }
    }
  }

  // ── AI runtime / providers (degradation only, never blocking) ───────────────────────────────
  const runtimeUrl = (env.AI_RUNTIME_URL || '').trim();
  if (runtimeUrl && !env.AI_RUNTIME_SERVICE_TOKEN) {
    errors.push('AI_RUNTIME_URL senza AI_RUNTIME_SERVICE_TOKEN');
  }
  if (env.AI_RUNTIME_SERVICE_TOKEN && env.AI_RUNTIME_SERVICE_TOKEN.length < 24 && hosted) {
    warnings.push('AI_RUNTIME_SERVICE_TOKEN corto (<24 caratteri)');
  }
  if (
    runtimeUrl &&
    hosted &&
    !isHttpsUrl(runtimeUrl) &&
    !/\.railway\.internal(:\d+)?/.test(runtimeUrl)
  ) {
    warnings.push('AI_RUNTIME_URL non https (accettato solo su rete privata)');
  }
  if (!runtimeUrl)
    warnings.push('AI runtime non configurato: Assistente in modalità deterministica');

  for (const name of [
    'AI_ASSISTANT_TIMEOUT_MS',
    'PROACTIVE_BRIEFING_TIMEOUT_MS',
    'AI_TIMEOUT_MS',
    'AI_MAX_RETRIES',
  ]) {
    if (!positiveInt(env[name]) && !(name === 'AI_MAX_RETRIES' && env[name] === '0')) {
      errors.push(`${name} non è un intero positivo`);
    }
  }
  const retries = Number(env.AI_MAX_RETRIES ?? '2');
  if (Number.isFinite(retries) && retries > 5) errors.push('AI_MAX_RETRIES > 5 (retry illimitati)');

  // ── Observability ───────────────────────────────────────────────────────────────────────────
  if (env.METRICS_TOKEN !== undefined && env.METRICS_TOKEN.length < 24) {
    errors.push('METRICS_TOKEN troppo corto (≥24 caratteri)');
  }
  if (hosted && !env.METRICS_TOKEN)
    warnings.push('METRICS_TOKEN non impostato: /metrics disattivato');

  return { tier, errors, warnings };
}

// Phase 9: master AI switch (feature flag ≠ authorization).
//
// AI_ENABLED=false turns EVERY AI path off at once: deterministic skill interpreter, structured
// Assistant answers (no plan/compose), facts-only shift briefing, no voice/STT, no AI import or
// diary→therapy suggestions. The classic GUI and all authorization keep working unchanged.
// Default: enabled (each AI feature still has its own flag and its own configuration).
//
// Which provider/model serves the AI is decided ONLY by the AI runtime configuration
// (AI_PROVIDER + AI_MODEL_<ROLE>, STT_PROVIDER + STT_MODEL): the backend never names a vendor.

export function aiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.AI_ENABLED ?? 'true').trim().toLowerCase() !== 'false';
}

/** The AI runtime is reachable from this backend (URL + service token configured). */
export function aiRuntimeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean((env.AI_RUNTIME_URL || '').trim() && (env.AI_RUNTIME_SERVICE_TOKEN || '').trim());
}

import { Router } from 'express';
import { loadAiConfig, loadExtractionSchema, publicStatus } from '../ai/config.js';

const aiExtractionRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════
// AI EXTRACTION — mounted at /ai/extraction (REQ-013)
// Secret-free surface for the "Importa lettera di dimissione" flow.
// ═══════════════════════════════════════════════════════════════════════════

// GET /ai/extraction/status — does the frontend know if the service is usable?
// Never returns the API key or any secret.
// Phase 6 (error disclosure): this route is public → configuration errors (file paths, env var
// names) are summarized; the details stay in the server log.
function publicErrors(errors: string[]): string[] {
  return errors.length ? ['Configurazione AI incompleta (dettagli nei log del server)'] : [];
}

aiExtractionRouter.get('/status', (_req, res) => {
  const status = publicStatus();
  res.status(200).json({ ...status, errors: publicErrors(status.errors) });
});

// GET /ai/extraction/capabilities — which logical role serves extraction and whether it is usable.
// Phase 9: provider/model live in the AI runtime configuration; the backend never names a vendor.
// The runtime's own capability health (no provider call) is relayed when reachable.
aiExtractionRouter.get('/capabilities', async (_req, res) => {
  const cfg = loadAiConfig();
  if (!cfg.available) {
    return res.status(503).json({ available: false, errors: publicErrors(cfg.errors) });
  }
  if (cfg.provider === 'mock') {
    return res.status(200).json({ available: true, provider: 'mock', role: cfg.model });
  }
  try {
    const base = String(process.env.AI_RUNTIME_URL).replace(/\/$/, '');
    const response = await fetch(`${base}/v1/runtime/ai-health`, {
      signal: AbortSignal.timeout(3_000),
    });
    const health = response.ok
      ? ((await response.json()) as { roles?: Record<string, unknown> })
      : null;
    res.status(200).json({
      available: true,
      provider: 'runtime',
      role: cfg.model,
      model: (health?.roles?.[cfg.model] as { model?: string } | undefined)?.model ?? null,
    });
  } catch {
    res.status(200).json({ available: true, provider: 'runtime', role: cfg.model, model: null });
  }
});

// GET /ai/extraction/schema — the extraction schema (fields + descriptions) so the
// review UI can render EVERY field (even empty ones) for full review/integration.
// No secrets: this is the versioned, in-repo schema asset.
aiExtractionRouter.get('/schema', (_req, res) => {
  try {
    res.status(200).json(loadExtractionSchema());
  } catch {
    res.status(500).json({ error: 'Schema di estrazione non disponibile' });
  }
});

export default aiExtractionRouter;

import { Router } from 'express';
import { loadAiConfig, publicStatus } from '../ai/config.js';
import { createExtractionProvider } from '../ai/provider-factory.js';

const aiExtractionRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════
// AI EXTRACTION — mounted at /ai/extraction (REQ-013)
// Secret-free surface for the "Importa lettera di dimissione" flow.
// ═══════════════════════════════════════════════════════════════════════════

// GET /ai/extraction/status — does the frontend know if the service is usable?
// Never returns the API key or any secret.
aiExtractionRouter.get('/status', (_req, res) => {
  res.status(200).json(publicStatus());
});

// GET /ai/extraction/capabilities — model capability probe (images/docs/structured).
aiExtractionRouter.get('/capabilities', async (_req, res) => {
  const cfg = loadAiConfig();
  if (!cfg.available) {
    return res.status(503).json({ available: false, errors: cfg.errors });
  }
  try {
    const provider = createExtractionProvider(cfg);
    const caps = await provider.capabilities();
    res.status(200).json({ available: true, model: provider.model, capabilities: caps });
  } catch (err) {
    // Controlled error, no secrets.
    res.status(503).json({
      available: false,
      error: err instanceof Error ? err.message : 'Errore configurazione AI',
    });
  }
});

export default aiExtractionRouter;

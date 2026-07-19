// Selects the extraction provider from configuration (REQ-013).
// Route/UI call this — never a concrete provider — so model/provider are
// swappable via environment with no code changes downstream.

import { loadAiConfig, type AiConfig } from './config.js';
import { AiExtractionError, type AiExtractionProvider } from './types.js';
import { GoogleGemmaExtractionProvider } from './providers/google-gemma.js';
import { MockExtractionProvider } from './providers/mock.js';

export function createExtractionProvider(cfg: AiConfig = loadAiConfig()): AiExtractionProvider {
  if (cfg.provider === 'mock') {
    return new MockExtractionProvider(
      cfg.model === 'gemma-4-31b-it' ? 'mock-extractor' : cfg.model,
    );
  }

  // google
  if (!cfg.available || !cfg.apiKey) {
    throw new AiExtractionError(
      'config',
      `Servizio AI non disponibile: ${cfg.errors.join('; ') || 'configurazione incompleta'}`,
    );
  }
  return new GoogleGemmaExtractionProvider({
    apiKey: cfg.apiKey,
    model: cfg.structuredModel ?? cfg.model,
    timeoutMs: cfg.timeoutMs,
    maxRetries: cfg.maxRetries,
  });
}

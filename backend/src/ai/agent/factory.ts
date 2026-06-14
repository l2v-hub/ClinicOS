// Selects the ExtractionAgent provider from configuration (REQ-021).
import { loadAiConfig, type AiConfig } from '../config.js';
import { AiExtractionError } from '../types.js';
import { GeminiAgentProvider } from './gemini-agent.js';
import { MockAgentProvider } from './mock-agent.js';
import type { AgentExtractionProvider } from './types.js';

export function createAgentProvider(cfg: AiConfig = loadAiConfig()): AgentExtractionProvider {
  if (cfg.provider === 'mock') return new MockAgentProvider();
  if (!cfg.available || !cfg.apiKey) {
    throw new AiExtractionError('config', `ExtractionAgent non disponibile: ${cfg.errors.join('; ') || 'config incompleta'}`);
  }
  return new GeminiAgentProvider({
    apiKey: cfg.apiKey,
    model: cfg.agentModel, // function-calling model (gemini-*), not gemma
    timeoutMs: cfg.timeoutMs,
    maxIterations: 8,
  });
}

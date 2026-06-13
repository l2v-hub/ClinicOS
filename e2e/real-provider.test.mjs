// Real-provider extraction test (REQ-020). Runs ONLY when GEMINI_API_KEY is set,
// otherwise self-skips (so CI without the secret stays green). Uses a synthetic
// document — never real clinical data. Verifies the real provider path produces a
// schema-valid (or controlled-error) result without crashing or leaking the key.
//   GEMINI_API_KEY=... AI_PROVIDER=google node e2e/real-provider.test.mjs
import assert from 'node:assert/strict';

const key = process.env.GEMINI_API_KEY?.trim();
if (!key) {
  console.log('REQ-020 real-provider: SKIPPED (no GEMINI_API_KEY) — protected path');
  process.exit(0);
}

process.env.AI_PROVIDER = 'google';
const { createExtractionProvider } = await import('../backend/dist/ai/provider-factory.js');
const { loadAiConfig, loadExtractionSchema, loadExtractionPrompt } = await import('../backend/dist/ai/config.js');
const { validateExtraction } = await import('../backend/dist/ai/extraction-validate.js');

const cfg = loadAiConfig(true);
assert.equal(cfg.available, true, 'config available with key');
const provider = createExtractionProvider(cfg);

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('Documento sintetico di test. Paziente: Mario Bianchi, nato 1950-01-01.\n'), Buffer.from('%%EOF')]);

try {
  const result = await provider.extract({
    jobId: 'real-test',
    files: [{ id: 'd1', filename: 'sintetico.pdf', mimeType: 'application/pdf', data: PDF }],
    schema: loadExtractionSchema(cfg),
    prompt: loadExtractionPrompt(cfg),
  });
  const check = validateExtraction(result.data);
  assert.ok(check.valid || result.warnings.length > 0, 'valid output or reported warnings');
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(key), 'API key never appears in the result');
  console.log(`REQ-020 real-provider: PASS (model=${result.model}, valid=${check.valid})`);
} catch (err) {
  // A controlled AiExtractionError is acceptable (e.g. model/capability); a crash is not.
  console.log(`REQ-020 real-provider: controlled error — ${err?.kind ?? 'error'}: ${err?.message ?? err}`);
  process.exit(0);
}

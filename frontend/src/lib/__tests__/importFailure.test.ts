import assert from 'node:assert/strict';
import { test } from 'node:test';
import { importFailureMessage } from '../importFailure';

test('credentials diagnostics explain who must fix them and preserve job references', () => {
  for (const error of [
    '[AI_AUTH] private-value',
    '[provider_error] Document Intelligence: HTTP 401 private-value',
    { kind: 'credentials', message: 'private-value' },
  ]) {
    const message = importFailureMessage(error, 'qa-job-1');
    assert.match(message, /credenziali/);
    assert.match(message, /amministratore/);
    assert.match(message, /AI_AUTH.*qa-job-1/);
    assert.match(message, /conservati/);
    assert.doesNotMatch(message, /private-value|Errore temporaneo/);
  }
});

test('distinct actions for model, limits, timeout and missing files', () => {
  assert.match(importFailureMessage('[AI_MODEL]'), /deployment/);
  assert.match(importFailureMessage('[AI_RATE_LIMIT]'), /Attendi/);
  assert.match(importFailureMessage('[AI_TIMEOUT]'), /senza ricaricare/);
  const missing = importFailureMessage('[AI_FILES_MISSING]');
  assert.match(missing, /Ricaricali/);
  assert.doesNotMatch(missing, /conservati/);
});

test('unknown errors, injected content and invalid references are never displayed', () => {
  const message = importFailureMessage('[AI_UNKNOWN] <img src=x> private-value', '<script>');
  assert.match(message, /AI_PROVIDER/);
  assert.doesNotMatch(message, /private-value|<img|<script|Riferimento/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyImportFailure,
  importRuntimeError,
  requireOcrText,
  safeImportError,
} from '../upload/import-failure.js';

test('current and legacy authentication errors become safe non-transient diagnostics', () => {
  for (const error of [
    { kind: 'credentials', message: 'private-value' },
    '[provider_error] Document Intelligence: HTTP 401 private-value',
    'Mistral OCR auth 403: private-value',
  ]) {
    assert.equal(classifyImportFailure(error).code, 'AI_AUTH');
    assert.equal(classifyImportFailure(error).retryable, false);
    assert.doesNotMatch(safeImportError(error), /private-value/);
    assert.equal(importRuntimeError(error).kind, 'config');
  }
});

test('routing, input, quotas and timeout have distinct safe codes', () => {
  for (const [status, code, retryable] of [
    [404, 'AI_MODEL', false],
    [400, 'AI_INPUT', false],
    [429, 'AI_RATE_LIMIT', true],
    [504, 'AI_TIMEOUT', true],
    [503, 'AI_PROVIDER', true],
  ] as const) {
    const result = classifyImportFailure(`Runtime HTTP ${status} private-value`);
    assert.equal(result.code, code);
    assert.equal(result.retryable, retryable);
    assert.doesNotMatch(safeImportError(result.message), /private-value/);
  }
});

test('allowlisted error serialization is stable; untrusted provider data never becomes UI text', () => {
  for (const value of [
    '[AI_AUTH] unsafe payload',
    '[AI_MODEL] unsafe payload',
    '[AI_EMPTY] unsafe payload',
    { arbitrary: 'unsafe payload' },
    new Error('unsafe payload'),
    null,
  ]) {
    const safe = safeImportError(value);
    assert.equal(safeImportError(safe), safe);
    assert.doesNotMatch(safe, /unsafe payload/);
  }
});

test('OCR must return actual non-empty text before extraction can continue', () => {
  for (const value of [
    null,
    {},
    { rawText: '' },
    { rawText: '  ' },
    { rawText: 42 },
    { rawText: {} },
  ])
    assert.throws(() => requireOcrText(value), /AI_EMPTY/);
  assert.equal(requireOcrText({ rawText: 'DOCUMENTO\nSINTETICO' }), 'DOCUMENTO\nSINTETICO');
});

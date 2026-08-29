import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatorHeaders, setCurrentOperator } from '../operatorSession.js';

test('operatorHeaders carries the verified bearer token for protected import requests', () => {
  setCurrentOperator({
    id: 'operator-a',
    role: 'operatore',
    accessToken: 'test-token-not-a-secret', // secret-scan-ignore: deterministic fake test value
  });
  try {
    assert.deepEqual(operatorHeaders(), {
      'X-Operator-Id': 'operator-a',
      'X-Operator-Role': 'operatore',
      Authorization: 'Bearer test-token-not-a-secret',
    });
  } finally {
    setCurrentOperator(null);
  }
});

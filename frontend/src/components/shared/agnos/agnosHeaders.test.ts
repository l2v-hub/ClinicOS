import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setCurrentOperator } from '../../../lib/operatorSession';
import { buildAgnosHeaders } from './useAgnosChat';

test('Agnos plan/execute headers include the Entra bearer from the verified session', () => {
  setCurrentOperator({
    id: 'verified-operator',
    role: 'operatore',
    accessToken: 'synthetic-entra-token', // secret-scan-ignore: deterministic test fixture
  });
  try {
    assert.deepEqual(
      buildAgnosHeaders({
        operatorId: 'verified-operator',
        operatorRole: 'operatore',
        operatorName: 'Operatore Test',
      }),
      {
        'Content-Type': 'application/json',
        'X-Operator-Id': 'verified-operator',
        'X-Operator-Role': 'operatore',
        Authorization: 'Bearer synthetic-entra-token',
        'X-Operator-Name': 'Operatore Test',
      },
    );
  } finally {
    setCurrentOperator(null);
  }
});

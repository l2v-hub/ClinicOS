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

test('Agnos headers in a Role Simulator session carry only the simulator bearer', () => {
  setCurrentOperator({
    id: 'SIM-NURSE-1',
    role: 'operatore',
    accessToken: 'sim.synthetic-token', // secret-scan-ignore: deterministic test fixture
  });
  try {
    assert.deepEqual(
      buildAgnosHeaders({
        operatorId: 'SIM-NURSE-1',
        operatorRole: 'admin',
        operatorName: 'Nurse 1',
      }),
      { 'Content-Type': 'application/json', Authorization: 'Bearer sim.synthetic-token' },
    );
  } finally {
    setCurrentOperator(null);
  }
});

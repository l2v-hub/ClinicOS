import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireOperator } from '../auth.js';
import { importRateLimit } from '../rate-limit.js';
import { canCrossPatientSearch } from '../gateway/context.js';
import { ctxFromOperator } from '../../routes/ai-assistant-public.js';

function mockReq(headers: Record<string, string>, ip = '1.2.3.4') {
  return {
    header: (n: string) => headers[n] ?? headers[n.toLowerCase()],
    ip,
    operator: undefined as { id: string; role: string } | undefined,
  };
}
function mockRes() {
  const out: { code?: number; body?: unknown; headers: Record<string, unknown> } = { headers: {} };
  return {
    status(c: number) { out.code = c; return this; },
    json(b: unknown) { out.body = b; return this; },
    setHeader(k: string, v: unknown) { out.headers[k] = v; },
    _out: out,
  };
}

test('requireOperator: 401 when no operator headers', () => {
  const req = mockReq({});
  const res = mockRes();
  let nexted = false;
  requireOperator(req as never, res as never, () => { nexted = true; });
  assert.equal(nexted, false);
  assert.equal(res._out.code, 401);
});

test('requireOperator: 403 when role not allowed', () => {
  const req = mockReq({ 'X-Operator-Id': 'u1', 'X-Operator-Role': 'guest' });
  const res = mockRes();
  let nexted = false;
  requireOperator(req as never, res as never, () => { nexted = true; });
  assert.equal(nexted, false);
  assert.equal(res._out.code, 403);
});

test('requireOperator: passes + attaches operator for valid role', () => {
  const req = mockReq({ 'X-Operator-Id': 'u1', 'X-Operator-Role': 'operatore' });
  const res = mockRes();
  let nexted = false;
  requireOperator(req as never, res as never, () => { nexted = true; });
  assert.equal(nexted, true);
  assert.equal(req.operator?.id, 'u1');
  assert.equal(req.operator?.role, 'operatore');
});

test('requireOperator: admin/manager/operator casings accepted', () => {
  for (const role of ['admin', 'MANAGER', 'Operator']) {
    const req = mockReq({ 'X-Operator-Id': 'u1', 'X-Operator-Role': role });
    const res = mockRes();
    let nexted = false;
    requireOperator(req as never, res as never, () => { nexted = true; });
    assert.equal(nexted, true, `role ${role} should pass`);
  }
});

test('public assistant: spoofed admin header cannot unlock cross-patient', () => {
  // Attacker passes requireOperator by self-asserting a privileged role on the public route.
  const req = mockReq({ 'X-Operator-Id': 'attacker', 'X-Operator-Role': 'admin' });
  requireOperator(req as never, mockRes() as never, () => {});
  assert.equal(req.operator?.role, 'admin'); // header trusted at the gate (audit) ...
  // ... but the gateway context must be clamped: even with the env flag ON, cross-patient stays closed.
  const ctx = ctxFromOperator(req as never);
  assert.equal(canCrossPatientSearch(ctx, { AI_CROSS_PATIENT_SEARCH_ENABLED: 'true' } as never), false);
});

test('importRateLimit: 429 after the limit, keyed by operator', () => {
  const key = 'rl-test-op';
  // Default is 60/min; hammer past it.
  let blocked = false;
  for (let i = 0; i < 65; i++) {
    const req = { header: () => undefined, ip: 'x', operator: { id: key, role: 'operatore' } };
    const res = mockRes();
    let nexted = false;
    importRateLimit(req as never, res as never, () => { nexted = true; });
    if (!nexted) { blocked = true; assert.equal(res._out.code, 429); break; }
  }
  assert.equal(blocked, true, 'limiter should eventually return 429');
});

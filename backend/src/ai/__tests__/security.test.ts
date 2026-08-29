import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatorAuthMode, requireOperator, requireRole } from '../auth.js';
import { importRateLimit, makeLimiter, medicationSearchRateLimit } from '../rate-limit.js';
import { canCrossPatientSearch } from '../gateway/context.js';
import { ctxFromOperator } from '../../routes/ai-assistant-public.js';

process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'demo';

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
    status(c: number) {
      out.code = c;
      return this;
    },
    json(b: unknown) {
      out.body = b;
      return this;
    },
    setHeader(k: string, v: unknown) {
      out.headers[k] = v;
    },
    _out: out,
  };
}

test('requireOperator: 401 when no operator headers', () => {
  const req = mockReq({});
  const res = mockRes();
  let nexted = false;
  requireOperator(req as never, res as never, () => {
    nexted = true;
  });
  assert.equal(nexted, false);
  assert.equal(res._out.code, 401);
});

test('requireOperator: 403 when role not allowed', () => {
  const req = mockReq({ 'X-Operator-Id': 'u1', 'X-Operator-Role': 'guest' });
  const res = mockRes();
  let nexted = false;
  requireOperator(req as never, res as never, () => {
    nexted = true;
  });
  assert.equal(nexted, false);
  assert.equal(res._out.code, 403);
});

test('requireOperator: passes + attaches operator for valid role', () => {
  const req = mockReq({ 'X-Operator-Id': 'u1', 'X-Operator-Role': 'operatore' });
  const res = mockRes();
  let nexted = false;
  requireOperator(req as never, res as never, () => {
    nexted = true;
  });
  assert.equal(nexted, true);
  assert.equal(req.operator?.id, 'u1');
  assert.equal(req.operator?.role, 'operatore');
});

test('requireOperator: explicit demo aliases resolve to relational seed operators', () => {
  const operator = mockReq({ 'X-Operator-Id': 'op1', 'X-Operator-Role': 'operatore' });
  requireOperator(operator as never, mockRes() as never, () => {});
  assert.equal(operator.operator?.id, 'SEED-OP-001');

  const admin = mockReq({ 'X-Operator-Id': 'admin1', 'X-Operator-Role': 'admin' });
  requireOperator(admin as never, mockRes() as never, () => {});
  assert.equal(admin.operator?.id, 'SEED-OP-004');
});

test('requireOperator: admin/manager/operator casings accepted', () => {
  for (const role of ['admin', 'MANAGER', 'Operator']) {
    const req = mockReq({ 'X-Operator-Id': 'u1', 'X-Operator-Role': role });
    const res = mockRes();
    let nexted = false;
    requireOperator(req as never, res as never, () => {
      nexted = true;
    });
    assert.equal(nexted, true, `role ${role} should pass`);
  }
});

test('operatorAuthMode: demo requires explicit development/test opt-in', () => {
  for (const nodeEnv of [undefined, 'development', 'test', 'staging', 'production']) {
    const env = nodeEnv === undefined ? {} : { NODE_ENV: nodeEnv };
    assert.equal(operatorAuthMode(env as NodeJS.ProcessEnv), 'disabled');
  }

  assert.equal(
    operatorAuthMode({ NODE_ENV: 'development', AUTH_MODE: 'demo' } as NodeJS.ProcessEnv),
    'demo',
  );
  assert.equal(
    operatorAuthMode({ NODE_ENV: 'test', AUTH_MODE: 'demo' } as NodeJS.ProcessEnv),
    'demo',
  );
  assert.equal(
    operatorAuthMode({ NODE_ENV: 'production', AUTH_MODE: 'demo' } as NodeJS.ProcessEnv),
    'disabled',
  );
  assert.equal(
    operatorAuthMode({ NODE_ENV: 'staging', AUTH_MODE: 'demo' } as NodeJS.ProcessEnv),
    'disabled',
  );
  assert.equal(
    operatorAuthMode({ NODE_ENV: 'test', AUTH_MODE: 'unexpected' } as NodeJS.ProcessEnv),
    'disabled',
  );
  assert.equal(
    operatorAuthMode({ NODE_ENV: 'production', AUTH_MODE: 'entra' } as NodeJS.ProcessEnv),
    'entra',
  );
});

test('requireOperator: spoofed headers fail closed when AUTH_MODE is missing', () => {
  const previousAuthMode = process.env.AUTH_MODE;
  delete process.env.AUTH_MODE;
  try {
    const req = mockReq({ 'X-Operator-Id': 'attacker', 'X-Operator-Role': 'admin' });
    const res = mockRes();
    let nexted = false;
    requireOperator(req as never, res as never, () => {
      nexted = true;
    });
    assert.equal(nexted, false);
    assert.equal(res._out.code, 503);
    assert.equal(req.operator, undefined);
  } finally {
    if (previousAuthMode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previousAuthMode;
  }
});

test('requireOperator: spoofed demo headers fail closed in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAuthMode = process.env.AUTH_MODE;
  process.env.NODE_ENV = 'production';
  process.env.AUTH_MODE = 'demo';
  try {
    const req = mockReq({ 'X-Operator-Id': 'attacker', 'X-Operator-Role': 'admin' });
    const res = mockRes();
    let nexted = false;
    requireOperator(req as never, res as never, () => {
      nexted = true;
    });
    assert.equal(nexted, false);
    assert.equal(res._out.code, 503);
    assert.equal(req.operator, undefined);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousAuthMode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previousAuthMode;
  }
});

test('requireRole: an operator cannot cross the admin boundary', () => {
  const req = mockReq({});
  req.operator = { id: 'operator-1', role: 'operatore' };
  const res = mockRes();
  let nexted = false;
  requireRole('admin', 'manager')(req as never, res as never, () => {
    nexted = true;
  });
  assert.equal(nexted, false);
  assert.equal(res._out.code, 403);
});

test('requireRole: admin and manager cross the admin boundary', () => {
  for (const role of ['admin', 'manager']) {
    const req = mockReq({});
    req.operator = { id: `${role}-1`, role };
    const res = mockRes();
    let nexted = false;
    requireRole('admin', 'manager')(req as never, res as never, () => {
      nexted = true;
    });
    assert.equal(nexted, true);
  }
});

test('public assistant: spoofed admin header cannot unlock cross-patient', async () => {
  // Attacker passes requireOperator by self-asserting a privileged role on the public route.
  const req = mockReq({ 'X-Operator-Id': 'attacker', 'X-Operator-Role': 'admin' });
  requireOperator(req as never, mockRes() as never, () => {});
  assert.equal(req.operator?.role, 'admin'); // header trusted at the gate (audit) ...
  // ... but the gateway context must be clamped: even with the env flag ON, cross-patient stays closed.
  const ctx = await ctxFromOperator(req as never, async () => ['patient-owned']);
  assert.deepEqual(ctx.permittedPatientIds, ['patient-owned']);
  assert.equal(
    canCrossPatientSearch(ctx, { AI_CROSS_PATIENT_SEARCH_ENABLED: 'true' } as never),
    false,
  );
});

test('public assistant derives ordinary patient scope server-side', async () => {
  const req = mockReq({ 'X-Operator-Id': 'operator-a', 'X-Operator-Role': 'operatore' });
  requireOperator(req as never, mockRes() as never, () => {});
  let resolvedOperatorId = '';
  const ctx = await ctxFromOperator(req as never, async (operatorId) => {
    resolvedOperatorId = operatorId;
    return ['patient-a', 'patient-b'];
  });
  assert.equal(resolvedOperatorId, 'operator-a');
  assert.deepEqual(ctx.permittedPatientIds, ['patient-a', 'patient-b']);
  assert.equal(
    canCrossPatientSearch(ctx, { AI_CROSS_PATIENT_SEARCH_ENABLED: 'true' } as never),
    false,
  );
});

test('public assistant grants global scope only in verified Entra mode', async () => {
  const req = mockReq({});
  req.operator = { id: 'manager-a', role: 'manager' };
  const previousMode = process.env.AUTH_MODE;
  process.env.AUTH_MODE = 'entra';
  try {
    const ctx = await ctxFromOperator(req as never, async () => {
      throw new Error('verified global scope must not enumerate patients');
    });
    assert.equal(ctx.permittedPatientIds, null);
  } finally {
    process.env.AUTH_MODE = previousMode;
  }
});

test('importRateLimit: 429 after the limit, keyed by operator', () => {
  const key = 'rl-test-op';
  // Default is 60/min; hammer past it.
  let blocked = false;
  for (let i = 0; i < 65; i++) {
    const req = { header: () => undefined, ip: 'x', operator: { id: key, role: 'operatore' } };
    const res = mockRes();
    let nexted = false;
    importRateLimit(req as never, res as never, () => {
      nexted = true;
    });
    if (!nexted) {
      blocked = true;
      assert.equal(res._out.code, 429);
      break;
    }
  }
  assert.equal(blocked, true, 'limiter should eventually return 429');
});

test('public medication fuzzy search is throttled by client IP', () => {
  const req = mockReq({}, '203.0.113.44');
  let blocked = false;
  for (let i = 0; i < 65; i++) {
    const res = mockRes();
    let nexted = false;
    medicationSearchRateLimit(req as never, res as never, () => {
      nexted = true;
    });
    if (!nexted) {
      blocked = true;
      assert.equal(res._out.code, 429);
      assert.ok(res._out.headers['Retry-After']);
      break;
    }
  }
  assert.equal(blocked, true, 'la ricerca pubblica deve essere limitata per IP');
});

test('rate limiter uses LRU eviction and removes expired identity buckets', () => {
  let now = 0;
  const limiter = makeLimiter(1_000, 1, 'bounded-test', {
    maxBuckets: 2,
    now: () => now,
  });
  const run = (ip: string) => {
    const req = mockReq({}, ip);
    const res = mockRes();
    let nexted = false;
    limiter(req as never, res as never, () => {
      nexted = true;
    });
    return { nexted, res };
  };

  assert.equal(run('198.51.100.1').nexted, true);
  assert.equal(run('198.51.100.2').nexted, true);
  assert.equal(run('198.51.100.3').nexted, true, 'un nuovo IP deve sostituire il bucket LRU');
  const retained = run('198.51.100.2');
  assert.equal(retained.nexted, false, 'un bucket recente deve conservare il proprio limite');
  assert.equal(retained.res._out.code, 429);
  assert.equal(run('198.51.100.1').nexted, true, 'il bucket piu vecchio deve essere stato espulso');

  now = 1_001;
  assert.equal(run('198.51.100.3').nexted, true, 'i bucket scaduti devono essere rimossi');
});

test('rate limiter can enforce one aggregate budget across rotating IPs', () => {
  const limiter = makeLimiter(60_000, 2, 'global-test', {
    maxBuckets: 1,
    key: () => 'global',
  });
  const run = (ip: string) => {
    const req = mockReq({}, ip);
    const res = mockRes();
    let nexted = false;
    limiter(req as never, res as never, () => {
      nexted = true;
    });
    return { nexted, res };
  };

  assert.equal(run('203.0.113.1').nexted, true);
  assert.equal(run('203.0.113.2').nexted, true);
  const blocked = run('203.0.113.3');
  assert.equal(blocked.nexted, false);
  assert.equal(blocked.res._out.code, 429);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeGuardState } from '../../src/bug-pipeline/native-guard-state.mjs';
test('only parent-held identity handle and actual validated claim release exactly one captured forward', async () => {
  let forwarded = 0;
  const g = createNativeGuardState({
    validateClaim: async (claim, seal) =>
      claim.nonce === 'actual-owned' && seal.bodySha256 === 'a'.repeat(64),
  });
  const input = { bodySha256: 'a'.repeat(64), model: 'claude-opus-5-5' };
  const staged = g.data.stage({
    seal: input,
    forward: async () => {
      forwarded++;
      return 'synthetic-response';
    },
  });
  input.model = 'changed alias';
  assert.equal(g.data.status().phase, 'STAGED');
  assert.equal(forwarded, 0);
  assert.equal(staged.seal.model, 'claude-opus-5-5');
  assert.equal(
    await g.parent.release(staged.handle, { nonce: 'actual-owned' }),
    'synthetic-response',
  );
  assert.equal(await staged.completion, 'synthetic-response');
  assert.equal(forwarded, 1);
  assert.equal(g.data.status().forwardAttempts, 1);
});
test('concurrent second request permanently poisons a release waiting on its claim fence', async () => {
  let resolveClaim,
    forwards = 0;
  const g = createNativeGuardState({
    validateClaim: () =>
      new Promise((r) => {
        resolveClaim = r;
      }),
  });
  const s = g.data.stage({
    seal: { x: 'first' },
    forward: async () => {
      forwards++;
    },
  });
  const pending = g.parent.release(s.handle, { nonce: 'owned' });
  assert.throws(() => g.data.stage({ seal: {}, forward() {} }), /native-state-rejected/);
  resolveClaim(true);
  await assert.rejects(pending, /native-state-rejected/);
  await assert.rejects(s.completion, /native-state-rejected/);
  assert.equal(forwards, 0);
  assert.equal(g.data.status().phase, 'FAILED');
});
test('forged handles, failed claims and uncertain upstream outcomes never refund or replay', async () => {
  for (const kind of ['forged', 'claim', 'upstream']) {
    let forwards = 0;
    const g = createNativeGuardState({ validateClaim: async () => kind !== 'claim' });
    const s = g.data.stage({
      seal: {},
      forward: async () => {
        forwards++;
        throw new Error('unsafe raw secret diagnostic');
      },
    });
    await assert.rejects(
      g.parent.release(kind === 'forged' ? {} : s.handle, { nonce: 'owned' }),
      /native-state-rejected/,
    );
    await assert.rejects(s.completion, /native-state-rejected/);
    await assert.rejects(g.parent.release(s.handle, { nonce: 'owned' }), /native-state-rejected/);
    assert.equal(g.data.status().phase, 'FAILED');
    assert.equal(forwards, kind === 'upstream' ? 1 : 0);
  }
});
test('a concurrent second parent release cannot pass the same awaiting fence', async () => {
  let resolve,
    forwards = 0;
  const g = createNativeGuardState({
    validateClaim: () =>
      new Promise((yes) => {
        resolve = yes;
      }),
  });
  const s = g.data.stage({
    seal: {},
    forward: async () => {
      forwards++;
    },
  });
  const first = g.parent.release(s.handle, { nonce: 'owned' });
  assert.equal(g.data.status().forwardAttempts, 1);
  await assert.rejects(g.parent.release(s.handle, { nonce: 'owned' }), /native-state-rejected/);
  resolve(true);
  await assert.rejects(first, /native-state-rejected/);
  await assert.rejects(s.completion, /native-state-rejected/);
  assert.equal(g.data.status().forwardAttempts, 1);
  assert.equal(forwards, 0);
});
test('claim and seal aliases are detached and a late retry poisons the final session state', async () => {
  let resolve, checked;
  const g = createNativeGuardState({
    validateClaim: async (claim) => {
      checked = claim;
      await new Promise((yes) => {
        resolve = yes;
      });
      return claim.nonce === 'owned';
    },
  });
  const seal = { nested: { source: 'frozen' } },
    claim = { nonce: 'owned' };
  const s = g.data.stage({ seal, forward: async () => 'response' });
  const release = g.parent.release(s.handle, claim);
  claim.nonce = 'changed';
  seal.nested.source = 'changed';
  resolve();
  assert.equal(await release, 'response');
  assert.equal(checked.nonce, 'owned');
  assert.equal(s.seal.nested.source, 'frozen');
  assert.throws(() => g.data.stage({ seal: {}, forward() {} }), /native-state-rejected/);
  assert.equal(g.data.status().phase, 'FAILED');
  assert.equal(g.data.status().forwardAttempts, 1);
});

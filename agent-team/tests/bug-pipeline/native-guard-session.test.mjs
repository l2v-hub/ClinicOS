import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPolicyBarrier,
  stageGuardedSession,
} from '../../src/bug-pipeline/native-guard-session.mjs';
import { validateNativeRequest } from '../../src/bug-pipeline/native-guard-request.mjs';

const line = (message) => Buffer.from(`2026-11-03T14:00:00.000Z [DEBUG] ${message}\n`);
const settled = 'Remote settings: Saved empty sentinel (404 response)';

test('native policy settlement requires the complete late genuine marker', () => {
  const barrier = createPolicyBarrier();
  assert.equal(barrier.ready(), false);
  const bytes = line(settled);
  barrier.push(bytes.subarray(0, bytes.length - 1));
  assert.equal(barrier.ready(), false);
  barrier.push(bytes.subarray(bytes.length - 1));
  assert.equal(barrier.ready(), true);
  assert.deepEqual(barrier.receipt(), { status: 'settled-empty', settlements: 1 });
});

test('policy watchdog, cache, save failure and late changes irreversibly poison', () => {
  for (const failure of [
    'Remote settings: Loading promise timed out, resolving anyway (load and fetch barriers)',
    'Remote settings: Using cached settings (304)',
    'Remote settings: Failed to save settings',
    'Remote settings: Unexpected policy change',
  ]) {
    for (const before of [true, false]) {
      const barrier = createPolicyBarrier();
      if (!before) barrier.push(line(settled));
      barrier.push(line(failure));
      if (before) barrier.push(line(settled));
      assert.equal(barrier.ready(), false);
      assert.deepEqual(barrier.receipt(), { status: 'policy-unproven', settlements: 1 });
    }
  }
});

test('transport success, malformed prefixes and duplicate settlement are not certificates', () => {
  for (const message of [
    line('Remote settings: No settings found (404)'),
    line('Remote settings: Fetched successfully'),
    Buffer.from(`${settled}\n`),
    Buffer.from(`not-a-date [DEBUG] ${settled}\n`),
  ]) {
    const barrier = createPolicyBarrier();
    barrier.push(message);
    assert.equal(barrier.ready(), false);
  }
  const duplicate = createPolicyBarrier();
  duplicate.push(line(settled));
  duplicate.push(line(settled));
  assert.equal(duplicate.ready(), false);
});

test('diagnostics are finite, private and never returned through receipts or exceptions', () => {
  const barrier = createPolicyBarrier();
  const privateText = 'private-diagnostic-fixture';
  assert.doesNotThrow(() => barrier.push(Buffer.from(privateText.repeat(70000))));
  barrier.push(line(settled));
  assert.equal(barrier.ready(), false);
  assert.equal(JSON.stringify(barrier.receipt()).includes(privateText), false);
});

test('invalid or incomplete UTF8 after settlement cannot authorize a source request', () => {
  for (const bytes of [Buffer.from([0xc3]), Buffer.from([0xff]), Buffer.from('partial')]) {
    const barrier = createPolicyBarrier();
    barrier.push(line(settled));
    assert.equal(barrier.ready(), true);
    barrier.push(bytes);
    assert.equal(barrier.ready(), false);
  }
});

const sha = 'a'.repeat(40);
const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['subject_sha'],
  properties: { subject_sha: { type: 'string', const: sha } },
};
const expected = {
  input: 'Synthetic source only',
  model: 'claude-opus-5-5',
  outputCap: 32768,
  contextWindow: 1000000,
  subjectSha: sha,
  schema,
};
const profile = { model: expected.model, contextWindow: 1000000, maxOutputTokens: 128000 };
const frame = (type, fields) => `event: ${type}\ndata: ${JSON.stringify({ type, ...fields })}\n\n`;
function syntheticSse(report) {
  return Buffer.from(
    frame('message_start', {
      message: {
        id: 'msg_fixture',
        type: 'message',
        role: 'assistant',
        model: expected.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 1 },
      },
    }) +
      frame('content_block_start', {
        index: 0,
        content_block: {
          type: 'tool_use',
          id: 'toolu_fixture',
          name: 'StructuredOutput',
          input: {},
        },
      }) +
      frame('content_block_delta', {
        index: 0,
        delta: { type: 'input_json_delta', partial_json: JSON.stringify(report) },
      }) +
      frame('content_block_stop', { index: 0 }) +
      frame('message_delta', {
        delta: { stop_reason: 'tool_use', stop_sequence: null },
        usage: { output_tokens: 50 },
      }) +
      frame('message_stop', {}),
  );
}
function sessionFixture({
  lateRetry = false,
  policyFailure = false,
  cliDuplicate = false,
  isolated = true,
  hang = false,
} = {}) {
  const calls = [];
  let privateRead = false;
  const startRuntime = async ({
    expected: pinned,
    data,
    onStage,
    onDiagnostic,
    observeResponse,
  }) => {
    let done;
    const completion = new Promise((resolve) => {
      done = resolve;
    });
    const report = { subject_sha: sha };
    const body = Buffer.from(
      JSON.stringify({
        model: pinned.model,
        max_tokens: pinned.outputCap,
        stream: true,
        messages: [{ role: 'user', content: pinned.input }],
        tools: [{ name: 'StructuredOutput', input_schema: pinned.schema }],
      }),
    );
    const seal = validateNativeRequest({
      body,
      rawHeaders: [
        'Host',
        'api.anthropic.com',
        'Content-Type',
        'application/json',
        'Content-Length',
        String(body.length),
        'Authorization',
        'Bearer synthetic-fixture',
      ],
      host: 'api.anthropic.com',
      method: 'POST',
      path: '/v1/messages',
      expected: pinned,
    });
    const candidate = data.stage({
      seal,
      forward: async () => {
        calls.push('forward');
        const response = observeResponse({ statusCode: 200, requestId: 'req_fixture', seal });
        response.push(syntheticSse(report));
        if (hang) return await new Promise(() => {});
        if (lateRetry) data.fail();
        if (policyFailure) onDiagnostic(line('Remote settings: Unexpected policy change'));
        done({ ok: true, code: 0 });
        return { statusCode: 200 };
      },
    });
    calls.push('stage');
    onStage(candidate);
    onDiagnostic(line(settled));
    return {
      completion,
      isolation: Promise.resolve({
        runtimeIsolationVerified: isolated,
        binaryVerified: true,
        cliSha256: 'bc1aad9982c7b59c7d889ff92595d61cf46e0a6eae074cb551d932a989bcd222',
        imageDigest: 'sha256:9f0dde62d10e7ff7a310ecaebd66225f6b46c17e6cb778449a77b05d3541bea2',
      }),
      takePrivateOutput() {
        assert.equal(privateRead, false);
        privateRead = true;
        const json = JSON.stringify({
          type: 'result',
          subtype: 'success',
          is_error: false,
          structured_output: report,
          modelUsage: { [profile.model]: profile },
        });
        return {
          stdout: cliDuplicate
            ? json.replace('"is_error":false', '"is_error":true,"is_error":false')
            : json,
          stderr: 'synthetic-private-diagnostic',
        };
      },
      async close() {
        calls.push('close');
        done({ ok: false, code: null });
      },
    };
  };
  return { calls, startRuntime };
}

test('staged source waits for actual owned claim then validates real native and upstream equality', async () => {
  const f = sessionFixture();
  const session = await stageGuardedSession({
    expected,
    startRuntime: f.startRuntime,
    validateClaim: async (claim) => {
      f.calls.push('claim-checked');
      return claim.nonce === 'owned-fixture';
    },
  });
  assert.deepEqual(f.calls, ['stage']);
  const result = await session.release({ nonce: 'owned-fixture' });
  assert.deepEqual(f.calls, ['stage', 'claim-checked', 'forward', 'close']);
  assert.equal(result.ok, true);
  assert.equal(result.profile.maxOutputTokens, 128000);
  assert.equal(result.proof.actualMaxTokens, 32768);
  assert.equal(result.proof.responseMatchesNative, true);
  assert.equal(JSON.stringify(result).includes('synthetic-private-diagnostic'), false);
  await assert.rejects(session.release({ nonce: 'owned-fixture' }), /native-session-rejected/);
  assert.equal(f.calls.filter((call) => call === 'forward').length, 1);
});

test('foreign claim and unproven isolation cannot forward source', async () => {
  const f = sessionFixture();
  const session = await stageGuardedSession({
    expected,
    startRuntime: f.startRuntime,
    validateClaim: async () => false,
  });
  await assert.rejects(session.release({ nonce: 'foreign-fixture' }), /native-session-rejected/);
  assert.equal(f.calls.includes('forward'), false);
  const unproven = sessionFixture({ isolated: false });
  await assert.rejects(
    stageGuardedSession({
      expected,
      startRuntime: unproven.startRuntime,
      validateClaim: async () => true,
    }),
    /native-session-rejected/,
  );
  assert.equal(unproven.calls.includes('forward'), false);
});

test('late retry, late policy and duplicate CLI JSON remain actual failures, never earlier success', async () => {
  for (const failure of [{ lateRetry: true }, { policyFailure: true }, { cliDuplicate: true }]) {
    const f = sessionFixture(failure);
    const session = await stageGuardedSession({
      expected,
      startRuntime: f.startRuntime,
      validateClaim: async () => true,
    });
    await assert.rejects(session.release({ nonce: 'owned-fixture' }), /native-session-rejected/);
    assert.equal(f.calls.filter((call) => call === 'forward').length, 1);
    assert.ok(f.calls.includes('close'));
  }
});

test('a stalled already-owned forward reaches terminal failure without replaying source', async () => {
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    const f = sessionFixture({ hang: true });
    const session = await stageGuardedSession({
      expected,
      startRuntime: f.startRuntime,
      validateClaim: async () => true,
      timeoutMs: 30,
    });
    session.assertReady();
    await assert.rejects(session.release({ nonce: 'owned-fixture' }), /native-session-rejected/);
    assert.equal(f.calls.filter((call) => call === 'forward').length, 1);
    assert.ok(f.calls.includes('close'));
    assert.throws(() => session.assertReady());
  } finally {
    clearTimeout(keepAlive);
  }
});

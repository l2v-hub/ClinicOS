import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeResponseGuard } from '../../src/bug-pipeline/native-guard-response.mjs';
import { reviewSchema } from '../../../scripts/quality-gate/claude-bug-review.mjs';
const sha = 'a'.repeat(40),
  report = { subject_sha: sha, verdict: 'approved', summary: 'Synthetic only', findings: [] };
const event = (type, value) => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
function stream({ model = 'claude-opus-5-5', output = 80, result = report, rawJson } = {}) {
  return Buffer.from(
    event('message_start', {
      message: {
        id: 'msg_synthetic_1',
        type: 'message',
        role: 'assistant',
        model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 1 },
      },
    }) +
      event('content_block_start', {
        index: 0,
        content_block: {
          type: 'tool_use',
          id: 'toolu_synthetic_1',
          name: 'StructuredOutput',
          input: {},
        },
      }) +
      event('content_block_delta', {
        index: 0,
        delta: { type: 'input_json_delta', partial_json: rawJson ?? JSON.stringify(result) },
      }) +
      event('content_block_stop', { index: 0 }) +
      event('message_delta', {
        delta: { stop_reason: 'tool_use', stop_sequence: null },
        usage: { output_tokens: output },
      }) +
      event('message_stop', {}),
  );
}
const guard = () =>
  createNativeResponseGuard({
    statusCode: 200,
    requestId: 'req_synthetic_1',
    model: 'claude-opus-5-5',
    maxTokens: 32768,
    subjectSha: sha,
  });
test('strict SSE reconstructs one genuine StructuredOutput and matches native CLI report', () => {
  const g = guard(),
    bytes = stream();
  for (let i = 0; i < bytes.length; i += 7) g.push(bytes.subarray(i, i + 7));
  const result = g.finish({ cliReport: structuredClone(report) });
  assert.deepEqual(result.report, report);
  assert.equal(result.outputTokens, 80);
  assert.equal(result.model, 'claude-opus-5-5');
  assert.ok(Object.isFrozen(result));
});
test('model/output/CLI mismatch, missing stop, duplicate message and malformed UTF8 poison response', () => {
  for (const bytes of [
    stream({ model: 'other' }),
    stream({ output: 32769 }),
    stream().subarray(0, -10),
    Buffer.concat([stream(), stream()]),
    Buffer.from([255]),
  ]) {
    const g = guard();
    g.push(bytes);
    assert.throws(() => g.finish({ cliReport: report }), /native-response-rejected/);
  }
  const g = guard();
  g.push(stream());
  assert.throws(
    () => g.finish({ cliReport: { ...report, verdict: 'blocked' } }),
    /native-response-rejected/,
  );
});
test('documented thinking/signature blocks stay bounded by genuine cumulative usage before one tool', () => {
  const frames = stream()
    .toString()
    .trimEnd()
    .split('\n\n')
    .map((frame) => JSON.parse(frame.split('\ndata: ')[1]));
  const first = frames.shift();
  const thinking =
    event('content_block_start', { index: 0, content_block: { type: 'thinking', thinking: '' } }) +
    event('content_block_delta', { index: 0, delta: { type: 'thinking_delta', thinking: '' } }) +
    event('content_block_delta', {
      index: 0,
      delta: { type: 'signature_delta', signature: 'c3ludGhldGlj' },
    }) +
    event('content_block_stop', { index: 0 });
  const bytes = Buffer.from(
    event(first.type, first) +
      thinking +
      frames
        .map((frame) => {
          if (frame.index !== undefined) frame.index++;
          return event(frame.type, frame);
        })
        .join(''),
  );
  const g = guard();
  g.push(bytes);
  const result = g.finish({ cliReport: report });
  assert.equal(result.thinkingBlocks, 1);
  assert.equal(result.outputTokens, 80);
  assert.equal(JSON.stringify(result).includes('c3ludGhldGlj'), false);
  const bad = guard();
  bad.push(Buffer.from(bytes.toString().replace('signature_delta', 'unknown_delta')));
  assert.throws(() => bad.finish({ cliReport: report }), /native-response-rejected/);
});
test('strict SSE disallows duplicate decoded keys, alternate tools, retry/fallback and output truncation', () => {
  const invalid = [
    stream().toString().replace('"name":"StructuredOutput"', '"name":"Read"'),
    stream().toString().replace('"stop_reason":"tool_use"', '"stop_reason":"max_tokens"'),
    stream()
      .toString()
      .replace('"type":"message_stop"', '"type":"message_stop","\\u0074ype":"message_stop"'),
    stream({ rawJson: '{"subject_sha":"' + sha + '","subject_sha":"' + sha + '"}' }).toString(),
    stream().toString().replace('"type":"tool_use"', '"type":"fallback"'),
  ];
  for (const raw of invalid) {
    const g = guard();
    g.push(Buffer.from(raw));
    assert.throws(() => g.finish({ cliReport: report }), /native-response-rejected/);
  }
});
test('actual review schema subset is enforced and unknown schema keywords reject before a result', () => {
  const options = {
    statusCode: 200,
    requestId: 'req_synthetic_1',
    model: 'claude-opus-5-5',
    maxTokens: 32768,
    subjectSha: sha,
    schema: reviewSchema,
  };
  const g = createNativeResponseGuard(options);
  g.push(stream());
  assert.deepEqual(g.finish({ cliReport: report }).report, report);
  const invalid = { ...report, findings: [{ severity: 'invented' }] };
  const bad = createNativeResponseGuard(options);
  bad.push(stream({ result: invalid }));
  assert.throws(() => bad.finish({ cliReport: invalid }), /native-response-rejected/);
  assert.throws(
    () =>
      createNativeResponseGuard({
        ...options,
        schema: {
          ...reviewSchema,
          properties: {
            ...reviewSchema.properties,
            optional: { type: 'string', unsupported: true },
          },
        },
      }),
    /native-response-rejected/,
  );
});
test('response memory bounds, mutation aliases and poisoned re-use never select an earlier answer', () => {
  const g = guard(),
    source = stream();
  g.push(source);
  source.fill(0);
  assert.deepEqual(g.finish({ cliReport: report }).report, report);
  assert.throws(() => g.finish({ cliReport: report }), /native-response-rejected/);
  assert.throws(() => g.push(stream()), /native-response-rejected/);
  const huge = guard();
  assert.throws(() => huge.push(Buffer.alloc(2 * 1024 * 1024 + 1)), /native-response-rejected/);
  assert.throws(() => huge.finish({ cliReport: report }), /native-response-rejected/);
});

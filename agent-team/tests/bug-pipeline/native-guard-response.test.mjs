import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeResponseGuard } from '../../src/bug-pipeline/native-guard-response.mjs';
const sha = 'a'.repeat(40), report = { subject_sha: sha, verdict: 'approved', summary: 'Synthetic only', findings: [] };
function stream({ model = 'claude-opus-5-5', output = 80, result = report } = {}) {
  const event = (type, value) => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
  return Buffer.from(event('message_start', { message: { id: 'msg_synthetic_1', type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 1 } } }) +
    event('content_block_start', { index: 0, content_block: { type: 'tool_use', id: 'toolu_synthetic_1', name: 'StructuredOutput', input: {} } }) +
    event('content_block_delta', { index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(result) } }) +
    event('content_block_stop', { index: 0 }) + event('message_delta', { delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: output } }) + event('message_stop', {}));
}
const guard = () => createNativeResponseGuard({ statusCode: 200, requestId: 'req_synthetic_1', model: 'claude-opus-5-5', maxTokens: 32768, subjectSha: sha });
test('strict SSE reconstructs one genuine StructuredOutput and matches native CLI report', () => {
  const g = guard(), bytes = stream();
  for (let i = 0; i < bytes.length; i += 7) g.push(bytes.subarray(i, i + 7));
  const result = g.finish({ cliReport: structuredClone(report) });
  assert.deepEqual(result.report, report);
  assert.equal(result.outputTokens, 80);
  assert.equal(result.model, 'claude-opus-5-5');
  assert.ok(Object.isFrozen(result));
});
test('model/output/CLI mismatch, missing stop, duplicate message and malformed UTF8 poison response', () => {
  for (const bytes of [stream({ model: 'other' }), stream({ output: 32769 }), stream().subarray(0, -10), Buffer.concat([stream(), stream()]), Buffer.from([255])]) {
    const g = guard(); g.push(bytes); assert.throws(() => g.finish({ cliReport: report }), /native-response-rejected/);
  }
  const g = guard(); g.push(stream());
  assert.throws(() => g.finish({ cliReport: { ...report, verdict: 'blocked' } }), /native-response-rejected/);
});

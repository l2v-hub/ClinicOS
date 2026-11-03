import test from 'node:test';
import assert from 'node:assert/strict';
import { validateNativeRequest } from '../../src/bug-pipeline/native-guard-request.mjs';
const schema = { type: 'object', properties: { subject_sha: { type: 'string' } }, required: ['subject_sha'], additionalProperties: false };
function fixture(input = 'Synthetic complete review input') {
  const expected = { input, schema, model: 'claude-opus-5-5', outputCap: 32768, contextWindow: 1000000 };
  const value = { model: expected.model, max_tokens: 32768, stream: true,
    system: [{ type: 'text', text: 'Trusted synthetic native wrapper' }],
    messages: [{ role: 'user', content: [{ type: 'text', text: input }] }],
    tools: [{ name: 'StructuredOutput', description: 'Return the exact report.', input_schema: schema }],
    tool_choice: { type: 'auto' } };
  const request = () => { const body = Buffer.from(JSON.stringify(value)); return { body, rawHeaders: ['Host', 'api.anthropic.com', 'Authorization', 'Bearer synthetic-not-credential', 'Content-Type', 'application/json', 'Content-Length', String(body.length)], host: 'api.anthropic.com', method: 'POST', path: '/v1/messages?beta=true', expected }; };
  return { expected, value, request };
}
test('full843365 plus40KiB synthetic context fits only the sealed actual32k cap', () => {
  const f = fixture('x'.repeat(843365 + 40 * 1024));
  const seal = validateNativeRequest(f.request());
  assert.equal(seal.maxTokens, 32768);
  assert.equal(seal.model, f.expected.model);
  assert.equal(seal.inputBytes, Buffer.byteLength(f.expected.input));
  assert.ok(seal.requiredTokensUpperBound <= 1000000);
  assert.ok(Object.isFrozen(seal));
  assert.equal(JSON.stringify(seal).includes('synthetic-not-credential'), false);
  f.value.max_tokens = 128000;
  assert.throws(() => validateNativeRequest(f.request()), /native-request-rejected/);
});
test('exact decoded context boundary and one byte over retain the native65536 margin', () => {
  const first = fixture(''), seal = validateNativeRequest(first.request());
  const exact = fixture('x'.repeat(1000000 - seal.requiredTokensUpperBound));
  assert.equal(validateNativeRequest(exact.request()).requiredTokensUpperBound, 1000000);
  const over = fixture(exact.expected.input + 'x');
  assert.throws(() => validateNativeRequest(over.request()), /native-request-rejected/);
});
test('outer escaping is decoded once but embedded packet JSON remains model visible', () => {
  const f = fixture(JSON.stringify({ source: '漢😀\n"\\'.repeat(100) }));
  const seal = validateNativeRequest(f.request());
  assert.equal(seal.inputBytes, Buffer.byteLength(f.expected.input));
  assert.ok(f.request().body.length > seal.inputBytes);
});
test('framing, context fields, extra user content and schema/model mismatch all fail closed', () => {
  const changes = [
    (f) => { f.value.model = 'other'; }, (f) => { f.value.messages[0].content[0].text += 'changed'; },
    (f) => { f.value.messages[0].content.push({ type: 'text', text: 'hidden context' }); },
    (f) => { f.value.tools.push({ name: 'Read', input_schema: {} }); },
    (f) => { f.value.tools[0].input_schema = {}; }, (f) => { f.value.context_management = {}; },
    (f) => { f.value.system = [{ type: 'image', source: {} }]; },
  ];
  for (const change of changes) { const f = fixture(); change(f); assert.throws(() => validateNativeRequest(f.request()), /native-request-rejected/); }
  for (const change of [
    (r) => r.rawHeaders.push('host', 'api.anthropic.com'),
    (r) => r.rawHeaders.push('Transfer-Encoding', 'chunked'),
    (r) => { r.rawHeaders[7] = '1'; }, (r) => { r.host = 'evil.example'; },
    (r) => { r.path = '/v1/messages?other=true'; },
  ]) { const r = fixture().request(); change(r); assert.throws(() => validateNativeRequest(r), /native-request-rejected/); }
});

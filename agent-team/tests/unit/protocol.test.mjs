import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProtocolComment, parseProtocolComment, fingerprintFinding } from '../../src/core/protocol.mjs';

const schema = { type: 'object', additionalProperties: false, required: ['schema_version', 'message_type', 'issue_number'], properties: { schema_version: { const: 1 }, message_type: { enum: ['qa_result'] }, issue_number: { type: 'integer' } } };

test('protocol comment round-trips one schema-valid JSON object', () => {
  const message = { schema_version: 1, message_type: 'qa_result', issue_number: 263 };
  assert.deepEqual(parseProtocolComment(formatProtocolComment(message), schema), message);
});

test('protocol rejects prose and unknown fields', () => {
  assert.equal(parseProtocolComment('QA passed', schema), null);
  assert.throws(() => formatProtocolComment({ schema_version: 1, message_type: 'qa_result', issue_number: 263, extra: true }, schema), /additional property/);
});

test('finding fingerprints remain stable across timestamps', () => {
  const base = { finding_id: 'QA-1', acceptance_criterion_id: 'AC-3', severity: 'high', category: 'auth', observed: 'loggedIn false', expected: 'loggedIn true' };
  assert.equal(fingerprintFinding({ ...base, created_at: 'a' }), fingerprintFinding({ ...base, created_at: 'b' }));
});

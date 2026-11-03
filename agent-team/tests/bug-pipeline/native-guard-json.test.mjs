import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGuardJson } from '../../src/bug-pipeline/native-guard-json.mjs';
const parse = (s, options) => parseGuardJson(Buffer.from(s), options);
test('guard JSON decodes valid bounded UTF8 once and returns immutable values', () => {
  const value = parse('{"text":"漢😀\\n","array":[true,null,1.25]}');
  assert.equal(value.text, '漢😀\n');
  assert.deepEqual(value.array, [true, null, 1.25]);
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.array));
});
test('duplicate decoded/prototype keys and unpaired surrogates never survive parsing', () => {
  for (const s of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"__proto__":0}', '{"constructor":0}', '{"x":"\\ud800"}', '{"x":"\\udfff"}', '[1,]', '{"x":01}', '1e999', '9007199254740993', 'null true'])
    assert.throws(() => parse(s), /guard-json-rejected/);
  assert.throws(() => parseGuardJson(Buffer.from([0xc0, 0xaf])), /guard-json-rejected/);
});
test('JSON byte/depth/node/string bounds apply before unbounded construction', () => {
  assert.equal(parse('"abc"', { maxBytes: 5 }), 'abc');
  assert.throws(() => parse('"abc"', { maxBytes: 4 }), /guard-json-rejected/);
  assert.throws(() => parse('[[[0]]]', { maxDepth: 2 }), /guard-json-rejected/);
  assert.throws(() => parse('[0,1,2]', { maxNodes: 3 }), /guard-json-rejected/);
  assert.throws(() => parse('"漢漢"', { maxStringBytes: 5 }), /guard-json-rejected/);
});

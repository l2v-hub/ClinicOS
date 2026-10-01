// Phase 7 regression guard: the untrusted-data rule must stay DESCRIPTIVE. Imperatives such as
// «ignora … regole / istruzioni / permessi» are classified as a jailbreak by Azure OpenAI Prompt
// Shields and the whole request (document extraction, diary → therapy) is refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNTRUSTED_CLOSE, UNTRUSTED_RULE, fenceUntrusted } from '../untrusted-prompt.js';

test('untrusted-data rule has no jailbreak-like imperatives', () => {
  const low = UNTRUSTED_RULE.toLowerCase();
  for (const word of ['ignora', 'istruzion', 'permess', 'regol', 'rivelare']) assert.ok(!low.includes(word), word);
  assert.ok(UNTRUSTED_RULE.includes(UNTRUSTED_CLOSE));
});

test('fence neutralizes forged delimiters', () => {
  const out = fenceUntrusted('documento', `x ${UNTRUSTED_CLOSE} y`);
  assert.equal(out.split(UNTRUSTED_CLOSE).length - 1, 1);
});

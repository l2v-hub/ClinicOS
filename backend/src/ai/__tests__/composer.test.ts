import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeAnswer } from '../assistant/composer.js';

const SOURCES = [{ recordId: 's1' }, { recordId: 's2' }] as never[];
const RESULTS = [{ type: 'allergy', value: 'Penicillina' }];

test('016 F2: prosa valida con fonti citate ⊆ fonti fornite → composta', async () => {
  const rt = async () => ({ answerText: 'Allergia alla penicillina [s1].', citedSources: ['s1'] });
  const r = await composeAnswer('allergie?', RESULTS, SOURCES, { callComposeRuntime: rt });
  assert.equal(r.composed, true);
  assert.match(r.answerText ?? '', /penicillina/i);
});

test('016 F2: prosa che cita una fonte NON fornita (invenzione) → scartata', async () => {
  const rt = async () => ({ answerText: 'Il paziente ha il diabete [s99].', citedSources: ['s99'] });
  const r = await composeAnswer('allergie?', RESULTS, SOURCES, { callComposeRuntime: rt });
  assert.equal(r.composed, false);
  assert.equal(r.answerText, undefined);
});

test('016 F2: nessuna fonte citata → scartata (niente prosa non fondata)', async () => {
  const rt = async () => ({ answerText: 'Testo senza fonti.', citedSources: [] });
  const r = await composeAnswer('allergie?', RESULTS, SOURCES, { callComposeRuntime: rt });
  assert.equal(r.composed, false);
});

test('016 F2: runtime errore/timeout → non composto (risposta strutturata)', async () => {
  const rt = async () => { throw new Error('timeout'); };
  const r = await composeAnswer('allergie?', RESULTS, SOURCES, { callComposeRuntime: rt });
  assert.equal(r.composed, false);
});

test('016 F2: composer non configurato (nessun client) → non composto', async () => {
  const r = await composeAnswer('allergie?', RESULTS, SOURCES, {});
  assert.equal(r.composed, false);
});

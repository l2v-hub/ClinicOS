import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { agnosSuggestedPromptGroups } from './agnosSuggestionModel';

const flatten = (role: string, hasPatient: boolean) =>
  agnosSuggestedPromptGroups(role, hasPatient).flatMap((group) => group.prompts);

test('admin receives facility and operational suggestions without overflowing the first screen', () => {
  const groups = agnosSuggestedPromptGroups('admin', false);
  assert.deepEqual(
    groups.map((group) => group.id),
    ['facility', 'operator'],
  );
  assert.equal(groups.flatMap((group) => group.prompts).length, 4);
  assert.ok(groups.find((group) => group.id === 'operator')?.prompts.length);
});

test('operator never receives facility suggestions', () => {
  const prompts = flatten('operatore', false);
  assert.deepEqual(
    prompts.map((prompt) => prompt.audience),
    ['operator'],
  );
});

test('patient suggestions are shown only with a current patient and stay available to admin', () => {
  assert.equal(
    flatten('operatore', false).some((prompt) => prompt.audience === 'patient'),
    false,
  );
  assert.equal(
    flatten('operatore', true).filter((prompt) => prompt.audience === 'patient').length,
    3,
  );

  const adminAudiences = new Set(flatten('admin', true).map((prompt) => prompt.audience));
  assert.deepEqual(adminAudiences, new Set(['facility', 'patient', 'operator']));
  assert.equal(flatten('admin', true).length, 4);
});

test('suggestions are safe read questions supported by the deterministic planner', () => {
  const prompts = flatten('admin', true);
  for (const prompt of prompts) {
    assert.doesNotMatch(prompt.text, /registra|modifica|elimina|diagnosi|consiglia/i);
  }
});

test('suggestions use native buttons and prefill instead of sending immediately', () => {
  const component = readFileSync(new URL('./AgnosSuggestedPrompts.tsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../AgnosPanel.tsx', import.meta.url), 'utf8');
  assert.match(component, /<button[\s\S]*?type="button"/);
  assert.match(component, /aria-describedby="agnos-suggestions-help"/);
  assert.match(component, /onClick=\{\(\) => onSelect\(prompt\.text\)\}/);
  assert.match(panel, /setInput\(text\)/);
  assert.doesNotMatch(component, /sendCommand/);
});

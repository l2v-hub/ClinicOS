import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React, { createElement } from 'react';
import {
  writeActionNavigation,
  readActionNavigation,
  navigationScope,
  navigateAgnosTarget,
} from './agnosActionNavigation';
import { createAgnosRequestGate } from './agnosRequestGate';
import { isDefinitiveAgnosDenial, normalizeAgnosPreview } from './useAgnosChat';
import { TurnView } from './AgnosTurnView';
import type { AssistantAnswer } from '../AIAssistantButton';
import { voiceErrorMessage } from './useVoiceInput';
Object.assign(globalThis, { React });

test('all seven writes map to exact patient page or agenda, unknown/deletes/missing IDs fail closed', async () => {
  const destinations: Record<string, string> = {
    create_vital_sign: 'parametri',
    update_patient_demographics: 'profilo',
    update_narrative_section: 'sezioni-narrative',
    add_diary_note: 'diario',
    create_consegna: 'consegne',
    create_appointment: 'agenda-operatore',
    update_appointment: 'agenda-operatore',
  };
  for (const [actionType, destination] of Object.entries(destinations)) {
    const nav = writeActionNavigation({ actionType, patientId: 'qa-patient' });
    assert.ok(nav);
    const calls: unknown[] = [];
    assert.equal(
      await navigateAgnosTarget(nav, {
        isAdmin: false,
        navigate: (key) => calls.push(key),
        openPatient: async (id, tab) => {
          calls.push(tab);
          assert.equal(id, 'qa-patient');
          return true;
        },
        openConsegne: (_recordId, patientId) => {
          assert.equal(actionType, 'create_consegna');
          assert.equal(patientId, 'qa-patient');
          calls.push('consegne');
        },
      }),
      true,
    );
    assert.deepEqual(calls, [destination]);
  }
  for (const plan of [
    { actionType: 'delete_patient', patientId: 'qa' },
    { actionType: 'create_vital_sign' },
    { actionType: 'add_diary_note', patientId: '../another-patient' },
  ])
    assert.equal(writeActionNavigation(plan), null);
});

test('routing preserves failure and cancellation instead of claiming a page opened', async () => {
  const controller = new AbortController();
  const calls: string[] = [];
  const handlers = {
    isAdmin: false,
    navigate: (key: string) => calls.push(key),
    openPatient: async () => {
      calls.push('patient');
      return false;
    },
    openConsegne: () => calls.push('handover'),
  };
  assert.equal(
    await navigateAgnosTarget({ type: 'open_profile', label: '', patientId: 'qa' }, handlers),
    false,
  );
  assert.equal(
    await navigateAgnosTarget({ type: 'external_url', label: '', patientId: 'qa' }, handlers),
    false,
  );
  assert.equal(await navigateAgnosTarget({ type: 'open_beds', label: '' }, handlers), false);
  controller.abort();
  assert.equal(
    await navigateAgnosTarget({ type: 'open_agenda', label: '' }, handlers, controller.signal),
    false,
  );
  assert.deepEqual(calls, ['patient']);
});

test('read navigation only follows explicit single-page intent and structured authorized destinations', () => {
  const answer: AssistantAnswer = {
    intent: 'read',
    scope: 'patient',
    sources: [],
    results: [],
    notFound: false,
    navigation: [{ type: 'open_parameter', label: 'Parametri', patientId: 'qa' }],
  };
  assert.equal(readActionNavigation('quali parametri sono registrati?', answer), null);
  assert.equal(readActionNavigation('mostrami i parametri', answer)?.patientId, 'qa');
  answer.navigation.push({ ...answer.navigation[0], recordId: 'another-record' });
  assert.ok(readActionNavigation('apri parametri', answer));
  answer.navigation.push({ ...answer.navigation[0], patientId: 'other' });
  assert.equal(readActionNavigation('apri parametri', answer), null);
  assert.equal(
    readActionNavigation('apri link', {
      ...answer,
      navigation: [{ type: 'https://outside.invalid', label: '' }],
    }),
    null,
  );
  assert.equal(
    navigationScope({ type: 'open_agenda', label: '', patientId: 'qa' }, 'admin').navKey,
    'agenda-admin',
  );
  assert.equal(
    navigationScope({ type: 'open_agenda', label: '', patientId: 'qa' }).currentPatientId,
    undefined,
  );
  assert.deepEqual(navigationScope({ type: 'open_consegne', label: '', patientId: 'qa' }), {
    currentPatientId: 'qa',
    navKey: 'consegne',
  });
});

test('request gate synchronously rejects double starts and fences late work after cancellation', () => {
  const gate = createAgnosRequestGate();
  const first = gate.begin()!;
  assert.equal(gate.begin(), null);
  gate.cancel();
  assert.ok(first.signal.aborted);
  const second = gate.begin()!;
  assert.equal(gate.current(first.token), false);
  gate.finish(first.token);
  assert.equal(gate.busy, true);
  gate.finish(second.token);
  assert.equal(gate.busy, false);
});

test('preview retains full narrative diff and refuses ambiguities; hostile content stays escaped', () => {
  const preview = normalizeAgnosPreview({
    title: 'Aggiunta narrativa',
    lines: [{ label: 'Sezione', value: 'ANAMNESIS' }],
    diff: {
      current: 'Prima',
      proposed: '<script>test</script>\nSeconda riga',
      resulting: 'Prima\n<script>test</script>\nSeconda riga',
    },
    canExecute: true,
    ambiguities: ['Ora non specificata'],
  });
  assert.equal(preview.canExecute, false);
  assert.equal(preview.diff?.proposed, '<script>test</script>\nSeconda riga');
  const markup = renderToStaticMarkup(
    createElement(TurnView, {
      turn: { role: 'agnos', status: 'in-conferma', preview },
      isPending: true,
      busy: false,
      navigationReady: false,
      onOpenPage() {},
      onConfirm() {},
      onEdit() {},
      onCancel() {},
    }),
  );
  assert.match(markup, /Testo da aggiungere/);
  assert.match(markup, /&lt;script&gt;test&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /disabled=""[^>]*>Conferma e salva/);
});

test('microphone errors tell the operator how to recover', () => {
  assert.match(voiceErrorMessage('no-speech'), /Non ho sentito parole/);
  assert.match(voiceErrorMessage('not-allowed'), /Consenti l’accesso/);
  assert.match(voiceErrorMessage('network'), /servizio vocale/);
});

test('only recognized pre-write denials prove a failed save; server and malformed responses remain uncertain', () => {
  assert.equal(isDefinitiveAgnosDenial(403, { error: { kind: 'writes_disabled' } }), true);
  assert.equal(isDefinitiveAgnosDenial(409, { error: { kind: 'slot_conflict' } }), true);
  for (const status of [200, 500, 502, 503]) {
    assert.equal(isDefinitiveAgnosDenial(status, { error: { kind: 'internal' } }), false);
  }
  assert.equal(isDefinitiveAgnosDenial(200, null), false);
  assert.equal(isDefinitiveAgnosDenial(400, { error: { kind: 'unknown' } }), false);
});

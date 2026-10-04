import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { corePriorityOptions } from '../../../../lib/corePriority';
import { diaryCreatePayload, diaryWriteErrorMessage } from '../diaryEntryPayload';
import { createConsegnaDraftStore } from '../../../../lib/consegnaDrafts';
import { ConsegnaComposer } from '../../ConsegnaComposer';
import { identityPatient } from '../../__tests__/operationalIdentity.fixtures';
Object.assign(globalThis, { React });

test('AT-07: core priority UX is Normale / Urgente; a stored intermediate value is kept, not converted', () => {
  assert.deepEqual(
    corePriorityOptions('normale', 'importante', 'Importante').map((o) => o.value),
    ['normale', 'urgente'],
  );
  assert.deepEqual(
    corePriorityOptions('importante', 'importante', 'Importante').map((o) => o.value),
    ['normale', 'importante', 'urgente'],
  );
  assert.deepEqual(
    corePriorityOptions('alta', 'alta', 'Alta').map((o) => o.value),
    ['normale', 'alta', 'urgente'],
  );
});

test('AT-06: a new diary note sends no date, no state and no author', () => {
  const payload = diaryCreatePayload({ title: '  ', content: '  Riposa  ', priority: 'normale' });
  assert.deepEqual(payload, { title: null, content: 'Riposa', priority: 'normale' });
  assert.ok(!('entryDateTime' in payload) && !('status' in payload) && !('authorName' in payload));
});

test('diary save errors surface the backend validation reason', async () => {
  const bad = new Response(JSON.stringify({ error: 'content supera 16384 byte' }), { status: 400 });
  assert.equal(
    await diaryWriteErrorMessage(bad, 'Errore nel salvataggio della voce.'),
    'Errore nel salvataggio della voce. content supera 16384 byte',
  );
  const crash = new Response('x', { status: 500 });
  assert.equal(await diaryWriteErrorMessage(crash, 'Errore.'), 'Errore.');
});

test('diary form source: no «Stato» select and no manual date on the create form', () => {
  const src = readFileSync(new URL('../DiarioPazienteTab.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /<label className="form-label">Stato<\/label>/);
  assert.doesNotMatch(src, /<option value="importante">Importante<\/option>/);
  assert.match(src, /ClinicalNoteEditor/);
  assert.doesNotMatch(src, /type="datetime-local"/);
  // UX2 W8: no open/closed concept in the diary; only «da rivedere» is ever shown.
  assert.match(src, /row\.status === 'da_rivedere'/);
  assert.doesNotMatch(src, /'Aperta'|'Completata'/);
});

test('handover composer offers only Normale / Urgente and no «aperta» wording', () => {
  const html = renderToStaticMarkup(
    React.createElement(ConsegnaComposer, {
      patient: identityPatient,
      store: createConsegnaDraftStore(),
      operatori: [],
      onSave() {},
    }),
  );
  assert.match(html, /<option value="normale"[^>]*>Normale<\/option>/);
  assert.match(html, /<option value="urgente"[^>]*>Alta · richiede presa in carico<\/option>/);
  assert.doesNotMatch(html, /value="alta"/);
  assert.doesNotMatch(html, /sarà aperta/);
});

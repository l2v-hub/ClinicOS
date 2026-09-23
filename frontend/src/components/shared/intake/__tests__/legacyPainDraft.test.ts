import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildConfirmCartella } from '../confirmCartella';
import { StepClinica } from '../StepClinica';
import { StepVerifica } from '../StepVerifica';
import { intakeSections } from '../../../operator/sections/patientSections';
Object.assign(globalThis, { React });
test('confirmation retains original draft pain without creating NRS and preserves separate vital pain values', () => {
  for (const dolore of [null, false, 0, [], { punteggio: -1 }, [{ id: 'old', punteggio: 0, note: ' Originale\n' }]]) {
    const data = { dolore, parametri: { parametriVitali: [{ tipo: 'nrs', valore: 3 }], parametriMensili: [{ dolore: 'presente', doloreLivello: 5 }] } };
    const original = structuredClone(data);
    const result = buildConfirmCartella(data);
    assert.equal(Object.hasOwn(result, 'valutazioniNRS'), false);
    assert.deepEqual(result.parametriVitali, data.parametri.parametriVitali);
    assert.deepEqual(result.parametriMensili, data.parametri.parametriMensili);
    assert.deepEqual(data, original);
  }
});
test('new intake has no editable NRS section; old pain remains read-only with an accurate confirmation notice', () => {
  assert.equal(intakeSections().some(section => section.sectionKey === 'dolore'), false);
  let writes = 0;
  const data = { dolore: { punteggio: -1, note: 'Dato precedente intatto' } };
  const clinical = renderToStaticMarkup(React.createElement(StepClinica, { data, onUpdateSection() { writes++; } }));
  assert.match(clinical, /Dato precedente intatto/);
  assert.match(clinical, /non confermati come valutazione/);
  assert.doesNotMatch(clinical, /Nuova rilevazione NRS/);
  const summary = renderToStaticMarkup(React.createElement(StepVerifica, { data, busy: false, error: null, onConfirm() {}, onUpdateSection() { writes++; } }));
  assert.match(summary, /Non saranno confermati come nuove valutazioni/);
  assert.equal(writes, 0);
});

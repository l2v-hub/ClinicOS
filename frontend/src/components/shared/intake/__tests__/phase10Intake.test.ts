// Phase 10 — ingresso: terapia rinviata per conflitto, motivo del rifiuto del salvataggio,
// documento a fianco della terapia, prescrittore «Dimissione ospedaliera», allergie, DTX 20.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DischargeTherapyReview } from '../DischargeTherapyReview';
import { IntakeAiProvider } from '../intakeAiOrigin';
import { therapySourceChip } from '../intakeDocumentPages';
import { DraftApiError, draftRejectionReason } from '../intakeDraftApi';
import { INTAKE_PRESCRIBER_SUGGESTIONS } from '../intakeTherapies';
import type { DischargeTherapyRow } from '../dischargeTherapy';
import type { ImportJob } from '../../import/importSessionTypes';
import { emptyTherapyForm, TherapyFormFields } from '../../../operator/cartella/TherapyFormFields';
import { AnamnesisEditor } from '../../../operator/sections/AnamnesisEditor';
import { legacyParameterEntries } from '../../../../lib/patientParameterReadings';
import type { CartellaPaziente } from '../../../../types';

Object.assign(globalThis, { React });

const job = {
  manifest: {
    groups: [
      { id: 'g2', sortOrder: 1 },
      { id: 'g1', sortOrder: 0 },
    ],
    pages: [
      { id: 'p2', groupId: 'g1', documentId: 'd1', sortOrder: 1, sourcePageNumber: 2 },
      { id: 'p1', groupId: 'g1', documentId: 'd1', sortOrder: 0, sourcePageNumber: 1 },
      { id: 'p3', groupId: 'g2', documentId: 'd2', sortOrder: 0, sourcePageNumber: 1 },
    ],
  },
} as unknown as ImportJob;

function row(extra: Partial<DischargeTherapyRow> = {}): DischargeTherapyRow {
  return {
    farmacoNome: 'Farmaco sintetico',
    forma: 'cpr',
    dosaggio: '10 mg',
    viaSomministrazione: 'OS',
    quantita: '1 cpr',
    orari: ['08:00'],
    giorni: [],
    dataInizio: '2026-10-01',
    classe: '',
    note: '',
    originalText: 'Farmaco sintetico 10 mg 1 cpr ore 8',
    stato: 'da_verificare',
    importSource: { groupId: 'g2', inputHash: 'h2' },
    ...extra,
  };
}

function render(rows: DischargeTherapyRow[], opts: { back?: () => void; open?: boolean } = {}) {
  return renderToStaticMarkup(
    createElement(
      IntakeAiProvider,
      {
        paths: new Set<string>(),
        source: { data: {}, job, open: opts.open === false ? null : () => undefined },
      },
      createElement(DischargeTherapyReview, {
        rows,
        onChange: () => undefined,
        onBackToDocuments: opts.back,
      }),
    ),
  );
}

test('P10-INT-1: a row deferred for a document conflict offers no «Reincludi» and explains why', () => {
  const html = render([
    row({ conflictDeferred: true, conflictId: 'c1', excludedFromConfirm: true }),
  ]);
  assert.ok(!html.includes('Reincludi'), 'no re-include on a conflict row');
  assert.ok(!html.includes('data-testid="discharge-therapy-remove"'));
  assert.ok(html.includes('data-testid="discharge-therapy-conflict"'));
  assert.ok(html.includes('Le lettere riportano dati diversi per questo farmaco'));
  assert.ok(html.includes('non blocca la'), 'creation is not blocked by a deferred row');
  assert.ok(!html.includes('data-testid="discharge-therapy-resolve"'), 'no back link without flow');
});

test('P10-INT-1: the documents flow offers the way back to resolve the conflict', () => {
  const html = render(
    [row({ conflictDeferred: true, conflictId: 'c1', excludedFromConfirm: true })],
    { back: () => undefined },
  );
  assert.ok(html.includes('data-testid="discharge-therapy-resolve"'));
  assert.ok(html.includes('Torna alla revisione dei documenti'));
});

test('P10-INT-1: an operator-deferred row (no conflict) can still be re-included', () => {
  const html = render([row({ excludedFromConfirm: true })]);
  assert.ok(html.includes('Reincludi'));
  assert.ok(!html.includes('data-testid="discharge-therapy-conflict"'));
});

test('P10-INT-1: the save banner reason is the server 4xx message, never a technical one', () => {
  assert.equal(
    draftRejectionReason(
      new DraftApiError('La terapia rinviata non può essere prescritta', 409, 'conflict_deferred'),
    ),
    'La terapia rinviata non può essere prescritta',
  );
  assert.equal(draftRejectionReason(new DraftApiError('patchDraft failed: 400', 400)), null);
  assert.equal(draftRejectionReason(new DraftApiError('Errore interno', 500)), null);
  assert.equal(draftRejectionReason(new Error('offline')), null);
});

test('P10-INT-3: each imported therapy row opens the photo of its letter (first page)', () => {
  assert.deepEqual(
    therapySourceChip(job, row({ importSource: { groupId: 'g1', inputHash: 'h' } })),
    {
      label: 'Vedi documento L1',
      ariaLabel: 'Apri la lettera 1 da cui è stata letta questa terapia',
      target: { groupId: 'g1', pageId: 'p1' },
    },
  );
  // Several sources: the lowest letter wins; a letter no longer in the job is ignored.
  const multi = therapySourceChip(
    job,
    row({
      importSource: { groupId: 'g2', inputHash: 'h2' },
      importSources: [
        { groupId: 'gone', inputHash: 'x' },
        { groupId: 'g1', inputHash: 'h1' },
      ],
    }),
  );
  assert.equal(multi?.label, 'Vedi documento L1');
  assert.equal(therapySourceChip(null, row()), null);
  assert.equal(therapySourceChip(job, row({ importSource: undefined })), null);

  const html = render([row()]);
  assert.ok(html.includes('data-testid="discharge-therapy-source"'));
  assert.ok(html.includes('Vedi documento L2'));
  assert.ok(!render([row()], { open: false }).includes('discharge-therapy-source'));
});

test('P10-INT-4: «Dimissione ospedaliera» is a one-tap prescriber, never written without the tap', () => {
  assert.deepEqual([...INTAKE_PRESCRIBER_SUGGESTIONS], ['Dimissione ospedaliera']);
  const html = renderToStaticMarkup(
    createElement(TherapyFormFields, {
      value: emptyTherapyForm(),
      onChange: () => undefined,
      prescriberSuggestions: INTAKE_PRESCRIBER_SUGGESTIONS,
    }),
  );
  assert.ok(html.includes('data-testid="therapy-prescriber-suggestions"'));
  assert.ok(html.includes('>Dimissione ospedaliera</button>'));
  assert.ok(html.includes('aria-pressed="false"'), 'not preselected');
  assert.ok(/<details[^>]*open/.test(html), 'the prescriber disclosure is open to tap');
  // Without the prop (chart therapy form) nothing changes.
  const plain = renderToStaticMarkup(
    createElement(TherapyFormFields, { value: emptyTherapyForm(), onChange: () => undefined }),
  );
  assert.ok(!plain.includes('therapy-prescriber-suggestions'));
  // The imported-row review offers the same chip.
  assert.ok(render([row()]).includes('Dimissione ospedaliera'));
});

test('P10-INT-2: the allergy summary no longer points to a non-existent «tab Diagnosi»', () => {
  const html = renderToStaticMarkup(
    createElement(AnamnesisEditor, {
      mode: 'intake',
      value: {},
      onChange: () => undefined,
      allergie: [],
    } as never),
  );
  assert.ok(!html.includes('tab Diagnosi'));
  assert.ok(html.includes('si gestiscono nella sezione Allergie'));
  const hidden = renderToStaticMarkup(
    createElement(AnamnesisEditor, {
      mode: 'intake',
      value: {},
      onChange: () => undefined,
      allergie: [],
      showAllergySummary: false,
    } as never),
  );
  assert.ok(!hidden.includes('Nessuna allergia registrata'));
});

test('P10-INT-5: DTX 20 is part of the monthly sheet history', () => {
  const entries = legacyParameterEntries({
    parametriMensili: [
      { id: 'm1', mese: 10, anno: 2026, createdAt: '', giorni: [{ giorno: 2, dtx20: '140' }] },
    ],
  } as unknown as CartellaPaziente);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].values, 'DTX 20: 140');
});

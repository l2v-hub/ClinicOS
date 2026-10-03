import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appointmentLanding,
  doseSignal,
  landingOf,
  landingTarget,
  permittedTarget,
  resolvePatientTarget,
  signalTarget,
} from '../patientTargetResolver';
import { buildAdessoQueue } from '../adessoQueue';
import { matchesListSignal } from '../patientListView';
import type { ClinicalSummaryEntry, Consegna } from '../../types';
import type { ScadenzaTerapia } from '../dashboardTherapies';
import { agnosItemTarget } from '../../components/shared/agnos/agnosActionNavigation';
import { classicScreenTarget } from '../../components/assistant/classicScreenTarget';

const P = 'patient-1';
const all = () => true;
const oss = (capability: string) => !['therapy.list', 'documents.list'].includes(capability);

test('late, due and unscheduled doses land on Terapia → giornaliere on that drug, day and band', () => {
  assert.deepEqual(
    signalTarget({
      kind: 'therapy-late',
      patientId: P,
      therapyId: 't1',
      date: '2026-10-03',
      fascia: 'mattina',
    }),
    {
      patientId: P,
      tab: 'terapia-farmacologica',
      therapy: { subView: 'calendario', therapyId: 't1', date: '2026-10-03', fascia: 'mattina' },
    },
  );
  assert.equal(doseSignal({ patientId: P, minuti: -20 }).kind, 'therapy-late');
  assert.equal(doseSignal({ patientId: P, minuti: 15 }).kind, 'therapy-due');
  assert.equal(doseSignal({ patientId: P, minuti: null }).kind, 'therapy-unscheduled');
  // Missing pieces are dropped, never invented.
  assert.deepEqual(signalTarget({ kind: 'therapy-due', patientId: P }).therapy, {
    subView: 'calendario',
  });
});

test('each clinical signal lands on the section and item where it lives', () => {
  assert.deepEqual(signalTarget({ kind: 'drug-anomaly', patientId: P, therapyId: 't9' }), {
    patientId: P,
    tab: 'terapia-farmacologica',
    therapy: { subView: 'calendario', therapyId: 't9' },
  });
  assert.deepEqual(signalTarget({ kind: 'handover', patientId: P, consegnaId: 'c1' }), {
    patientId: P,
    tab: 'consegne',
    consegnaId: 'c1',
  });
  assert.deepEqual(signalTarget({ kind: 'allergy', patientId: P }), {
    patientId: P,
    tab: 'diagnosi',
    anchor: 'allergie',
  });
  assert.equal(signalTarget({ kind: 'critical-vitals', patientId: P }).tab, 'parametri');
  assert.equal(signalTarget({ kind: 'risk', patientId: P, riskType: 'caduta' }).tab, 'tinetti');
  assert.equal(
    signalTarget({ kind: 'risk', patientId: P, riskType: 'lesioni_pressione' }).tab,
    'braden',
  );
  assert.equal(signalTarget({ kind: 'risk', patientId: P, riskType: 'nutrizione' }).tab, 'mna');
  assert.equal(signalTarget({ kind: 'risk', patientId: P }).tab, 'moduli');
  assert.equal(
    signalTarget({ kind: 'appointment', patientId: P, tipoIntervento: 'consulto' }).tab,
    'esami-consulenze',
  );
  assert.equal(
    signalTarget({ kind: 'appointment', patientId: P, tipoIntervento: 'visita' }).tab,
    'note',
  );
  assert.deepEqual(signalTarget({ kind: 'overview', patientId: P }), { patientId: P });
});

test('capability-aware fallback: never a section the role cannot read', () => {
  const late = { kind: 'therapy-late', patientId: P, therapyId: 't1' } as const;
  assert.equal(resolvePatientTarget(late, all).tab, 'terapia-farmacologica');
  // OSS: no therapy.list → the overview, not «Sezione non disponibile».
  assert.deepEqual(resolvePatientTarget(late, oss), { patientId: P });
  assert.deepEqual(permittedTarget({ patientId: P, tab: 'documenti', documentId: 'd1' }, oss), {
    patientId: P,
  });
  // Sections without a capability gate stay as they are.
  assert.deepEqual(resolvePatientTarget({ kind: 'handover', patientId: P, consegnaId: 'c' }, oss), {
    patientId: P,
    tab: 'consegne',
    consegnaId: 'c',
  });
});

test('landing helpers keep tab-only callers working and strip the patient id', () => {
  assert.deepEqual(landingTarget(P), { patientId: P });
  assert.deepEqual(landingTarget(P, 'parametri'), { patientId: P, tab: 'parametri' });
  assert.deepEqual(landingTarget(P, { tab: 'consegne', consegnaId: 'c' }), {
    patientId: P,
    tab: 'consegne',
    consegnaId: 'c',
  });
  assert.deepEqual(landingOf({ kind: 'handover', patientId: P, consegnaId: 'c' }), {
    tab: 'consegne',
    consegnaId: 'c',
  });
  assert.equal(appointmentLanding({ pazienteId: null, tipoIntervento: 'visita' }), undefined);
  assert.deepEqual(appointmentLanding({ pazienteId: P, tipoIntervento: 'procedura' }), {
    tab: 'esami-consulenze',
  });
});

const dose = (id: string, minuti: number | null): ScadenzaTerapia => ({
  id,
  patientId: P,
  therapyId: `t-${id}`,
  fascia: 'mattina',
  nome: 'Rossi Anna',
  camera: '1',
  letto: 'A',
  farmaco: 'Metformina',
  dose: '1 cp',
  via: 'os',
  data: '2026-10-03',
  ora: '08:00',
  minuti,
});

test('Adesso rows carry their landing: dose, handover, drug to fix (with the drug names)', () => {
  const consegna = {
    id: 'c1',
    pazienteId: P,
    pazienteNome: 'Rossi Anna',
    tipo: 'Medicazione',
    note: 'x',
    scadenza: '2026-10-03',
    oraScadenza: '09:00',
  } as Consegna;
  const items = buildAdessoQueue({
    now: new Date('2026-10-03T08:30:00Z'),
    scadute: [dose('a', -30)],
    prossime: [],
    urgenti: [consegna],
    anomalie: [
      {
        patientId: P,
        nome: 'Rossi Anna',
        esito: {
          totale: 2,
          verificaIncompleta: false,
          anomalie: [{ farmacoNome: 'Ramipril' }, { farmacoNome: 'Pantoprazolo' }],
        },
        therapyId: 't-r',
      },
    ],
  });
  const byKind = Object.fromEntries(items.map((it) => [it.kind, it]));
  assert.deepEqual(byKind['terapia-ritardo'].landing, {
    tab: 'terapia-farmacologica',
    therapy: { subView: 'calendario', therapyId: 't-a', date: '2026-10-03', fascia: 'mattina' },
  });
  const handover = items.find((it) => it.key === 'consegna:c1');
  assert.deepEqual(handover?.landing, { tab: 'consegne', consegnaId: 'c1' });
  assert.deepEqual(byKind['anomalia-farmaci'].landing, {
    tab: 'terapia-farmacologica',
    therapy: { subView: 'calendario', therapyId: 't-r' },
  });
  assert.match(
    byKind['anomalia-farmaci'].dettaglio,
    /2 farmaci da verificare: Ramipril, Pantoprazolo/,
  );
});

test('KPI list filters match exactly what the tile counts', () => {
  const s = (over: Partial<ClinicalSummaryEntry>) =>
    ({
      patientId: P,
      statoRicovero: 'ricoverato',
      hasCriticalVitals: false,
      hasHighRisk: false,
      allergieCount: 0,
      hasSevereAllergy: false,
      terapieTotali: 0,
      terapieCompletate: 0,
      consegneAperte: 0,
      ...over,
    }) as ClinicalSummaryEntry;
  assert.equal(matchesListSignal(s({}), false, null), true);
  assert.equal(matchesListSignal(s({ hasCriticalVitals: true }), false, 'critici'), true);
  assert.equal(matchesListSignal(s({}), false, 'critici'), false);
  assert.equal(matchesListSignal(s({ hasHighRisk: true }), false, 'rischi'), true);
  assert.equal(matchesListSignal(s({ hasSevereAllergy: true }), false, 'allergie'), true);
  assert.equal(matchesListSignal(s({ allergieCount: 2 }), false, 'allergie'), false);
  assert.equal(matchesListSignal(undefined, true, 'anomalie'), true);
  assert.equal(matchesListSignal(undefined, false, 'critici'), false);
});

test('Agnos NavActions keep the cited item (therapy row, diary entry, document page)', () => {
  assert.deepEqual(
    agnosItemTarget({ type: 'open_therapy', label: '', patientId: P, recordId: 'th-1' }),
    { therapy: { subView: 'attivi', therapyId: 'th-1' } },
  );
  assert.deepEqual(
    agnosItemTarget({ type: 'open_diary', label: '', patientId: P, recordId: 'd-1' }),
    {
      diaryEntryId: 'd-1',
    },
  );
  assert.deepEqual(
    agnosItemTarget({
      type: 'open_document',
      label: '',
      patientId: P,
      documentId: 'doc-1',
      pageNumber: 3,
    }),
    { documentId: 'doc-1', pageNumber: 3 },
  );
  // Malformed ids are never forwarded.
  assert.equal(
    agnosItemTarget({ type: 'open_therapy', label: '', patientId: P, recordId: '../x' }),
    undefined,
  );
  assert.equal(agnosItemTarget({ type: 'open_profile', label: '', patientId: P }), undefined);
});

test('Assistant classic fallback with a known resident opens that resident section', () => {
  assert.deepEqual(classicScreenTarget({ screen: 'consegne', label: 'Consegne', patientId: P }), {
    kind: 'patient',
    patientId: P,
    tab: 'consegne',
  });
  assert.deepEqual(classicScreenTarget({ screen: 'terapie', label: 'Terapia', patientId: P }), {
    kind: 'patient',
    patientId: P,
    tab: 'terapia-farmacologica',
    therapy: { subView: 'giornaliere' },
  });
  assert.deepEqual(
    classicScreenTarget({
      screen: 'dettaglio-paziente',
      label: 'Cartella ospite',
      needsResident: true,
      patientId: P,
    }),
    { kind: 'patient', patientId: P },
  );
  assert.deepEqual(classicScreenTarget({ screen: 'terapie', label: 'Terapia' }), {
    kind: 'screen',
    screen: 'terapie',
  });
});

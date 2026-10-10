// Diario terapia (PR 2): mapping anteprima → form Terapia, testi italiani, requestId per versione.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDiaryTherapyText } from '../../../../../../backend/src/therapies/diary-therapy-parse';
import { assertValidSchedulesInput } from '../../../../../../backend/src/lib/therapy-dose';
import {
  diaryPreviewErrorMessage,
  diaryTherapyBody,
  diaryTherapyErrorMessage,
  diaryTherapyFingerprint,
  diaryTherapyIssues,
  entryDay,
  formFasciaConflicts,
  intentMessage,
  isBlockingIntent,
  manualTherapyPreview,
  newRequestId,
  previewFailureAllowsManual,
  previewNotices,
  previewToTherapyForm,
  requestIdForVersion,
  scheduleFasciaConflicts,
  unreadFields,
  type DiaryTherapyEntryDraft,
  type DiaryTherapyPreview,
  type DiaryTherapyPreviewRow,
} from '../diaryTherapy';
import { THERAPY_STATO_LABELS, linkedTherapyState, therapyStatoTone } from '../diaryTherapyLink';

const ENTRY_AT = '2026-09-30T10:15';

/** Anteprima reale: stesso interprete del server (backend/src/therapies/diary-therapy-parse). */
function realPreview(text: string): DiaryTherapyPreview {
  return { ...parseDiaryTherapyText(text, ENTRY_AT), source: 'deterministic' };
}

function row(patch: Partial<DiaryTherapyPreviewRow> = {}): DiaryTherapyPreviewRow {
  return {
    farmacoNome: '',
    forma: '',
    dosaggio: '',
    viaSomministrazione: '',
    quantita: '',
    orari: [],
    giorni: [],
    dataInizio: '',
    classe: '',
    note: '',
    originalText: '',
    stato: 'da_verificare',
    dataFine: '',
    quantitaValore: '',
    quantityNumerator: null,
    quantityDenominator: null,
    unitaSomministrazione: '',
    ...patch,
  };
}

function preview(patch: Partial<DiaryTherapyPreview> = {}): DiaryTherapyPreview {
  return {
    row: row(),
    intent: 'prescrizione',
    inferred: [],
    ambiguous: [],
    fasciaConflicts: [],
    warnings: [],
    prescriptionRange: null,
    ...patch,
  };
}

const entry: DiaryTherapyEntryDraft = {
  title: null,
  content: 'Ramipril 5 mg 1 cpr per os ore 8',
  priority: 'normale',
  status: 'aperta',
  entryDateTime: ENTRY_AT,
};

// ── Mapping ──────────────────────────────────────────────────────────────────────────────────

test('AC1: "Ramipril 5 mg 1 cpr per os ore 8" becomes RAMIPRIL, 5 mg, 1 compressa, orale, 08:00', () => {
  const p = realPreview('Ramipril 5 mg 1 cpr per os ore 8');
  const form = previewToTherapyForm(p, ENTRY_AT);
  assert.equal(form.farmacoNome, 'RAMIPRIL');
  assert.equal(form.commercialStrengthValue, '5');
  assert.equal(form.commercialStrengthUnit, 'mg');
  assert.equal(form.viaSomministrazione, 'orale');
  assert.equal(form.tipo, 'periodica');
  assert.equal(form.stato, 'attiva');
  assert.deepEqual(form.schedules, [
    {
      time: '08:00',
      quantityNumerator: 1,
      quantityDenominator: 1,
      administrationUnit: 'compressa',
    },
  ]);
  // Forma non scritta: resta vuota (l'unita' "compressa" viene dalla quantita', non dalla forma).
  assert.equal(form.pharmaceuticalForm, '');
  assert.equal(form.note, '');
  assert.equal(form.prescrittore, '');
  assert.equal(form.drugPackageRef, null);
  // Nessuna data scritta: il giorno della voce, segnalato nel riepilogo.
  assert.equal(form.dataInizio, '2026-09-30');
  assert.equal(form.dataFine, '');
  assert.deepEqual(diaryTherapyIssues(form), []);
  const notices = previewNotices(p, ENTRY_AT);
  assert.deepEqual(
    notices.map((n) => n.key),
    ['inizio-voce'],
  );
  assert.match(notices[0].text, /30\/09\/2026/);
});

test('AC2: unrecognised text leaves every field empty and blocks the confirmation', () => {
  const p = realPreview('Febbre Tachipirina 1000 mg 1 cpr per os ore 8');
  const form = previewToTherapyForm(p, ENTRY_AT);
  assert.equal(form.farmacoNome, '');
  assert.equal(form.viaSomministrazione, '');
  assert.equal(form.commercialStrengthValue, '');
  assert.equal(form.commercialStrengthUnit, '');
  assert.equal(form.pharmaceuticalForm, '');
  assert.deepEqual(form.schedules, [
    { time: '', quantityNumerator: 0, quantityDenominator: 1, administrationUnit: '' },
  ]);
  // Il testo resta nelle note com'e' scritto.
  assert.equal(form.note, 'Febbre Tachipirina 1000 mg 1 cpr per os ore 8');
  const fields = new Set(diaryTherapyIssues(form).map((i) => i.field));
  for (const field of [
    'farmacoNome',
    'viaSomministrazione',
    'time',
    'quantity',
    'administrationUnit',
  ])
    assert.ok(fields.has(field as never), field);
  const texts = previewNotices(p, ENTRY_AT).map((n) => n.text);
  assert.ok(texts.includes('Testo non riconosciuto: controlla le note'));
  assert.ok(texts.some((t) => /^Da verificare/.test(t)));
});

test('distinct times in the same fascia preserve both doses and allow confirmation', () => {
  const p = realPreview('Tachipirina 1000 mg 1 cpr per os ore 8 e 10');
  const form = previewToTherapyForm(p, ENTRY_AT);
  assert.deepEqual(
    form.schedules.map((s) => s.time),
    ['08:00', '10:00'],
  );
  assert.deepEqual(formFasciaConflicts(form), []);
  assert.deepEqual(diaryTherapyIssues(form), []);
  assert.equal(
    previewNotices(p, ENTRY_AT).some((n) => n.key === 'fascia'),
    false,
  );
  // Correggendo un orario il blocco sparisce.
  const fixed = {
    ...form,
    schedules: [form.schedules[0], { ...form.schedules[1], time: '20:00' }],
  };
  assert.deepEqual(diaryTherapyIssues(fixed), []);
});

test('compound strengths are never turned into a number: they stay in the notes as written', () => {
  const form = previewToTherapyForm(
    realPreview('Augmentin 875/125 mg 1 cpr per os ore 8 e 20'),
    ENTRY_AT,
  );
  assert.equal(form.commercialStrengthValue, '');
  assert.equal(form.commercialStrengthUnit, '');
  assert.equal(form.note, 'Dosaggio: 875/125 mg');
  const syrup = previewToTherapyForm(
    preview({ row: row({ farmacoNome: 'X', dosaggio: '5 mg/5 ml', forma: 'sospensione orale' }) }),
    ENTRY_AT,
  );
  assert.equal(syrup.commercialStrengthValue, '');
  assert.equal(syrup.pharmaceuticalForm, '');
  assert.equal(syrup.note, 'Forma: sospensione orale — Dosaggio: 5 mg/5 ml');
});

test('fractions, written dates and inferred years are kept exactly', () => {
  const p = realPreview('Coumadin 5 mg 1/2 cpr per os ore 18 dal 02/10 al 10/10');
  const form = previewToTherapyForm(p, ENTRY_AT);
  assert.deepEqual(form.schedules, [
    {
      time: '18:00',
      quantityNumerator: 1,
      quantityDenominator: 2,
      administrationUnit: 'compressa',
    },
  ]);
  assert.deepEqual(form.allowedFractions, ['1', '1/2']);
  assert.equal(form.dataInizio, '2026-10-02');
  assert.equal(form.dataFine, '2026-10-10');
  const texts = previewNotices(p, ENTRY_AT).map((n) => n.text);
  assert.ok(texts.some((t) => /Data di inizio dedotta/.test(t)));
  assert.ok(texts.some((t) => /Data di fine dedotta/.test(t)));
  // Data scritta: nessuna proposta della data della voce.
  assert.ok(!texts.some((t) => /proposta la data della voce/.test(t)));
  // 3/2 compressa: la parte frazionaria (1/2) diventa una frazione consentita.
  const threeHalves = previewToTherapyForm(
    preview({ row: row({ quantityNumerator: 3, quantityDenominator: 2, orari: ['8:00'] }) }),
    ENTRY_AT,
  );
  assert.deepEqual(threeHalves.allowedFractions, ['1', '1/2']);
  assert.equal(threeHalves.schedules[0].time, '08:00');
});

test('weekdays and routes map to the Terapia form values, unknown ones stay empty', () => {
  const form = previewToTherapyForm(
    preview({ row: row({ giorni: ['Ven', 'Lun'], viaSomministrazione: 'SC' }) }),
    ENTRY_AT,
  );
  assert.deepEqual(form.giorniSettimana, [1, 5]);
  assert.equal(form.viaSomministrazione, 'SC');
  const unknown = previewToTherapyForm(
    preview({ row: row({ viaSomministrazione: 'IN' }) }),
    ENTRY_AT,
  );
  assert.equal(unknown.viaSomministrazione, '');
});

test('al bisogno keeps the quantity readable in the notes and needs no schedule', () => {
  const p = realPreview('Paracetamolo 1000 mg 1 cpr per os al bisogno');
  const form = previewToTherapyForm(p, ENTRY_AT);
  assert.equal(form.tipo, 'al_bisogno');
  assert.equal(form.note, 'al bisogno — Quantità: 1 cpr');
  assert.deepEqual(diaryTherapyIssues(form), []);
  assert.deepEqual(diaryTherapyBody(entry, form, 'req-00001').therapy.schedules, []);
  assert.ok(previewNotices(p, ENTRY_AT).some((n) => n.key === 'al-bisogno'));
});

test('no entry date → no invented start date', () => {
  assert.equal(entryDay(''), '');
  assert.equal(previewToTherapyForm(preview(), 'non valida').dataInizio, '');
  assert.equal(entryDay('2026-01-02T08:00'), '2026-01-02');
});

// ── Intento ──────────────────────────────────────────────────────────────────────────────────

test('AC3: suspension, administration and change intents have no confirmation and say where to act', () => {
  const p = realPreview('Sospendere Ramipril');
  assert.equal(p.intent, 'sospensione');
  assert.equal(isBlockingIntent(p.intent), true);
  assert.match(intentMessage('sospensione') ?? '', /sezione Terapia/);
  assert.match(intentMessage('somministrazione') ?? '', /giro terapia/);
  assert.match(intentMessage('modifica') ?? '', /sezione Terapia/);
  for (const intent of ['prescrizione', 'al_bisogno']) {
    assert.equal(isBlockingIntent(intent), false);
    assert.equal(intentMessage(intent), null);
  }
  // Intento bloccante: nessuna data proposta.
  assert.ok(!previewNotices(p, ENTRY_AT).some((n) => n.key === 'inizio-voce'));
});

test('every warning, ambiguity and inference has an Italian text', () => {
  const texts = previewNotices(
    preview({
      warnings: [
        'testo_non_classificato',
        'menzione_sospensione',
        'menzione_somministrazione',
        'menzione_modifica',
      ],
      ambiguous: ['orari', 'piu_farmaci'],
      inferred: ['dataInizio', 'dataFine'],
    }),
    ENTRY_AT,
  ).map((n) => n.text);
  assert.ok(texts.includes('Testo non riconosciuto: controlla le note'));
  assert.ok(texts.some((t) => /menziona una sospensione/.test(t)));
  assert.ok(texts.some((t) => /menziona una somministrazione/.test(t)));
  assert.ok(texts.some((t) => /menziona una modifica/.test(t)));
  assert.ok(texts.some((t) => /Orari ambigui/.test(t)));
  assert.ok(texts.some((t) => /più farmaci/.test(t)));
  assert.ok(texts.some((t) => /inizio dedotta/.test(t)));
  assert.ok(texts.some((t) => /fine dedotta/.test(t)));
});

// ── Fasce ────────────────────────────────────────────────────────────────────────────────────

test('fascia conflicts follow the server rule, including the same time repeated', () => {
  assert.deepEqual(scheduleFasciaConflicts(['08:00', '20:00']), []);
  assert.deepEqual(scheduleFasciaConflicts(['8:00', '08:00']), ['mattina: 08:00, 08:00']);
  assert.deepEqual(scheduleFasciaConflicts(['23:00', '02:00']), []);
  assert.deepEqual(scheduleFasciaConflicts(['', '08:00']), []);
});

// ── requestId per versione ───────────────────────────────────────────────────────────────────

test('AC4: same preview version reuses the requestId, any edit mints a new one', () => {
  let n = 0;
  const makeId = () => `req-${String(++n).padStart(4, '0')}`;
  const form = previewToTherapyForm(realPreview(entry.content), ENTRY_AT);
  const v1 = requestIdForVersion(null, diaryTherapyFingerprint(entry, form), makeId);
  // Doppio clic / nuovo tentativo dopo un errore di rete: stessa versione, stesso id.
  const retry = requestIdForVersion(v1, diaryTherapyFingerprint(entry, { ...form }), makeId);
  assert.equal(retry.requestId, v1.requestId);
  // Modifica di un campo della terapia dopo un errore: id nuovo.
  const edited = { ...form, note: 'dopo colazione' };
  const v2 = requestIdForVersion(retry, diaryTherapyFingerprint(entry, edited), makeId);
  assert.notEqual(v2.requestId, v1.requestId);
  // Anche la voce fa parte della versione (titolo, priorita').
  const v3 = requestIdForVersion(
    v2,
    diaryTherapyFingerprint({ ...entry, title: 'Terapia' }, edited),
    makeId,
  );
  assert.notEqual(v3.requestId, v2.requestId);
  assert.equal(n, 3);
});

test('generated requestIds are UUIDs accepted by the server', () => {
  const id = newRequestId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(id, /^[A-Za-z0-9._:-]{8,128}$/);
  assert.notEqual(newRequestId(), id);
});

test('with-therapy body: entry as saved, therapy through the Terapia mapper, no client operator', () => {
  const form = previewToTherapyForm(realPreview(entry.content), ENTRY_AT);
  const body = diaryTherapyBody(entry, form, 'req-00001');
  assert.deepEqual(Object.keys(body).sort(), ['entry', 'requestId', 'therapy']);
  assert.equal(body.requestId, 'req-00001');
  assert.deepEqual(body.entry, entry);
  assert.equal(body.therapy.farmacoNome, 'RAMIPRIL');
  assert.equal(body.therapy.commercialStrengthValue, 5);
  assert.equal(body.therapy.viaSomministrazione, 'orale');
  assert.equal('operatoreInseritore' in body.therapy, false);
  assert.equal('dosaggio' in body.therapy, false);
  // Gli orari passano la stessa validazione del server.
  assert.doesNotThrow(() => assertValidSchedulesInput(body.therapy.schedules));
});

// ── Errori ───────────────────────────────────────────────────────────────────────────────────

test('server errors become Italian messages', () => {
  assert.match(
    diaryTherapyErrorMessage(400, {
      code: 'fascia_conflict',
      fasciaConflicts: ['sera: 18:00, 18:00'],
    }),
    /sera: 18:00, 18:00.*duplicati/,
  );
  assert.match(diaryTherapyErrorMessage(400, { code: 'fascia_conflict' }), /duplicati/);
  assert.match(diaryTherapyErrorMessage(400, { code: 'schedule_required' }), /orario/);
  assert.match(diaryTherapyErrorMessage(400, { code: 'unit_required' }), /unità/);
  assert.match(
    diaryTherapyErrorMessage(400, { code: 'intent_not_prescription', intent: 'somministrazione' }),
    /giro terapia/,
  );
  assert.match(diaryTherapyErrorMessage(400, { code: 'intent_not_prescription' }), /voce normale/);
  assert.match(diaryTherapyErrorMessage(409, { code: 'request_id_reused' }), /già inviata/);
  assert.match(
    diaryTherapyErrorMessage(400, { error: 'Campi obbligatori: farmacoNome, dataInizio' }),
    /non è stata accettata: Campi obbligatori/,
  );
  assert.match(diaryTherapyErrorMessage(400, null), /controlla i campi/);
  assert.match(diaryTherapyErrorMessage(401, {}), /Sessione scaduta/);
  assert.match(diaryTherapyErrorMessage(403, {}), /permessi/);
  assert.match(diaryTherapyErrorMessage(500, {}), /non verrà duplicata/);
  assert.match(diaryTherapyErrorMessage(0, null), /Riprova/);
  assert.match(diaryPreviewErrorMessage(400, { error: 'text supera 2000 caratteri' }), /2000/);
  assert.match(diaryPreviewErrorMessage(500, null), /Anteprima non disponibile/);
});

// ── Card ─────────────────────────────────────────────────────────────────────────────────────

test('diary card link: linked therapy, deleted therapy, ordinary entry', () => {
  assert.equal(
    linkedTherapyState({ therapy: { id: 't1', farmacoNome: 'RAMIPRIL', stato: 'attiva' } }),
    'linked',
  );
  assert.equal(linkedTherapyState({ therapy: null, category: 'terapia' }), 'removed');
  assert.equal(linkedTherapyState({ therapy: null, therapyId: 't1' }), 'removed');
  assert.equal(linkedTherapyState({ therapy: null, category: null }), 'none');
  assert.equal(linkedTherapyState({}), 'none');
  assert.equal(THERAPY_STATO_LABELS.sospesa, 'Sospesa');
  assert.equal(therapyStatoTone('attiva'), 'ds-badge--ok');
  assert.equal(therapyStatoTone('sospesa'), 'ds-badge--warning');
  // Nessun rosso per lo stato della terapia.
  assert.doesNotMatch(therapyStatoTone('conclusa'), /alarm/);
});

// ── Anteprima non riuscita: motivo esplicito + compilazione a mano ─────────────────────────────

test('preview failure: each cause has its own reason; only 401/403 block the manual form', () => {
  assert.match(diaryPreviewErrorMessage(0, null), /server non raggiungibile/);
  assert.match(diaryPreviewErrorMessage(404, null), /non è attivo su questo server \(404\)/);
  assert.match(
    diaryPreviewErrorMessage(503, { error: 'Endpoint clinici disabilitati' }),
    /\(503\) — Endpoint clinici disabilitati/,
  );
  assert.match(diaryPreviewErrorMessage(502, null), /errore dell’interprete \(502\)/);
  assert.match(diaryPreviewErrorMessage(0, {}, true), /non leggibile/);
  for (const status of [0, 400, 404, 500, 502, 503])
    assert.equal(previewFailureAllowsManual(status), true);
  for (const status of [401, 403]) assert.equal(previewFailureAllowsManual(status), false);
});

test('manual fallback: empty therapy form, diary text in the notes, nothing inferred', () => {
  const text = 'Iniziare terapia con quel farmaco di ieri, dose da decidere';
  const manual = manualTherapyPreview(text);
  const notices = previewNotices(manual, ENTRY_AT).map((n) => n.text);
  assert.ok(notices.some((t) => /compila la terapia a mano/.test(t)));
  const form = previewToTherapyForm(manual, ENTRY_AT);
  assert.equal(form.farmacoNome, '');
  assert.equal(form.note, text);
  assert.equal(form.tipo, 'periodica');
  assert.equal(form.dataInizio, '2026-09-30', 'start date proposed from the diary entry');
  assert.ok(diaryTherapyIssues(form).length > 0, 'the operator must complete the fields');
  assert.deepEqual(unreadFields(manual), [], 'manual mode shows one summary, not a field list');
});

test('partial preview lists what the interpreter did not understand', () => {
  assert.deepEqual(
    unreadFields(preview({ row: row({ farmacoNome: 'RAMIPRIL', dosaggio: '5 mg' }) })),
    ['via di somministrazione', 'orari', 'quantità per dose'],
  );
  assert.deepEqual(
    unreadFields(
      preview({
        row: row({
          farmacoNome: 'RAMIPRIL',
          dosaggio: '5 mg',
          viaSomministrazione: 'OS',
          orari: ['08:00'],
          quantityNumerator: 1,
          quantityDenominator: 1,
        }),
      }),
    ),
    [],
  );
  assert.deepEqual(
    unreadFields(
      preview({
        intent: 'al_bisogno',
        row: row({
          farmacoNome: 'X',
          dosaggio: '1 g',
          viaSomministrazione: 'OS',
          quantita: '1 cp',
        }),
      }),
    ),
    [],
    'al bisogno has no times',
  );
  assert.deepEqual(
    unreadFields(preview({ intent: 'sospensione' })),
    [],
    'blocking intent: no form',
  );
  // Real interpreter on a vague text: the missing fields are named.
  const vague = unreadFields(realPreview('iniziare paracetamolo'));
  assert.ok(vague.includes('orari'), JSON.stringify(vague));
});

test('AI proposal: proposed fields and AI notes are shown, AI outage is explained', () => {
  const p = {
    ...realPreview('Terapia techipirina 1000mg ogni 8ore parte dalle 8.00'),
    source: 'deterministic+ai',
    aiFields: ['farmacoNome', 'orari'],
    aiNotes: ['techipirina → TACHIPIRINA'],
    warnings: ['proposta_ai'],
  };
  const texts = previewNotices(p, ENTRY_AT).map((n) => n.text);
  assert.ok(texts.includes('Proposti dall’AI: farmaco, orari'), JSON.stringify(texts));
  assert.ok(texts.includes('AI: techipirina → TACHIPIRINA'));
  assert.ok(texts.some((t) => /proposti dall’AI: controllali/.test(t)));
  const down = { ...realPreview('iniziare paracetamolo'), warnings: ['ai_non_disponibile'] };
  assert.ok(previewNotices(down, ENTRY_AT).some((n) => /Proposta AI non disponibile/.test(n.text)));
});

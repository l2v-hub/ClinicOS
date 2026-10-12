// Schemi insulinici a fasce glicemiche presi da documenti reali (2026-10-12): protocollo a
// tabella, schema in pompa (ml/h), lettera con fasce scritte in riga. Fixture ridotte alle sole
// righe di prescrizione: nessun dato del paziente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDischargeTherapy } from '../parse-discharge-therapy.js';
import {
  glucoseScaleWarnings,
  normalizeGlucoseScaleProtocol,
  InvalidDoseProtocolError,
  doseForGlucose,
} from '../../therapies/glucose-scale.js';

const TABELLA_SOTTOCUTE = `Terapia
Insulina rapida sottocute secondo schema:
GLUCOSTIX INSULINA
<110 0U.I
111-120 2U.I
121-140 4U.I
141-180 6U.I
181-200 7U.I
201-250 8U.I
251-300 12U.I
301-350 14U.I
>350 Bolo 5 U.I e.v. +15U.I s.c`;

const POMPA = `Terapia
Insulina rapida endovena in pompa (50 U.I. a 50cc di S.F. durata 12 ore) secondo glicemia:
GLUCOSTIX INSULINA
140-150 1 ml/h
151-200 2 ml/h
201-250 3 ml/h
251-300 4 ml/h
301-350 5 ml/h
>350 6 ML/H + 6 U.I in bolo`;

const LETTERA_IN_RIGA = `Terapia alla dimissione
LANTUS FL SC 100 UI /ML 10 Ui ore 08:00
HUMALOG*1 FL 10 ML 100 UI/ML 4 U se glicemia tra 200-250, 6 U tra 250-300, 8 U da 350-450, eventuale rivalutazione diabetologica con glicemia e Hb glicata
AUGMENTIN CPR 875 + 125 MG 1 Cpr ore 08:00 e alle 14:00 e alle 21:00 fino al 12/10/2026`;

test('AC1: lo schema a tabella diventa UNA riga con tutte le fasce, incluse le dosi multiple', () => {
  const rows = parseDischargeTherapy(TABELLA_SOTTOCUTE);
  assert.equal(rows.length, 1, 'nessuna riga orfana per fascia o per intestazione');
  const [row] = rows;
  assert.equal(row!.farmacoNome, 'INSULINA');
  assert.equal(row!.doseMode, 'glucose_scale');
  assert.equal(row!.glucoseDoseUnit, 'unità');
  assert.equal(row!.stato, 'da_verificare');
  assert.deepEqual(row!.glucoseScale, [
    { minMgDl: 10, maxMgDl: 109, units: 0 },
    { minMgDl: 111, maxMgDl: 120, units: 2 },
    { minMgDl: 121, maxMgDl: 140, units: 4 },
    { minMgDl: 141, maxMgDl: 180, units: 6 },
    { minMgDl: 181, maxMgDl: 200, units: 7 },
    { minMgDl: 201, maxMgDl: 250, units: 8 },
    { minMgDl: 251, maxMgDl: 300, units: 12 },
    { minMgDl: 301, maxMgDl: 350, units: 14 },
    {
      minMgDl: 351,
      maxMgDl: null,
      units: 15,
      extraDoses: [{ amount: 5, unit: 'unità', route: 'EV', label: 'bolo' }],
    },
  ]);
  // "<110" e "111-120" lasciano davvero scoperto 110: lo si dice, non lo si corregge.
  assert.deepEqual(row!.glucoseScaleWarnings, ['Glicemia 110 mg/dL non coperta dallo schema']);
});

test('AC1: la tabella staccata dalla sua intestazione da una riga vuota resta della stessa insulina', () => {
  const rows = parseDischargeTherapy(TABELLA_SOTTOCUTE.replace('GLUCOSTIX INSULINA\n', '\n'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.glucoseScale?.length, 9);
});

test('AC1: numero di fasce libero — uno schema da 3 fasce e uno da 9 non condividono valori', () => {
  const tre = parseDischargeTherapy(
    'Terapia\nInsulina lispro sc ai pasti secondo stick:\n150-200: 2 UI\n201-250: 4 UI\n>250: 6 UI',
  );
  assert.deepEqual(
    tre[0]!.glucoseScale!.map((r) => [r.minMgDl, r.maxMgDl, r.units]),
    [
      [150, 200, 2],
      [201, 250, 4],
      [251, null, 6],
    ],
  );
  assert.equal(tre[0]!.farmacoNome, 'INSULINA');
});

test("AC1: titolo dello schema in apertura — il farmaco è l'insulina nominata dopo", () => {
  const rows = parseDischargeTherapy(
    'Terapia alla dimissione\nSCHEMA INSULINICO SOTTOCUTE - INSULINA RAPIDA\nGLUCOSTIX INSULINA\n121-140 4U.I\n141-180 6U.I',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.farmacoNome, 'INSULINA RAPIDA');
});

test('AC2: lo schema in pompa è in ml/h, con il bolo in unità nella fascia più alta', () => {
  const rows = parseDischargeTherapy(POMPA);
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row!.glucoseDoseUnit, 'ml/h');
  assert.equal(row!.stato, 'da_verificare');
  assert.deepEqual(
    row!.glucoseScale!.map((r) => [r.minMgDl, r.maxMgDl, r.units]),
    [
      [140, 150, 1],
      [151, 200, 2],
      [201, 250, 3],
      [251, 300, 4],
      [301, 350, 5],
      [351, null, 6],
    ],
  );
  assert.deepEqual(row!.glucoseScale![5]!.extraDoses, [
    { amount: 6, unit: 'unità', label: 'bolo' },
  ]);
  // La composizione della pompa resta leggibile all'operatore.
  assert.match(row!.originalText, /50cc di S\.F\. durata 12 ore/);
});

test('AC3: le fasce in riga si importano come scritte, con avvisi su sovrapposizione e buco', () => {
  const rows = parseDischargeTherapy(LETTERA_IN_RIGA);
  const humalog = rows.find((r) => r.farmacoNome === 'HUMALOG')!;
  assert.deepEqual(humalog.glucoseScale, [
    { minMgDl: 200, maxMgDl: 250, units: 4 },
    { minMgDl: 250, maxMgDl: 300, units: 6 },
    { minMgDl: 350, maxMgDl: 450, units: 8 },
  ]);
  assert.deepEqual(humalog.glucoseScaleWarnings, [
    'Fasce sovrapposte a 250 mg/dL: due dosi per la stessa glicemia',
    'Glicemia 301–349 mg/dL non coperta dallo schema',
  ]);
  assert.equal(humalog.stato, 'da_verificare');
  // La basale a dose fissa non eredita lo schema.
  const lantus = rows.find((r) => r.farmacoNome === 'LANTUS')!;
  assert.equal(lantus.doseMode, 'fixed');
  assert.equal(lantus.quantita, '10 UI');
});

test('AC3: una fascia letta male dall\'OCR ("11-120") resta com\'è, segnalata', () => {
  const rows = parseDischargeTherapy(TABELLA_SOTTOCUTE.replace('111-120', '11-120'));
  const scale = rows[0]!.glucoseScale!;
  assert.ok(scale.some((r) => r.minMgDl === 11 && r.maxMgDl === 120 && r.units === 2));
  assert.ok(
    rows[0]!.glucoseScaleWarnings!.includes(
      'Valore 11 mg/dL sospetto: confrontalo con il documento',
    ),
  );
  assert.ok(rows[0]!.glucoseScaleWarnings!.some((w) => w.startsWith('Fasce sovrapposte')));
  // Una durata ("10-15 gg") non diventa mai una fascia.
  assert.equal(
    parseDischargeTherapy('Terapia\nCLEXANE 4000 UI 1 fl sc ore 20:00 per 10-15 gg')[0]!.doseMode,
    'fixed',
  );
});

test('AC4: il protocollo accetta ml/h e dosi aggiuntive; i protocolli già salvati restano validi', () => {
  const legacy = normalizeGlucoseScaleProtocol({
    kind: 'blood_glucose',
    rules: [{ minMgDl: 150, maxMgDl: 200, units: 2 }],
  });
  assert.equal(legacy.doseUnit, 'unità');
  assert.deepEqual(legacy.rules, [{ minMgDl: 150, maxMgDl: 200, units: 2 }]);

  const pump = normalizeGlucoseScaleProtocol({
    kind: 'blood_glucose',
    doseUnit: 'ml/h',
    rules: [
      {
        minMgDl: 351,
        maxMgDl: null,
        units: 6,
        extraDoses: [{ amount: 6, unit: 'unità', route: 'EV', label: 'bolo' }],
      },
    ],
  });
  assert.equal(pump.doseUnit, 'ml/h');
  assert.equal(doseForGlucose(pump, 400), 6);

  for (const bad of [
    { doseUnit: 'mg' },
    {
      rules: [{ minMgDl: 150, maxMgDl: 200, units: 2, extraDoses: [{ amount: 0, unit: 'unità' }] }],
    },
    { rules: [{ minMgDl: 150, maxMgDl: 200, units: 2, extraDoses: [{ amount: 2, unit: 'mg' }] }] },
    { rules: [{ minMgDl: 150, maxMgDl: 200, units: 2, extraDoses: 'bolo' }] },
    {
      rules: [
        { minMgDl: 200, maxMgDl: 250, units: 4 },
        { minMgDl: 250, maxMgDl: 300, units: 6 },
      ],
    },
  ]) {
    assert.throws(
      () =>
        normalizeGlucoseScaleProtocol({
          kind: 'blood_glucose',
          rules: [{ minMgDl: 150, maxMgDl: 200, units: 2 }],
          ...bad,
        }),
      InvalidDoseProtocolError,
    );
  }
});

test('avvisi: nessun avviso su uno schema contiguo, fascia aperta in testa e in coda', () => {
  assert.deepEqual(
    glucoseScaleWarnings([
      { minMgDl: 10, maxMgDl: 149 },
      { minMgDl: 150, maxMgDl: 200 },
      { minMgDl: 201, maxMgDl: null },
    ]),
    [],
  );
});

test('QA F1: fasce in unità diverse — nessuna unità attribuita, schema da trascrivere (bloccante)', () => {
  const [row] = parseDischargeTherapy(
    'Terapia\nInsulina rapida secondo schema:\n150-200 2 U\n201-250 3 ml/h\n>250 4 ml/h',
  );
  assert.equal(row!.doseMode, 'glucose_scale');
  assert.deepEqual(row!.glucoseScale, []);
  assert.equal(row!.glucoseDoseUnit, undefined);
  assert.equal(row!.stato, 'da_verificare');
  assert.deepEqual(row!.glucoseScaleWarnings, [
    'Fasce scritte in unità diverse (unità e ml/h): schema non importato, trascrivilo dal documento',
  ]);
  assert.match(row!.originalText, /150-200 2 U/);
});

test('QA F2: la via della dose principale diversa da quella della terapia è segnalata', () => {
  const [row] = parseDischargeTherapy(
    'Terapia\nInsulina rapida sottocute secondo schema:\n150-200 2 U.I\n>200 5 U.I e.v. + 15 U.I s.c',
  );
  const top = row!.glucoseScale!.at(-1)!;
  assert.equal(top.units, 5);
  assert.deepEqual(top.extraDoses, [{ amount: 15, unit: 'unità', route: 'SC' }]);
  assert.ok(
    row!.glucoseScaleWarnings!.includes(
      'Fascia da 201 mg/dL: dose principale 5 unità per via EV, verifica la via della terapia',
    ),
    JSON.stringify(row!.glucoseScaleWarnings),
  );
  // Nel protocollo la dose principale è s.c. come la terapia: nessun avviso di via.
  const [protocollo] = parseDischargeTherapy(TABELLA_SOTTOCUTE);
  assert.ok(!protocollo!.glucoseScaleWarnings!.some((w) => w.includes('per via')));
});

test('QA F3: un "10" scritto come estremo di fascia è sospetto, il limite di "< 110" no', () => {
  const [row] = parseDischargeTherapy(TABELLA_SOTTOCUTE.replace('111-120', '10-120'));
  assert.ok(
    row!.glucoseScaleWarnings!.includes('Valore 10 mg/dL sospetto: confrontalo con il documento'),
  );
  const [protocollo] = parseDischargeTherapy(TABELLA_SOTTOCUTE);
  assert.ok(!protocollo!.glucoseScaleWarnings!.some((w) => w.includes('sospetto')));
});

// 2026-10-11: ogni prescrizione (farmaco + dose + periodicità) del documento diventa una riga
// terapia, qualunque sia la pagina o la sezione; gli schemi insulinici a fasce glicemiche sono
// strutturati con i valori del paziente, mai con fasce predefinite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clinicIsoDate,
  findGlucoseRules,
  isGlucoseScaleOnlyLine,
  parseDischargeTherapy,
  therapyRowsFromNarrative,
  therapyRowsOutsideSection,
} from '../parse-discharge-therapy.js';
import { buildImportDraftData } from '../draft-service.js';
import type { DischargeNarrativeDraft } from '../../ai/sections/narrative.js';

// Testo sintetico: la terapia continua su una seconda pagina dopo una nota e un marcatore.
const MULTIPAGE = [
  'Terapia alla dimissione:',
  'RAMIPRIL CPR 5 MG (OS) 1 Cpr ore 08:00',
  'BISOPROLOLO CPR 2,5 MG (OS) 1 Cpr ore 08:00 e alle 20:00',
  '',
  'Si raccomanda controllo pressorio quotidiano.',
  '',
  '---',
  'Pagina 2 di 2',
  '',
  'ATORVASTATINA CPR 20 MG (OS) 1 Cpr ore 22:00',
  'PANTOPRAZOLO CPR 40 MG (OS) 1 Cpr ore 07:30',
].join('\n');

test('AC1: i farmaci dopo prosa e salto pagina sono tutti righe terapia', () => {
  const rows = parseDischargeTherapy(MULTIPAGE);
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['RAMIPRIL', 'BISOPROLOLO', 'ATORVASTATINA', 'PANTOPRAZOLO'],
  );
  assert.ok(rows.every((r) => r.stato === 'ok'));
});

test('AC1: i marcatori di pagina non diventano righe fantasma', () => {
  const rows = parseDischargeTherapy(
    'KEPPRA 500 MG (OS) 1 Cpr ore 08:00\n---\n[Lettera 2]\nPagina 3',
  );
  assert.equal(rows.length, 1);
});

test('AC2: una prescrizione nel decorso diventa riga da_verificare con la frase di origine', () => {
  const rows = therapyRowsOutsideSection([
    'Durante la degenza il paziente ha ricevuto idratazione. Si è iniziata terapia con Furosemide 25 mg 1 cpr al mattino.',
    'Il paziente è stato mobilizzato.',
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].farmacoNome, 'FUROSEMIDE');
  assert.equal(rows[0].dosaggio, '25 mg');
  assert.equal(rows[0].stato, 'da_verificare');
  assert.equal(rows[0].outsideTherapySection, true);
  assert.match(rows[0].originalText, /Furosemide 25 mg 1 cpr al mattino/);
  assert.doesNotMatch(
    rows[0].note,
    /fuori dalla sezione/i,
    'la provenienza non va nelle note cliniche',
  );
});

test('AC2: prosa senza dose o senza periodicità, farmaci sospesi e allergie non diventano righe', () => {
  const rows = therapyRowsOutsideSection([
    'Riferita allergia a Amoxicillina 1 g due volte al giorno.',
    'Sospeso Warfarin 5 mg 1 cpr la sera.',
    'Eseguita TC torace con mezzo di contrasto 100 ml.',
    'Paziente in buone condizioni generali, si dimette al domicilio.',
  ]);
  assert.deepEqual(rows, []);
});

test('AC2: un farmaco già nella sezione terapia non viene ripetuto', () => {
  const rows = therapyRowsFromNarrative({
    therapyText: 'FUROSEMIDE CPR 25 MG (OS) 1 Cpr ore 08:00',
    hospitalCourseText: 'Introdotta Furosemide 25 mg 1 cpr al mattino.',
    adviceAndFollowUpText: 'Proseguire Lansoprazolo 30 mg 1 cps al mattino a digiuno.',
  });
  assert.deepEqual(
    rows.map((r) => [r.farmacoNome, r.outsideTherapySection === true]),
    [
      ['FUROSEMIDE', false],
      ['LANSOPRAZOLO', true],
    ],
  );
});

test('AC3: schema insulinico su più righe → una riga con tutte le fasce del documento', () => {
  const rows = parseDischargeTherapy(
    [
      'HUMALOG KWIKPEN 100 UI (SC) ore 08:00, 12:00 e 19:00 secondo schema:',
      'glicemia < 150: 0 UI',
      '150-200: 2 UI',
      '201-250 mg/dl → 4 UI',
      '> 250: 6 UI',
      'LANTUS 100 UI/ML (SC) 14 UI ore 22:00',
    ].join('\n'),
  );
  assert.equal(rows.length, 2);
  const [humalog, lantus] = rows;
  assert.equal(humalog.farmacoNome, 'HUMALOG');
  assert.equal(humalog.doseMode, 'glucose_scale');
  assert.deepEqual(humalog.glucoseScale, [
    { minMgDl: 10, maxMgDl: 149, units: 0 },
    { minMgDl: 150, maxMgDl: 200, units: 2 },
    { minMgDl: 201, maxMgDl: 250, units: 4 },
    { minMgDl: 251, maxMgDl: null, units: 6 },
  ]);
  assert.equal(humalog.dosaggio, '100 UI', 'la concentrazione, non una fascia');
  assert.deepEqual(humalog.orari, ['08:00', '12:00', '19:00']);
  assert.equal(humalog.stato, 'da_verificare', 'fasce da righe diverse: conferma dell operatore');
  assert.match(humalog.originalText, /> 250: 6 UI/, 'testo originale integrale');
  assert.equal(lantus.doseMode, 'fixed');
  assert.equal(lantus.farmacoNome, 'LANTUS');
});

test('AC3: fasce diverse per pazienti diversi — nessun valore predefinito', () => {
  const a = parseDischargeTherapy(
    'NOVORAPID (SC) ore 08:00 secondo schema:\n140-180: 1 U\n181-240: 3 U',
  );
  const b = parseDischargeTherapy(
    'NOVORAPID (SC) ore 08:00 secondo schema:\nda 120 a 160: 2 unità\noltre 160 = 5 unità',
  );
  assert.deepEqual(a[0].glucoseScale, [
    { minMgDl: 140, maxMgDl: 180, units: 1 },
    { minMgDl: 181, maxMgDl: 240, units: 3 },
  ]);
  assert.deepEqual(b[0].glucoseScale, [
    { minMgDl: 120, maxMgDl: 160, units: 2 },
    { minMgDl: 161, maxMgDl: null, units: 5 },
  ]);
});

test('AC3: schema senza orari resta da verificare (gli orari non si inventano)', () => {
  const [row] = parseDischargeTherapy(
    'APIDRA (SC) ai pasti secondo glicemia:\n150-200: 2 UI\n201-300: 4 UI',
  );
  assert.equal(row.doseMode, 'glucose_scale');
  assert.equal(row.glucoseScale?.length, 2);
  assert.equal(row.stato, 'da_verificare');
});

test('AC3: riconoscitore di fasce — righe solo-fascia e righe di dose fissa', () => {
  assert.equal(isGlucoseScaleOnlyLine('150-200: 2 UI'), true);
  assert.equal(isGlucoseScaleOnlyLine('- glicemia > 250 mg/dl → 6 U'), true);
  assert.equal(isGlucoseScaleOnlyLine('LANTUS 100 UI/ML 14 UI ore 22:00'), false);
  assert.deepEqual(findGlucoseRules('KEPPRA 500 MG 1 Cpr ore 08:00 e alle 20:00').rules, []);
  assert.deepEqual(findGlucoseRules('CACIT 1GR/880UI 1 Dosi ore 08:00 dal 03/07/2026').rules, []);
});

const narrative = (over: Partial<DischargeNarrativeDraft>): DischargeNarrativeDraft => ({
  schemaVersion: '1',
  firstName: 'Test',
  lastName: 'Sintetico',
  dateOfBirth: '',
  placeOfBirth: '',
  sex: '',
  fiscalCode: '',
  address: '',
  phone: '',
  email: '',
  allergyStatus: 'not_documented',
  allergiesText: '',
  diagnosisText: '',
  anamnesisText: '',
  hospitalCourseText: '',
  consultationsText: '',
  imagingDiagnosticsText: '',
  proceduresAndInterventionsText: '',
  therapyText: '',
  adviceAndFollowUpText: '',
  unmappedText: '',
  boldTags: [],
  sourceReferences: [],
  missingSections: [],
  warnings: [],
  ...over,
});

test('AC1/AC2: la bozza da import contiene anche le prescrizioni fuori sezione', () => {
  const seeded = buildImportDraftData(
    narrative({
      therapyText: MULTIPAGE,
      adviceAndFollowUpText: 'Proseguire Lansoprazolo 30 mg 1 cps al mattino.',
    }),
    null,
  );
  const rows = seeded.terapiaImport as Array<{ farmacoNome: string; stato: string }>;
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['RAMIPRIL', 'BISOPROLOLO', 'ATORVASTATINA', 'PANTOPRAZOLO', 'LANSOPRAZOLO'],
  );
  assert.equal(rows[4].stato, 'da_verificare');
});

test('AC2: senza sezione terapia le prescrizioni del documento non vanno perse', () => {
  const seeded = buildImportDraftData(
    narrative({ unmappedText: 'Eutirox 50 mcg 1 cpr al mattino a digiuno.' }),
    null,
  );
  const rows = seeded.terapiaImport as Array<{ farmacoNome: string }>;
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['EUTIROX'],
  );
});

test('AC5: senza "dal …" la data inizio è il giorno di elaborazione; la data esplicita resta', () => {
  const rows = therapyRowsFromNarrative(
    {
      therapyText: [
        'RAMIPRIL CPR 5 MG (OS) 1 Cpr ore 08:00',
        'KEPPRA CPR 500 MGR (OS) 1 Cpr ore 08:00 dal 03/07/2026',
      ].join('\n'),
    },
    '2026-10-11',
  );
  assert.deepEqual(
    rows.map((r) => r.dataInizio),
    ['2026-10-11', '2026-07-03'],
  );
});

test('AC5: il giorno di elaborazione è quello della clinica (Europe/Rome), non UTC', () => {
  // 23:30 UTC del 10/10 = 01:30 del 11/10 in Italia (ora legale).
  assert.equal(clinicIsoDate(new Date('2026-10-10T23:30:00Z')), '2026-10-11');
});

// ── Regressioni dal QA indipendente (2026-10-11) ─────────────────────────────

test('F1: una scala dopo un farmaco non insulinico non lo trasforma in schema glicemico', () => {
  const rows = parseDischargeTherapy(
    'METFORMINA CPR 500 MG (OS) 1 Cpr ore 08:00\n\n150-200: 2 UI\n> 200: 4 UI',
  );
  assert.equal(rows[0].farmacoNome, 'METFORMINA');
  assert.equal(rows[0].doseMode, 'fixed');
  assert.equal(rows[0].stato, 'ok');
  assert.ok(rows.slice(1).every((r) => r.stato === 'da_verificare'));
});

test('F1: la basale a dose fissa non eredita la scala correttiva della riga successiva', () => {
  const rows = parseDischargeTherapy(
    [
      'LANTUS 100 UI (SC) 14 UI ore 22:00',
      'HUMALOG 100 UI (SC) ore 08:00, 12:00 e 19:00 secondo schema:',
      '150-200: 2 UI',
      '> 200: 4 UI',
    ].join('\n'),
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].farmacoNome, 'LANTUS');
  assert.equal(rows[0].doseMode, 'fixed');
  assert.equal(rows[1].doseMode, 'glucose_scale');
  assert.equal(rows[1].glucoseScale?.length, 2);
});

test('F2: il nome è il farmaco vicino alla dose, non la prima parola della frase', () => {
  const rows = therapyRowsOutsideSection([
    'Durante la degenza si è iniziata terapia con Furosemide 25 mg 1 cpr al mattino.',
    'In caso di dolore Paracetamolo 1 g al bisogno.',
    'Si consiglia Acido acetilsalicilico 100 mg 1 cpr a pranzo.',
  ]);
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['FUROSEMIDE', 'PARACETAMOLO', 'ACIDO'],
  );
  assert.match(rows[2].originalText, /Acido acetilsalicilico/);
});

test('F2: divieti, terapie pregresse e valori di laboratorio non diventano righe', () => {
  const rows = therapyRowsOutsideSection([
    'Evitare Ibuprofene 600 mg x 2 al giorno.',
    'Pregressa terapia con Amiodarone 200 mg 1 cpr al giorno.',
    'Non assumere Ketorolac 10 mg al bisogno.',
    'Diuresi 1500 ml/die.',
    'Glicemia 250 mg/dl al mattino.',
    'Proteinuria 3 g/die.',
  ]);
  assert.deepEqual(rows, []);
});

test('F4: il marcatore di pagina della pipeline non diventa una riga', () => {
  const rows = parseDischargeTherapy(
    'RAMIPRIL CPR 5 MG (OS) 1 Cpr ore 08:00\n--- Pagina 2/3 ---\nLASIX CPR 25 MG (OS) 1 Cpr ore 08:00',
  );
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['RAMIPRIL', 'LASIX'],
  );
});

test('F5: durate e soglie di altri esami non sono fasce glicemiche', () => {
  assert.deepEqual(findGlucoseRules('CLEXANE 4000 UI 10-15 gg').rules, []);
  assert.deepEqual(findGlucoseRules('EPARINA se aPTT 50-70: 2 UI').rules, []);
  assert.equal(
    parseDischargeTherapy('CLEXANE 4000 UI (SC) ore 20:00 per 10-15 gg')[0].doseMode,
    'fixed',
  );
});

test('R1: la forma farmaceutica fra nome e dose non diventa il nome', () => {
  const rows = therapyRowsOutsideSection([
    'Si prosegue Lansoprazolo cps 30 mg al mattino.',
    'Introdotta Furosemide fl 20 mg ev al mattino.',
  ]);
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['LANSOPRAZOLO', 'FUROSEMIDE'],
  );
});

test('R2: "4 U glicemia 200-250" è una fascia come "6 U se glicemia 251-300"', () => {
  assert.deepEqual(findGlucoseRules('4 U glicemia 200-250, 6 U se glicemia 251-300').rules, [
    { minMgDl: 200, maxMgDl: 250, units: 4 },
    { minMgDl: 251, maxMgDl: 300, units: 6 },
  ]);
});

test('2026-10-11: i titoli "Farmaci in uso:" / "Piano terapeutico" non diventano righe farmaco', () => {
  const rows = parseDischargeTherapy(
    'Farmaci in uso:\nRAMIPRIL CPR 5 MG (OS) 1 Cpr ore 08:00\nPiano terapeutico\nLASIX CPR 25 MG (OS) 1 Cpr ore 08:00',
  );
  assert.deepEqual(
    rows.map((r) => r.farmacoNome),
    ['RAMIPRIL', 'LASIX'],
  );
});

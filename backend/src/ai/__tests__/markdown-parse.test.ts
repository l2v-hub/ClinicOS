import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMarkdownSections,
  parseNarrativeFromMarkdown,
  detectSectionLoss,
  assertNoNarrativeSectionLoss,
  NarrativeSectionContentLostError,
} from '../sections/markdown-parse.js';
import { narrativeDraftToSectionRows } from '../sections/patient-narrative.js';

const ANAMNESI_DOC = `# Lettera di dimissione - AUSL Imola

## Anamnesi Patologica Recente:

Inviata in PS in data 09/03 per dolore toracico.
Ricoverata in reparto.

## Anamnesi Patologica Remota:

Pregresso intervento di colecistectomia.

## Diagnosi di dimissione:

Scompenso cardiaco congestizio.
Ipertensione arteriosa.`;

test('parses markdown headings and maps to canonical fields', () => {
  const m = parseMarkdownSections(ANAMNESI_DOC);
  assert.ok(m.has('anamnesisText'));
  assert.ok(m.has('diagnosisText'));
});

test('#242 combined "Diagnosi e terapia" heading keeps pharmacological therapy OUT of diagnosis', () => {
  const doc = `## Diagnosi e terapia alla dimissione
Scompenso cardiaco congestizio.
Ipertensione arteriosa.
Terapia: Ramipril 5 mg 1 cp/die.
Bisoprololo 2.5 mg.`;
  const d = parseNarrativeFromMarkdown(doc);
  // AC2: la terapia farmacologica NON compare nella diagnosi
  assert.ok(!/ramipril|bisoprololo/i.test(d.diagnosisText), 'diagnosi non deve contenere farmaci');
  // AC1/AC3: la diagnosi mantiene solo la diagnosi; la terapia va nella sezione terapia
  assert.ok(/scompenso cardiaco/i.test(d.diagnosisText));
  assert.ok(/ramipril/i.test(d.therapyText));
  assert.ok(/bisoprololo/i.test(d.therapyText));
});

test('#242 inline "Terapia:" label starts a therapy block even after diagnosis lines', () => {
  const m = parseMarkdownSections(
    '## Diagnosi di dimissione\nScompenso.\nTerapia: Ramipril 5 mg.\nFurosemide 25 mg.',
  );
  assert.ok(!/ramipril|furosemide/i.test(m.get('diagnosisText')?.text ?? ''));
  assert.ok(/ramipril/i.test(m.get('therapyText')?.text ?? ''));
  assert.ok(/furosemide/i.test(m.get('therapyText')?.text ?? ''));
});

test('anamnesis subtitles merge into ONE block, headings kept', () => {
  const d = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  assert.ok(d.anamnesisText.startsWith('## Anamnesi Patologica Recente:'));
  assert.ok(d.anamnesisText.includes('Inviata in PS in data 09/03'));
  assert.ok(d.anamnesisText.includes('## Anamnesi Patologica Remota:'));
  assert.ok(d.anamnesisText.includes('Pregresso intervento'));
  // does NOT bleed into diagnosis
  assert.ok(!d.anamnesisText.includes('Scompenso cardiaco'));
});

test('section ends at the next canonical heading', () => {
  const d = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  assert.ok(d.diagnosisText.includes('Scompenso cardiaco congestizio.'));
  assert.ok(d.diagnosisText.includes('Ipertensione arteriosa.'));
  assert.ok(!d.diagnosisText.includes('Anamnesi'));
});

test('plain (non-markdown) title line is recognised', () => {
  const doc = 'Terapia domiciliare:\nRamipril 5 mg 1 cp/die.\nFurosemide 25 mg.';
  const d = parseNarrativeFromMarkdown(doc);
  assert.ok(d.therapyText.includes('Ramipril 5 mg 1 cp/die.'));
  assert.ok(d.therapyText.includes('Furosemide 25 mg.'));
});

test('newlines and bullet lists are preserved', () => {
  const doc =
    '## Consigli e controlli:\n\n- Controllo cardiologico tra 30 giorni\n- Dieta iposodica\n\nMisurare il peso ogni giorno.';
  const d = parseNarrativeFromMarkdown(doc);
  assert.ok(d.adviceAndFollowUpText.includes('\n- Controllo cardiologico tra 30 giorni'));
  assert.ok(d.adviceAndFollowUpText.includes('- Dieta iposodica'));
  assert.ok(d.adviceAndFollowUpText.includes('\n\nMisurare il peso'));
});

test('multi-page-style continuation (blank lines) stays in the section', () => {
  const doc = '## Decorso ospedaliero:\n\nGiorno 1: ingresso.\n\n\nGiorno 5: dimissione.';
  const d = parseNarrativeFromMarkdown(doc);
  assert.ok(d.hospitalCourseText.includes('Giorno 1: ingresso.'));
  assert.ok(d.hospitalCourseText.includes('Giorno 5: dimissione.'));
});

test('imaging heading not swallowed by diagnosi alias', () => {
  const doc = '## Diagnostica per immagini:\n\nRx torace: congestione.';
  const d = parseNarrativeFromMarkdown(doc);
  assert.ok(d.imagingDiagnosticsText.includes('Rx torace: congestione.'));
  assert.equal(d.diagnosisText, '');
});

test('allergies populate text + status present', () => {
  const d = parseNarrativeFromMarkdown('## Allergie:\n\nPantoprazolo: riferita reazione cutanea.');
  assert.ok(d.allergiesText.includes('Pantoprazolo'));
  assert.equal(d.allergyStatus, 'present');
});

test('missingSections lists empty sections; populated ones excluded', () => {
  const d = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  assert.ok(!d.missingSections.includes('ANAMNESI'));
  assert.ok(!d.missingSections.includes('DIAGNOSI'));
  assert.ok(d.missingSections.includes('TERAPIA'));
});

test('detectSectionLoss flags a section whose text was dropped', () => {
  const draft = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  assert.deepEqual(detectSectionLoss(ANAMNESI_DOC, draft), []); // nothing lost
  const broken = { ...draft, anamnesisText: '' };
  assert.ok(detectSectionLoss(ANAMNESI_DOC, broken).includes('ANAMNESI'));
});

test('NARRATIVE_SECTION_CONTENT_LOST guard: empty draft from a content-rich doc is detected', () => {
  const empty = parseNarrativeFromMarkdown('');
  const lost = detectSectionLoss(ANAMNESI_DOC, empty);
  assert.ok(lost.includes('ANAMNESI') && lost.includes('DIAGNOSI'));
});

// BUG-048 (#70): populated sections must carry a sourceReference to the document so the
// "Confronta con la fonte" action has a file to open.
test('BUG-048: documentInfo populates sourceReferences for each non-empty section', () => {
  const d = parseNarrativeFromMarkdown(ANAMNESI_DOC, undefined, {
    id: 'doc1',
    filename: 'lettera.pdf',
  });
  const keys = new Set(d.sourceReferences.map((r) => r.sectionKey));
  assert.ok(
    keys.has('ANAMNESI') && keys.has('DIAGNOSI'),
    'populated sections linked to the document',
  );
  assert.ok(d.sourceReferences.every((r) => r.fileName === 'lettera.pdf' && r.fileId === 'doc1'));
  // empty sections (e.g. therapy) get no source ref
  assert.ok(!keys.has('TERAPIA'));
});

test('BUG-048: without documentInfo sourceReferences stay empty (back-compat)', () => {
  const d = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  assert.deepEqual(d.sourceReferences, []);
});

// BUG-051: the issue's fixture (`## Anamnesi Patologica Recente:`) must flow through to a
// persistence row with NON-EMPTY originalText, so the patient-detail editor opens populated.
test('BUG-051: anamnesis fixture populates ANAMNESIS.originalText through to the row', () => {
  const draft = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  const rows = narrativeDraftToSectionRows(draft);
  const anam = rows.find((r) => r.sectionKey === 'ANAMNESIS')!;
  assert.ok(anam.originalText.includes('## Anamnesi Patologica Recente:'));
  assert.ok(anam.originalText.includes('Inviata in PS in data 09/03'));
  assert.equal(anam.reviewStatus, 'pending'); // not 'absent' — content present
  const diag = rows.find((r) => r.sectionKey === 'DIAGNOSIS')!;
  assert.ok(diag.originalText.includes('Scompenso cardiaco congestizio.'));
});

// BUG-051: confirm-time guard must BLOCK a save when content was detected but dropped.
test('BUG-051: assertNoNarrativeSectionLoss passes for a faithfully parsed draft', () => {
  const draft = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  assert.doesNotThrow(() => assertNoNarrativeSectionLoss(ANAMNESI_DOC, draft));
});

test('BUG-051: assertNoNarrativeSectionLoss throws NarrativeSectionContentLostError on loss', () => {
  const draft = parseNarrativeFromMarkdown(ANAMNESI_DOC);
  const broken = { ...draft, anamnesisText: '', diagnosisText: '' };
  assert.throws(
    () => assertNoNarrativeSectionLoss(ANAMNESI_DOC, broken),
    (err: unknown) => {
      assert.ok(err instanceof NarrativeSectionContentLostError);
      assert.ok(err.lostSections.includes('ANAMNESI'));
      assert.ok(err.lostSections.includes('DIAGNOSI'));
      return true;
    },
  );
});

test('BUG-051: guard does NOT fire for unstructured text (no headings → UNMAPPED_CONTENT)', () => {
  const plain = 'Testo libero senza intestazioni di sezione riconoscibili.';
  const draft = parseNarrativeFromMarkdown(plain);
  assert.doesNotThrow(() => assertNoNarrativeSectionLoss(plain, draft));
});

// REQ-036: a section that begins on one page and continues (as plain prose, no new heading) on
// the following page must stay in ONE block. The page boundary must NOT close the section.
test('REQ-036: section spanning a page break stays in one block until a new canonical heading', () => {
  const crossPage =
    '## Anamnesi Patologica Recente\n\n' + // page 2
    'Inviata in PS in data 09/03 per dolore toracico.\n\n' +
    'Proseguiva quindi il ricovero con stabilizzazione del quadro clinico.\n\n' + // page 3 (no heading)
    '## Terapia alla dimissione\n\n' +
    'Ramipril 5 mg.';
  const d = parseNarrativeFromMarkdown(crossPage);
  assert.ok(d.anamnesisText.includes('Inviata in PS in data 09/03'));
  // continuation from the "next page" is part of the SAME anamnesis block
  assert.ok(d.anamnesisText.includes('Proseguiva quindi il ricovero'));
  // it did not bleed into the next section, and therapy starts cleanly
  assert.ok(!d.anamnesisText.includes('Ramipril'));
  assert.ok(d.therapyText.includes('Ramipril 5 mg.'));
});

// Referto reale: il titolo "Terapia Domiciliare Consigliata" e' in Maiuscolo Iniziale, non
// tutto maiuscolo ne' seguito da due punti. L'euristica lo scartava e l'INTERA terapia finiva
// nel calderone della sezione precedente: 20.000 caratteri in PRESTAZIONI_E_INTERVENTI con
// Terapia vuota, mentre l'operatore vedeva il farmaco da nessuna parte.
test('un titolo in Maiuscolo Iniziale apre la sezione (es. "Terapia Domiciliare Consigliata")', () => {
  const testo =
    'Prestazioni e Interventi\n\n' +
    'Eseguita coronarografia in data 12/03.\n\n' +
    'Terapia Domiciliare Consigliata\n\n' +
    'CORDARONE CPR 200 MGR (OS) 1 Cpr ore 08:00\n' +
    'FUROSEMIDE 25MG (OS) 2 Dosi ore 08:00 e alle 16:00';
  const d = parseNarrativeFromMarkdown(testo);
  assert.ok(d.therapyText.includes('CORDARONE'), 'la terapia deve stare nella sua sezione');
  assert.ok(d.therapyText.includes('FUROSEMIDE'));
  assert.ok(
    !d.proceduresAndInterventionsText.includes('CORDARONE'),
    'la terapia non deve piu' + " finire fra le prestazioni",
  );
});

// Il contrappeso: una frase di contenuto NON deve essere scambiata per un titolo solo perche'
// contiene la parola "terapia". Senza questo vincolo la correzione qui sopra spezzerebbe i
// referti a meta' frase.
test('una frase di contenuto non viene scambiata per intestazione', () => {
  const testo =
    'Anamnesi\n\n' +
    'Il paziente prosegue terapia con ramipril da alcuni anni\n' +
    'e riferisce buona tolleranza';
  const d = parseNarrativeFromMarkdown(testo);
  assert.ok(d.anamnesisText.includes('prosegue terapia con ramipril'));
  assert.equal(d.therapyText.trim(), '');
});

// Referto reale: la diagnosi e' scritta TUTTA IN MAIUSCOLO e contiene la parola "ALLERGICA".
// Trattando il maiuscolo come indizio di titolo, quella riga diventava un'intestazione
// "allergie" e da li' in poi l'intero referto finiva archiviato sotto le allergie: la
// sezione diagnosi restava con 22 caratteri (il solo titolo) e le allergie ne avevano 1.429.
test('una diagnosi in maiuscolo non e\' un titolo di sezione', () => {
  const testo =
    'Diagnosi di Dimissione\n\n' +
    'DUBBIA REAZIONE ALLERGICA AL CEFTAZIDIME\n' +
    'IVU DA PSEUDOMONAS A- E PROVIDENCIA STUARTII\n\n' +
    'Allergie\n\n' +
    'Allergia a Diflucan.';
  const d = parseNarrativeFromMarkdown(testo);
  assert.ok(d.diagnosisText.includes('CEFTAZIDIME'), 'la diagnosi deve restare nella diagnosi');
  assert.ok(!d.allergiesText.includes('CEFTAZIDIME'), 'e non deve finire fra le allergie');
  // il titolo vero delle allergie continua a funzionare
  assert.ok(d.allergiesText.includes('Diflucan'));
});

// La struttura, non il caso: un titolo sta su una riga propria staccata dal blocco
// precedente. Una riga dentro un paragrafo non e' un titolo, comunque sia scritta.
test('una riga dentro un paragrafo non apre una sezione', () => {
  const testo =
    'Decorso Ospedaliero\n\n' +
    'La paziente e\' stata ricoverata in reparto\n' +
    'Terapia diuretica sospesa\n' +
    'ed e\' stata dimessa in condizioni stabili';
  const d = parseNarrativeFromMarkdown(testo);
  assert.ok(d.hospitalCourseText.includes('Terapia diuretica sospesa'));
  assert.equal(d.therapyText.trim(), '');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownSections, parseNarrativeFromMarkdown, detectSectionLoss } from '../sections/markdown-parse.js';

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
  const doc = '## Consigli e controlli:\n\n- Controllo cardiologico tra 30 giorni\n- Dieta iposodica\n\nMisurare il peso ogni giorno.';
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

// REQ-036: a section that begins on one page and continues (as plain prose, no new heading) on
// the following page must stay in ONE block. The page boundary must NOT close the section.
test('REQ-036: section spanning a page break stays in one block until a new canonical heading', () => {
  const crossPage =
    '## Anamnesi Patologica Recente\n\n' +            // page 2
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

// REQ-037 evidence: run a 3-page discharge transcription (repeated Imola header + page footers)
// through the live filter + the narrative parser. Writes text artifacts (this REQ has no UI).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { filterRepeatedHeaders } from '../src/ai/sections/header-filter.js';
import { parseNarrativeFromMarkdown } from '../src/ai/sections/markdown-parse.js';

const OUT = join(process.cwd(), '..', 'requirements', 'evidence', 'REQ-037');
mkdirSync(OUT, { recursive: true });

const HEADER = [
  'Paziente: NOBILI DANIELA',
  'Nascita: 30/01/1944',
  'Residenza: IMOLA (BO)',
  'Codice Fiscale: NBLDNL44A70B032K',
  'Reparto: Cardiologia',
].join('\n');

const ORIGINAL = [
  HEADER, '',
  '## Anamnesi Patologica Recente', 'Inviata in PS in data 09/03 per dolore toracico.', '',
  'Pagina 1 di 3', '',
  HEADER, '',
  'Proseguiva quindi il ricovero con stabilizzazione del quadro emodinamico.', '',
  '## Decorso ospedaliero', 'Giorno 1: monitoraggio. Giorno 5: dimissione.', '',
  'Pagina 2 di 3', '',
  HEADER, '',
  '## Terapia alla dimissione', 'Ramipril 5 mg 1 cp/die.', 'Furosemide 25 mg.', '',
  'Pagina 3 di 3',
].join('\n');

const r = filterRepeatedHeaders(ORIGINAL);
const draft = parseNarrativeFromMarkdown(r.cleanedText, {});

writeFileSync(join(OUT, 'page-original-ocr.txt'), ORIGINAL, 'utf8');

writeFileSync(join(OUT, 'header-footer-detected.txt'), [
  'REQ-037 header/footer detection',
  `removedHeaderBlocks: ${r.removedHeaderBlocks}  (later duplicates of the patient header)`,
  `removedFooterLines : ${r.removedFooterLines}`,
  `detectedPageNumbers: ${JSON.stringify(r.detectedPageNumbers)}  (recovered BEFORE footer removal)`,
  `matchedLabels      : ${JSON.stringify(r.matchedLabels)}`,
  `warnings           : ${JSON.stringify(r.warnings)}`,
].join('\n'), 'utf8');

writeFileSync(join(OUT, 'cleaned-page-text.txt'), r.cleanedText, 'utf8');

const headerOccurrences = (r.cleanedText.match(/Codice Fiscale: NBLDNL44A70B032K/g) || []).length;
const between = r.cleanedText.slice(r.cleanedText.indexOf('Inviata in PS'), r.cleanedText.indexOf('Proseguiva'));
writeFileSync(join(OUT, 'cross-page-text-without-header.txt'), [
  'REQ-037 cross-page continuity (header removed between fragments)',
  `patient-header occurrences in cleaned text: ${headerOccurrences} (expect 1 — anagrafica kept once)`,
  `header present between the two Anamnesi fragments: ${/Codice Fiscale/.test(between)} (expect false)`,
  '',
  '--- ANAMNESI (parsed) ---',
  draft.anamnesisText,
  '',
  '--- DECORSO (parsed) ---',
  draft.hospitalCourseText,
  '',
  '--- TERAPIA (parsed) ---',
  draft.therapyText,
].join('\n'), 'utf8');

console.log('REQ-037 evidence written:',
  { removedHeaderBlocks: r.removedHeaderBlocks, removedFooterLines: r.removedFooterLines, headerOccurrences, pages: r.detectedPageNumbers });

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Il passaggio di sezionamento (`runtimeSections`) e' un ulteriore giro completo del modello su
// TUTTI i documenti: sulle 8 foto misurate in produzione valeva ~75s dei ~120s totali. Il suo
// risultato viene consumato SOLO quando `parseNarrativeFromMarkdown` non ha prodotto testo di
// sezione, quindi deve restare dentro quel ramo. Se qualcuno lo riporta fuori (calcolandolo
// sempre) l'import torna lento senza che nessun test funzionale se ne accorga: questa e' una
// guardia strutturale sulla sorgente, non un test di comportamento a runtime.
const SRC = readFileSync(resolve(import.meta.dirname, '..', 'upload', 'job-service.ts'), 'utf8');

test("il sezionamento e' invocato solo quando la narrativa non ha testo di sezione", () => {
  const guard = SRC.indexOf('if (!narrativeHasSectionText(narrative))');
  assert.ok(guard > 0, 'atteso il ramo di fallback su narrativeHasSectionText');

  const call = SRC.indexOf('await runtimeSections(');
  assert.ok(call > 0, "atteso l'uso di runtimeSections");
  assert.ok(
    call > guard,
    'runtimeSections deve stare DENTRO il ramo di fallback, non essere calcolato sempre',
  );
});

test('la chiamata di sezionamento resta disattivabile via AI_SECTIONS_PASS', () => {
  assert.match(
    SRC,
    /AI_SECTIONS_PASS !== 'false'/,
    'la valvola di sicurezza AI_SECTIONS_PASS non deve sparire',
  );
});

test('i passaggi ausiliari inviano JSON Schema veri, non esempi di output', () => {
  // Regressione reale: la trascrizione passava `{ rawText: '' }` — un esempio, non uno schema.
  // Finche' lo schema finiva nel prompt era innocuo; con lo structured output nativo finisce in
  // `response_format` e il provider risponde 400, facendo fallire la trascrizione in SILENZIO
  // (e' best-effort). Risultato: rawText vuoto e sezionamento sempre in fallback.
  assert.doesNotMatch(
    SRC,
    /runtimeCreateJob\(\s*jobId,\s*documents,\s*\{\s*rawText:\s*''\s*\}/,
    'la trascrizione non deve passare un esempio al posto dello schema',
  );
  assert.match(SRC, /const TRANSCRIBE_SCHEMA = \{\s*\n\s*type: 'object'/);
  assert.match(SRC, /const CLINICAL_LISTS_SCHEMA = \{\s*\n\s*type: 'object'/);
});

test('il prompt di trascrizione impone le intestazioni canoniche del parser', () => {
  // Senza `## NOME` il parser non ha appigli: in produzione ha ammassato 17.880 char su 18.987
  // in un'unica sezione, lasciando Terapia e Diagnosi vuote. I nomi devono restare allineati a
  // FIELD_TO_ITALIAN in sections/markdown-parse.ts, altrimenti l'intestazione non viene mappata.
  const italian = readFileSync(
    resolve(import.meta.dirname, '..', 'sections', 'markdown-parse.ts'),
    'utf8',
  );
  for (const name of [
    'ANAMNESI',
    'DIAGNOSI',
    'DECORSO_OSPEDALIERO',
    'PRESTAZIONI_E_INTERVENTI',
    'TERAPIA',
    'CONSIGLI_E_CONTROLLI',
    'ALLERGIE',
  ]) {
    assert.ok(SRC.includes(name), `il prompt deve elencare la sezione ${name}`);
    assert.ok(italian.includes(`'${name}'`), `${name} deve esistere in FIELD_TO_ITALIAN`);
  }
  assert.match(SRC, /## NOME/, 'il prompt deve chiedere intestazioni markdown');
});

test('la trascrizione resta un passaggio separato e precede il parsing', () => {
  // Sanity: la pigrizia introdotta riguarda solo il sezionamento; la trascrizione integrale
  // alimenta il parsing del markdown e deve continuare a precederlo.
  const transcribe = SRC.indexOf('await runtimeTranscribe(');
  const parse = SRC.indexOf('parseNarrativeFromMarkdown(');
  assert.ok(transcribe > 0 && parse > transcribe, 'la trascrizione deve precedere il parsing');
  assert.match(SRC, /AI_OCR_TRANSCRIPTION !== 'false'/);
});

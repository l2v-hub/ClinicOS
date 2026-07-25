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

test('la trascrizione resta un passaggio separato e precede il parsing', () => {
  // Sanity: la pigrizia introdotta riguarda solo il sezionamento; la trascrizione integrale
  // alimenta il parsing del markdown e deve continuare a precederlo.
  const transcribe = SRC.indexOf('await runtimeTranscribe(');
  const parse = SRC.indexOf('parseNarrativeFromMarkdown(');
  assert.ok(transcribe > 0 && parse > transcribe, 'la trascrizione deve precedere il parsing');
  assert.match(SRC, /AI_OCR_TRANSCRIPTION !== 'false'/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importedPastHistory, splitPastHistory } from '../clinical-history.js';
import { buildImportDraftData } from '../draft-service.js';
import { parseNarrativeFromMarkdown } from '../../ai/sections/markdown-parse.js';

// Entirely synthetic clinical passages: no patient identifiers or real case details.
const SOURCE = `## Diagnosi di dimissione
Trauma recente.
## Anamnesi Patologica Recente
Accesso per vertigine acuta.
## Anamnesi Patologica Remota
Nega diabete. Ipertensione nota.
Pregressa colecistectomia.
## Anamnesi familiare
Familiarità per una patologia non specificata.
## Interventi eseguiti
Sutura durante questo ricovero.`;

test('import maps only explicitly documented prior history; preserves full original and current diagnoses', () => {
  const narrative = parseNarrativeFromMarkdown(SOURCE);
  const original = structuredClone(narrative);
  const data = buildImportDraftData(narrative, null);
  const history = data.anamnesi as Record<string, string>;
  assert.equal(
    history.patologicaRemota,
    '## Anamnesi Patologica Remota\nNega diabete. Ipertensione nota.\nPregressa colecistectomia.',
  );
  assert.equal(history.patologicaProssima, narrative.anamnesisText);
  assert.equal(
    (data.diagnosi as Array<{ descrizione: string }>)[0].descrizione,
    '## Diagnosi di dimissione\nTrauma recente.',
  );
  assert.deepEqual(data._narrative, original);
  assert.deepEqual(narrative, original);
});

test('generic and unlabelled history is retained as source, never asserted to be past conditions', () => {
  const narrative = parseNarrativeFromMarkdown(
    '## Anamnesi\nDolore recente; nega precedenti episodi.',
  );
  const data = buildImportDraftData(narrative, null);
  assert.equal((data.anamnesi as Record<string, string>).patologicaRemota, undefined);
  assert.equal(
    (data.anamnesi as Record<string, string>).patologicaProssima,
    narrative.anamnesisText,
  );
});

test('plain/inline labels, abbreviations and unknown markdown boundaries retain negations', () => {
  const source =
    'Diagnosi di dimissione:\nTrauma.\nAPR: Nega interventi pregressi.\n## Informazione non classificata\nRilievo attuale.';
  assert.deepEqual(splitPastHistory(source), {
    past: 'APR: Nega interventi pregressi.',
    remaining:
      'Diagnosi di dimissione:\nTrauma.\n## Informazione non classificata\nRilievo attuale.',
  });
});

test('past surgery title is anamnesis; current surgery and discharge diagnoses remain separate', () => {
  const narrative = parseNarrativeFromMarkdown(
    '## Patologie note e interventi pregressi\nIpertensione.\n## Interventi pregressi\nNessun intervento noto.\n## Interventi eseguiti\nSutura odierna.\n## Diagnosi\nTrauma.',
  );
  assert.ok(narrative.anamnesisText.includes('Nessun intervento noto.'));
  assert.equal(narrative.proceduresAndInterventionsText, '## Interventi eseguiti\nSutura odierna.');
  assert.equal(narrative.diagnosisText, '## Diagnosi\nTrauma.');
});

test('misgrouped past-history block is seeded separately without deleting provenance', () => {
  const narrative = parseNarrativeFromMarkdown('## Diagnosi\nTrauma.');
  narrative.diagnosisText +=
    '\n## Patologie di base\nIpertensione.\n## Diagnosi attuali\nVertigine.';
  const data = buildImportDraftData(narrative, null);
  assert.equal(
    (data.anamnesi as Record<string, string>).patologicaRemota,
    '## Patologie di base\nIpertensione.',
  );
  assert.equal(
    (data.diagnosi as Array<{ descrizione: string }>)[0].descrizione,
    '## Diagnosi\nTrauma.\n## Diagnosi attuali\nVertigine.',
  );
  assert.deepEqual(data._narrative, narrative);
});

test('heading supplied separately by extraction is honored without repeating the same passage', () => {
  const sections = {
    sections: [
      { detectedHeading: 'Anamnesi patologica remota', rawText: 'Nessun intervento noto.' },
    ],
  };
  const once = importedPastHistory({}, sections);
  assert.equal(once, 'Anamnesi patologica remota\nNessun intervento noto.');
  assert.equal(importedPastHistory({ anamnesisText: once }, sections), once);
});

test('labels without clinical content do not create a false active diagnosis or history', () => {
  const narrative = parseNarrativeFromMarkdown(
    '## Diagnosi di dimissione\n## Patologie note\nIpertensione nota.',
  );
  const data = buildImportDraftData(narrative, null);
  assert.equal(data.diagnosi, undefined);
  assert.equal(importedPastHistory({ anamnesisText: '## Anamnesi patologica remota' }, null), '');
});

test('clinical sentences mentioning interventions or therapy are not mistaken for section labels', () => {
  const text =
    'Anamnesi patologica remota:\nInterventi non eseguiti per scelta del paziente.\nTerapia domiciliare sospesa nel passato.\nDiagnosi di dimissione:\nTrauma recente.';
  assert.equal(
    splitPastHistory(text).past,
    'Anamnesi patologica remota:\nInterventi non eseguiti per scelta del paziente.\nTerapia domiciliare sospesa nel passato.',
  );
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasNarrativeContent, isStructuredClinicalTopic, partitionNarrativeSections } from '../clinicalNarrativePresentation';

test('document absence placeholders are not clinical negative statements', () => {
  for (const value of ['', '   ', 'NON PRESENTE NEL DOCUMENTO', 'Non presente nel documento.']) assert.equal(hasNarrativeContent(value), false);
  for (const value of ['Nessuna allergia nota', 'Non presente nel documento\nDa verificare', 'Negativo', '<script>test sintetico</script>']) assert.equal(hasNarrativeContent(value), true);
});

test('only exact canonical topics compose the existing structured entry', () => {
  for (const key of ['ALLERGIES', 'DIAGNOSIS', 'ANAMNESIS']) assert.equal(isStructuredClinicalTopic(key), true);
  for (const key of ['allergies', 'toString', '__proto__', 'THERAPY', '']) assert.equal(isStructuredClinicalTopic(key), false);
});

test('current topics are never also standalone; empty non-topic cards compact together', () => {
  const section = (sectionKey: string, originalText: string, reviewedText = '', reviewStatus = 'absent') => ({ sectionKey, originalText, reviewedText, reviewStatus });
  const input = [section('ALLERGIES', 'NON PRESENTE NEL DOCUMENTO'), section('DIAGNOSIS', 'Testo originale sintetico'), section('ANAMNESIS', ''), section('THERAPY', ''), section('CONSULTATIONS', 'NON PRESENTE NEL DOCUMENTO'), section('HOSPITAL_COURSE', 'Decorso sintetico', '', 'pending')];
  const before = JSON.stringify(input);
  const output = partitionNarrativeSections(input);
  assert.deepEqual(output.standalone.map(s => s.sectionKey), ['HOSPITAL_COURSE']);
  assert.deepEqual(output.empty.map(s => s.sectionKey), ['THERAPY', 'CONSULTATIONS']);
  assert.equal(JSON.stringify(input), before, 'presentation cannot mutate source records');
});

test('original, reviewed and conflicts remain accessible despite absent status or placeholder', () => {
  const sections = [
    {sectionKey:'THERAPY',originalText:'Originale sintetico',reviewedText:'',reviewStatus:'absent'},
    {sectionKey:'CONSULTATIONS',originalText:'',reviewedText:'Revisione sintetica',reviewStatus:'modified'},
    {sectionKey:'HOSPITAL_COURSE',originalText:'',reviewedText:'',reviewStatus:'conflict'},
  ];
  const output = partitionNarrativeSections(sections);
  assert.equal(output.empty.length, 0);
  assert.deepEqual(output.standalone, sections);
});

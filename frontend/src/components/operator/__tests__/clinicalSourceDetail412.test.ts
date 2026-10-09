import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NarrativeSourceDetail, type NarrativeSectionDTO } from '../cartella/NarrativeSourceDetail';

const dto = (overrides: Partial<NarrativeSectionDTO> = {}): NarrativeSectionDTO => ({
  sectionKey:'DIAGNOSIS',title:'Diagnosi',originalText:'Testo originale sintetico',reviewedText:'',displayText:'',
  annotations:[],sourceReferences:[],reviewStatus:'pending',...overrides,
});
const html = (section: NarrativeSectionDTO) => renderToStaticMarkup(createElement(NarrativeSourceDetail,{section,children:'Dettaglio sintetico'}));
test('source details closed initially retain all source references and explicit conflict',()=>{
  const markup=html(dto({reviewStatus:'conflict',sourceReferences:[{}, {fileName:'fonte-sintetica.txt',pageFrom:2,pageTo:3},{fileName:'fonte-seconda.txt',pageFrom:4}]}));
  assert.match(markup,/Conflitto da risolvere/);assert.match(markup,/pagina 2–3/);assert.match(markup,/fonte-seconda.txt/);
  assert.doesNotMatch(markup,/<details[^>]*\sopen/);
});
test('reviewed narrative keeps escaped original and does not invent import provenance',()=>{
  const markup=html(dto({originalText:'<script>dato sintetico</script>',reviewedText:'Rivisto sintetico'}));
  assert.match(markup,/Testo originale registrato/);assert.match(markup,/Provenienza non registrata/);
  assert.match(markup,/&lt;script&gt;/);assert.doesNotMatch(markup,/<script>/);
  assert.match(markup,/non aggiornano automaticamente i dati correnti/);
});
test('meaningful source with stale absent status is not labelled document absence',()=>{
  const markup=html(dto({reviewStatus:'absent'}));
  assert.match(markup,/Testo disponibile · stato della fonte da verificare/);
  assert.doesNotMatch(markup,/Non presente nel documento/);
});

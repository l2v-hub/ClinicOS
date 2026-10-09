import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentCatalogView } from '../assessments/AssessmentCatalog';
import { assessmentCatalogEntry } from '../../../lib/assessments/assessmentEntry';
import { createAssessmentDraftStore } from '../../../lib/assessments/assessmentDraftStore';
import { CATALOG_TYPES, type AssessmentCatalogData } from '../../../lib/assessments/assessmentCatalog';
import type { AssessmentCatalogState } from '../../../lib/assessments/assessmentCatalogState';
import { ASSESSMENT_VERSIONS } from '../../../lib/assessments/assessmentTypes';
import type { CartellaPaziente } from '../../../types';
Object.assign(globalThis, { React });
const data = () => ({ items: CATALOG_TYPES.map(type => ({type, formVersion: ASSESSMENT_VERSIONS[type], latestFinal:null, latestOwnDraft:null, ownDraftCount:0})) });
const render = (canCreate=true) => renderToStaticMarkup(React.createElement(AssessmentCatalogView, {cartella:{} as CartellaPaziente,state:{status:'ready',data:data(),error:null},localDraftTypes:new Set(['mna']),canCreate,onRetry(){},onOpen(){},onNrs(){}}));
test('415 purpose text and unchanged catalog names accompany visible text actions, not tooltips', () => {
  const html=render();
  for(const name of ['Braden','PAINAD','Tinetti','MNA®-SF','GDS-15','Indice di Barthel','UCLA · Sonno-veglia (NPI)']) assert.ok(html.includes(`<h4>${name}</h4>`));
  for(const purpose of ['Rischio di compromissione','Valutazione osservazionale del dolore','Equilibrio e andatura','Screening rapido','Screening della depressione','Autonomia nelle attività','Item Sonno']) assert.ok(html.includes(purpose),purpose);
  assert.equal((html.match(/aria-label="Storico /g)||[]).length,10);
  assert.equal((html.match(/aria-label="Compila /g)||[]).length,10);
  assert.match(html,/>Storico<\/button>/);
  assert.match(html,/>Compila<\/button>/);
  assert.match(html,/>Riprendi bozza<\/button>/);
  assert.doesNotMatch(html,/ title=/);
});
test('415 history is non-mutating and does not automatically resume local or server drafts', () => {
  const store=createAssessmentDraftStore();
  const key=store.create('synthetic415',undefined,'mna');
  const before=JSON.stringify(store.list('synthetic415','mna'));
  const entry=assessmentCatalogEntry('synthetic415','mna','history',store);
  assert.deepEqual(entry,{type:'mna',historyOnly:true});
  assert.equal(JSON.stringify(store.list('synthetic415','mna')),before);
  assert.equal(assessmentCatalogEntry('synthetic415','mna','resume',store).localKey,key);
});
test('415 read-only actor sees history and purposes, without compilation or draft mutation actions', () => {
  const html=render(false);
  assert.equal((html.match(/aria-label="Storico /g)||[]).length,10);
  assert.doesNotMatch(html,/aria-label="(?:Compila|Riprendi bozza|Elimina bozza)/);
  assert.match(html,/Valutazione osservazionale del dolore/);
});
test('415 empty, local, saved-own and real latest-final dates are distinct; never invent a score', () => {
  const values: AssessmentCatalogData=data();
  values.items[0].latestFinal={id:'synthetic-final',formVersion:ASSESSMENT_VERSIONS.painad,assessedAt:'2026-10-07T08:00:00.000Z',createdAt:'2026-10-08T08:00:00.000Z',finalizedAt:'2026-10-09T08:00:00.000Z'};
  values.items[0].ownDraftCount=1;
  values.items[0].latestOwnDraft={id:'synthetic-own',formVersion:ASSESSMENT_VERSIONS.painad,assessedAt:'2026-10-09T08:00:00.000Z',createdAt:'2026-10-09T08:00:00.000Z',updatedAt:'2026-10-09T09:00:00.000Z'};
  values.items[2].ownDraftCount=1;values.items[2].latestOwnDraft={...values.items[0].latestOwnDraft,formVersion:ASSESSMENT_VERSIONS.tinetti};
  const html=renderToStaticMarkup(React.createElement(AssessmentCatalogView,{cartella:{} as CartellaPaziente,state:{status:'ready',data:values,error:null},localDraftTypes:new Set(['mna']),onRetry(){},onOpen(){},onNrs(){}}));
  assert.match(html,/Ultima completa: <strong>07\/10\/26, 10:00/);
  assert.match(html,/Registrata 08\/10\/26, 10:00 · Finalizzata/);
  assert.match(html,/1 bozza salvata personale/);
  assert.match(html,/Bozza personale · nessuna compilazione completa/);
  assert.match(html,/Bozza da riprendere/);
  assert.doesNotMatch(html,/synthetic-final|synthetic-own|Punteggio totale/);
});
test('415 loading and failed metadata do not assert empty or stale saved drafts', () => {
  const stale: AssessmentCatalogData=data();stale.items[0].ownDraftCount=1;
  for(const status of ['loading','error'] as const){
    const state:AssessmentCatalogState={status,data:stale,error:status==='error'?'Errore sintetico':null};
    const html=renderToStaticMarkup(React.createElement(AssessmentCatalogView,{cartella:{} as CartellaPaziente,state,localDraftTypes:new Set(),onRetry(){},onOpen(){},onNrs(){}}));
    const painad=html.split('<h4>PAINAD</h4>')[1].split('</article>')[0];
    assert.doesNotMatch(painad,/Nessuna compilazione|bozza salvata personale|Riprendi bozza/);
    assert.match(painad,status==='loading'?/Caricamento date e bozze/:/Date e bozze non disponibili/);
  }
});

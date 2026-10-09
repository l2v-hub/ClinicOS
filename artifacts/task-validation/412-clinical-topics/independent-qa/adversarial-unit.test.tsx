import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnamnesisEditor } from '../../../../frontend/src/components/operator/sections/AnamnesisEditor';
import { NarrativeClinicalSection } from '../../../../frontend/src/components/shared/sections/NarrativeClinicalSection';
import { partitionNarrativeSections, hasNarrativeContent } from '../../../../frontend/src/lib/clinicalNarrativePresentation';

test('independent: legacy AnamnesisEditor default remains expanded with allergy summary; chart-only empty collapse',()=>{
  const baseline=renderToStaticMarkup(<AnamnesisEditor mode="patient-chart" value={{}} onChange={()=>{}}/>);
  assert.equal((baseline.match(/clinical-card--collapsed/g)||[]).length,0);
  assert.match(baseline,/Nessuna allergia registrata/);
  const chart=renderToStaticMarkup(<AnamnesisEditor mode="patient-chart" value={{}} onChange={()=>{}} showAllergySummary={false} sourceDetail={<p>Source detail synthetic</p>}/>);
  assert.equal((chart.match(/clinical-card--collapsed/g)||[]).length,2);
  assert.doesNotMatch(chart,/Nessuna allergia registrata/);
  assert.match(chart,/Dati correnti registrati — Anamnesi/);
});

test('independent: NarrativeClinicalSection default remains open; false is opt-in only',()=>{
  const props={sectionKey:'QA_TOPIC',title:'Synthetic topic',originalText:'Synthetic faithful source',reviewedText:'',annotations:[],sources:[],editable:false};
  const baseline=renderToStaticMarkup(<NarrativeClinicalSection {...props}/>);
  const compact=renderToStaticMarkup(<NarrativeClinicalSection {...props} defaultOpen={false}/>);
  assert.doesNotMatch(baseline,/<div[^>]+ hidden=""/);
  assert.match(compact,/<div[^>]+ hidden=""/);
  assert.match(baseline,/Synthetic faithful source/);
});

test('independent: future topic and unresolved blank conflict remain standalone without mutation',()=>{
  const rows=[{sectionKey:'FUTURE_UNKNOWN',originalText:'Synthetic extra source',reviewedText:'',reviewStatus:'absent'},
    {sectionKey:'HOSPITAL_COURSE',originalText:'',reviewedText:'',reviewStatus:'conflict'},
    {sectionKey:'CONSULTATIONS',originalText:'NON PRESENTE NEL DOCUMENTO\nDa verificare',reviewedText:'',reviewStatus:'absent'}];
  const before=JSON.stringify(rows), result=partitionNarrativeSections(rows);
  assert.deepEqual(result.standalone,rows);assert.deepEqual(result.empty,[]);assert.equal(JSON.stringify(rows),before);
  assert.equal(hasNarrativeContent('Nega allergie'),true);
  assert.equal(hasNarrativeContent('NON PRESENTE NEL DOCUMENTO: da verificare'),true);
});

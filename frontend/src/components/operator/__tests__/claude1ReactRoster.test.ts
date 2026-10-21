import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PatientRoster } from '../PatientRoster';
import { setSessionCapabilities } from '../../../lib/capabilities';
import type { ComponentProps } from 'react';
Object.assign(globalThis,{React});
const patient={id:'synthetic-p1',firstName:'Synthetic',lastName:'Patient',medicalRecordNumber:'QA1',dateOfBirth:'1980-01-01',location:{status:'assigned',source:null,room:'1',bed:'A',asOf:'2026-10-21'}};
function roster(summaryMap: Map<string,unknown>, fallito=false, verificaIncompleta=false) {
  setSessionCapabilities({});
  return renderToStaticMarkup(React.createElement(PatientRoster,{
    patients:[patient],sort:{field:'patient',direction:'asc'},onSortChange(){},hasMore:false,loading:false,summaryMap,consegneAperteMap:new Map(),
    anomalie:{inCorso:false,fallito,verificaIncompleta,pazienti:[],perPaziente:new Map()},deleteEnabled:false,deletingId:null,onSelect(){},onDelete(){},
  } as ComponentProps<typeof PatientRoster>));
}
test('the existing list status announces unavailable anomalies once; unverified rows carry a compact marker',()=>{
  try {
    const html=roster(new Map(),true);
    assert.equal((html.match(/Verifica farmaci di reparto incompleta/g)??[]).length,1);
    assert.match(html,/role="status"/);
    assert.match(html,/Da verificare/);
    assert.match(roster(new Map(),false,true),/Da verificare/);
  } finally {setSessionCapabilities(null);}
});
test('verified clean summaries and anomalies leave rows clean; missing summary stays unknown',()=>{
  try {
    const clean=new Map([[patient.id,{patientId:patient.id,hasCriticalVitals:false,hasHighRisk:false,allergieCount:0}]]);
    assert.doesNotMatch(roster(clean),/Da verificare|Segnalazioni per Synthetic/);
    assert.match(roster(new Map()),/Da verificare/);
  } finally {setSessionCapabilities(null);}
});

test('overview preserves known partial parameters while NEWS2 history remains explicitly unverified',async()=>{
  const {VitalsOverview}=await import('../VitalsOverview');
  const html=renderToStaticMarkup(React.createElement(VitalsOverview,{
    state:'ready',stale:false,verificationIncomplete:true,
    readings:[{id:'r1',patientId:'synthetic-p1',requestId:'r1',measuredAt:'2026-10-21T10:00:00Z',values:{fc:'72'},authorOperatorId:'op1',authorName:'Synthetic',createdAt:'2026-10-21T10:00:00Z'}],
    onRetry(){},onOpenHistory(){},
  }));
  assert.match(html,/Da verificare/);
  assert.match(html,/Verifica incompleta: carica le rilevazioni precedenti/);
  assert.match(html,/72/);
  assert.doesNotMatch(html,/NEWS2 non calcolabile|Parametri non disponibili/);
});

import assert from 'node:assert/strict';
export function verifyBrowser(result,app,cases){
 assert.equal(result.applicationCommit,app);assert.equal(cases,46);
 assert.equal(result.outcomes.length,cases);assert.ok(result.outcomes.every(o=>o.status==='PASS'));
 assert.equal(new Set(result.outcomes.map(o=>o.name)).size,cases);assert.equal(result.states.length,30);
 const counts=[7,1,1,1,1,1,1,1,1,1,1,2,2,1,1];
 const grants=['allowed','no-upload','no-save','missing','allowed','no-upload','allowed','allowed','allowed','no-save','missing','no-classify','no-upload','no-classify','null-policy'];
 for(const [i,s]of result.states.entries()){
  const n=i%15;assert.equal(s.grant,grants[n]);assert.equal(s.operator,![4,5].includes(n));assert.equal(s.asserted.length,counts[n]);
  for(const key of ['unexpected','external','clinicalWrites','pageErrors'])assert.deepEqual(s[key],[],key);
  assert.deepEqual(s.expectedErrors,n===7?[{status:503,path:'/patients/QA-PAT-423/documents'}]:[]);
  assert.deepEqual(s.httpErrors,s.expectedErrors);assert.equal(s.errors.length,s.expectedErrors.length);
  assert.ok(s.errors.every(e=>/^Failed to load resource: the server responded with a status of 503/.test(e)));
  assert.equal(s.mode,'ready');assert.equal(s.held,0);
  assert.equal(s.requests.some(r=>r.method==='PATCH'),false);
  const writes=s.allowedMockMutations;assert.ok(Array.isArray(writes));
  if(n===0){assert.equal(s.uploads,1);assert.equal(s.cartellaSaves,1);assert.equal(writes.length,2);assert.deepEqual(writes[0],{method:'POST',path:'/patients/QA-PAT-423/documents',documentType:'prescrizione',syntheticFile:true});assert.equal(writes[1].metadataOnly,false);}
  else if(n===11||n===12){assert.equal(s.uploads,0);assert.equal(s.cartellaSaves,1);assert.equal(writes.length,1);assert.equal(writes[0].metadataOnly,true);}
  else{assert.equal(s.uploads,0);assert.equal(s.cartellaSaves,0);assert.deepEqual(writes,[]);continue;}
  const w=writes.at(-1);assert.equal(w.method,'PUT');assert.equal(w.path,'/patients/QA-PAT-423/cartella');assert.equal(w.records.length,1);const r=w.records[0];
  assert.equal(r.tipo,'prescrizione');assert.equal(r.patientDocumentId,'QA-DOC-423');assert.equal(r.descrizione,'Documento sintetico QA 423');assert.equal(r.operatore,'Operatore Sintetico');assert.equal(r.stato,'ricevuto');
  if(n===11||n===12){assert.equal(r.id,'QA-REC-423');assert.equal(r.note,'Nota sintetica QA 423 aggiornata');assert.equal(r.dataConsegna,'2026-10-10');}
  assert.equal(s.requests.some(r=>r.method==='PATCH'),false);
 }
}

import assert from 'node:assert/strict';
export function verifyBrowser(result,app,cases){
 assert.equal(result.applicationCommit,app);assert.equal(result.outcomes.length,cases);assert.ok(result.outcomes.every(r=>r.status==='PASS'));assert.equal(result.states.length,2);
 assert.ok([50,6].includes(cases),'Only frozen candidate plans are accepted, not historical failures/baseline');
 for(const s of result.states){for(const key of ['unexpected','external','clinicalWrites','pageErrors','httpErrors','errors'])assert.deepEqual(s[key],[],key);
  const writes=s.allowedMockMutations;assert.ok(Array.isArray(writes));
  if(cases===6){assert.deepEqual(writes,[]);continue;}
  assert.equal(writes.length,7);
  for(const [n,i]of [10,11,12,13,15,9,10].entries()){
   const w=writes[n];assert.equal(w.id,'QA-OP-428-'+i);assert.equal(w.payload.nome,'Sintetico');assert.equal(w.payload.cognome,'Identita'+String(i).padStart(2,'0'));assert.equal(w.payload.email,'role428-'+i+'@example.test');
   for(const key of Object.keys(w.payload))assert.ok(['nome','cognome','email','telefono','reparto','stato','qualifica','colore','note','ruolo'].includes(key),'No authorization payload fields');
   assert.equal(w.payload.reparto,'Reparto aggiornato sintetico '+i);assert.equal(w.payload.qualifica,'Qualifica sintetica '+i);
   if(n<6)assert.equal(Object.hasOwn(w.payload,'ruolo'),false,'Unrelated edits omit professional role');else assert.equal(w.payload.ruolo,'infermiere','Only explicit selection');
  }
 }
}

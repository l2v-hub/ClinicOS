import assert from 'node:assert/strict';
export function verifyBrowser(result,app,cases){
 assert.equal(result.applicationCommit,app);assert.equal(result.outcomes.length,cases);assert.ok(cases>=1);assert.ok(result.outcomes.every(r=>r.status==='PASS'));
 assert.ok(result.states.length>=1);
 for(const s of result.states){for(const key of ['unexpected','external','clinicalWrites','pageErrors'])assert.deepEqual(s[key],[],key);assert.deepEqual(s.allowedMockMutations??[],[]);assert.deepEqual(s.httpErrors,[]);assert.deepEqual(s.errors,[]);}
}

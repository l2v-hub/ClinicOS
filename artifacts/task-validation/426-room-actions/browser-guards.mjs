import assert from 'node:assert/strict';
export function verifyBrowser(result, app, count) {
  assert.equal(result.applicationCommit,app);assert.equal(result.outcomes.length,count);
  assert.ok(result.outcomes.every(r=>r.status==='PASS'));assert.ok(result.states.length);
  for(const state of result.states){
    for(const key of ['clinicalWrites','unexpected','external','pageErrors'])assert.deepEqual(state[key],[]);
    const expectedErrors=state.expectedErrors??0;
    assert.ok(expectedErrors===0||expectedErrors===1);
    if(state.expectedErrors===undefined){assert.equal(state.allowMutation,false);assert.deepEqual(state.allowedMockMutations,[]);}
    assert.equal(state.errors.length,expectedErrors);assert.ok(state.errors.every(e=>e.includes('409')));
    assert.deepEqual(state.httpErrors,Array.from({length:expectedErrors},()=>({status:409,path:'/admin/beds/QA-BED-426-2-B'})));
    assert.ok(state.allowedMockMutations.every(r=>r.method==='PUT'&&/^\/admin\/(rooms|beds)\/QA-(ROOM|BED)-426-/.test(r.path)));
    assert.ok(state.requests.every(r=>r.method!=='DELETE'));
  }
}

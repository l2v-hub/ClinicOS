from pathlib import Path
s=Path('/tmp/clinicos-autonomy-activation-20261022/source6');tests=s/'agent-team/tests/bug-pipeline';prod=s/'agent-team/src/bug-pipeline'
f=prod/'external-review.mjs';t=f.read_text().replace('''    if (!entry || !matches(entry)) continue;
    if (!identity(entry)) ambiguous = true;''','''    if (!entry || !matches(entry) || ['waiting-checks', 'blocked'].includes(entry.status)) continue;
    if (!['running', 'failed', 'verified', 'changes-requested'].includes(entry.status) || !identity(entry)) ambiguous = true;''',1);f.write_text(t)
f=tests/'external-review.test.mjs';t=f.read_text();t=t.replace("  const result = await externalReviewStep(args);\n  assert.deepEqual(result, { status: 'skipped', reason: 'operator-owned' });", "  await assert.rejects(externalReviewStep(args), error => error.code === 'review-operator-owned');");f.write_text(t)
def append(name,t):
 f=tests/(name+'.test.mjs');f.write_text(f.read_text()+t)
append('operator-ownership',r'''
test('QA6-F1 malformed takeover and active types fail closed even without schema validation', () => {
  for (const active of ['true','false','',0,1,null,undefined,[],{}]) {
    const takeover=handback();takeover.active=active;
    assert.equal(automationPaused({operatorTakeover:takeover}),true);
    assert.equal(operatorOwns({operatorTakeover:takeover},'batches',{id:'new'}),true);
  }
  for (const takeover of [null,false,0,'',[], 'true'])
    assert.equal(automationPaused({operatorTakeover:takeover}),true);
  const inactive=handback();inactive.active=false;
  assert.equal(automationPaused({operatorTakeover:inactive}),false);
  assert.equal(automationPaused({operatorTakeover:{nonce:'legacy-budget-audit'}}),false);
  assert.equal(automationPaused({operatorTakeover:{active:true}}),true);
});
''')
append('contracts',r'''
test('QA6-F1 explicit active must be boolean while inactive and legacy audit absence stay valid', () => {
  const state={schemaVersion:1,repository:'l2v-hub/ClinicOS',batches:[]};
  for (const active of ['true','false','',0,1,null,undefined,[],{}]) {
    state.operatorTakeover={active};
    assert.throws(()=>validateState(state,state.repository),/invalid operator takeover/);
  }
  for(const takeover of [null,false,0,'',[], 'true']) {
    state.operatorTakeover=takeover;
    assert.throws(()=>validateState(state,state.repository),/invalid operator takeover/);
  }
  for(const takeover of [{active:false},{nonce:'legacy-budget-audit'},{active:true}]) {
    state.operatorTakeover=takeover;
    assert.equal(validateState(state,state.repository),state);
  }
});
''')
append('pipeline',r'''
test('QA6-F1 invalid active types never reach intake or discovery; legitimate inactive/audit states do', async () => {
  for(const active of ['true','false','',0,1,null,[],{}]) {
    const takeover=takeoverHandback();takeover.active=active;
    const h=harness({initialState:{...blankState(),operatorTakeover:takeover},queue:[]});
    await assert.rejects(h.run(),/invalid operator takeover/);
    assert.deepEqual(h.log,['store.load']);assert.equal(h.counts.plan,0);
  }
  for(const takeover of [{active:false},{nonce:'legacy-budget-audit'}]) {
    const h=harness({initialState:{...blankState(),operatorTakeover:takeover},queue:[]});
    await h.run();assert.ok(h.log.includes('gh.intake'));assert.ok(h.log.includes('gh.discoverQueue'));
    assert.equal(h.counts.plan,0);
  }
});

test('QA6-F5 external ownership exception refreshes canonical A before independent B disposition', async () => {
  const a=batchFor({issues:[17],phase:'waiting-review'}),b=batchFor({issues:[18],phase:'waiting-review'});
  a.externalReview={status:'published',subjectSha:a.sha};b.externalReview={status:'published',subjectSha:b.sha};
  const h=harness({issues:[17,18],queue:[],initialState:{...blankState(),batches:[a,b]}});
  h.gh.createStateStore=()=>h.store;
  let frozenA,afterOwnership;
  h.gh.viewIssue=async number=>{
    if(number===17) {
      h.stateRef.value.batches[0].operatorCoordination={active:true};
      h.stateRef.value.batches[0].remoteNote='preserve operator data';
      h.stateRef.value.operatorTakeover=takeoverHandback([{collection:'batches',id:a.id}]);
      frozenA=clone(h.stateRef.value.batches[0]);afterOwnership=h.log.length;
      throw Object.assign(new Error('observed ownership loss'),{code:'review-operator-owned'});
    }
    assert.equal(number,18);return {state:'closed'};
  };
  const result=await h.run({action:'test'},'external');
  assert.deepEqual(result.batches[0],frozenA);assert.deepEqual(h.stateRef.value.batches[0],frozenA);
  assert.equal(result.batches[1].phase,'blocked','closed B is independently reconciled rather than aborted');
  assert.match(result.batches[1].reason,/Source issue was closed/);
  assert.equal(h.log.slice(afterOwnership).some(x=>x.startsWith('gh.commentIssue:17')||x.startsWith('gh.setIssueStatus:17:')),false);
  assert.equal(h.counts.execute,0);
});
''')
append('external-review',r'''
const qaIntent=(batch,nonce,status='failed')=>({status,nonce,subjectSha:batch.sha,claudeRound:batch.reviews.length,
  feedbackFingerprint:batch.externalReview.feedbackFingerprint,reservedAt:'2026-10-17T00:00:00.000Z'});
test('QA6-F3 duplicate legacy intents across ledger and recovery histories count once, preserving originals', async () => {
  const {args,batch}=approvedExternalArgs();
  const legacy=qaIntent(batch,'one-legacy-session');
  batch.qaHistory=[structuredClone(legacy)];
  batch.codexFinalReviewHistory=[structuredClone(legacy)];
  batch.codexFinalQaInfrastructure={attempts:[structuredClone(legacy),structuredClone(legacy)]};
  const originalQaHistory=structuredClone(batch.qaHistory),originalLedger=structuredClone(batch.codexFinalQaInfrastructure.attempts);
  let calls=0;args.workspace.finalQa=async()=>{calls++;throw new Error('synthetic infrastructure failure');};
  args.workspace.execute=async()=>assert.fail('infrastructure is not a code correction');
  for(let i=0;i<2;i++) {
    batch.phase='waiting-review';await assert.rejects(externalReviewStep(args),/synthetic infrastructure failure/);
  }
  batch.phase='waiting-review';await externalReviewStep(args);
  assert.equal(calls,2);assert.equal(batch.codexFinalReview.failureCode,'final-qa-infrastructure-exhausted');
  assert.deepEqual(batch.qaHistory,originalQaHistory);
  assert.deepEqual(batch.codexFinalQaInfrastructure.attempts.slice(0,2),originalLedger);
  assert.deepEqual(batch.codexFinalReviewHistory[0],legacy);
  assert.equal(new Set(batch.codexFinalQaInfrastructure.attempts.map(x=>x.nonce)).size,3);
  assert.equal(batch.implementation.length,1);
});
test('QA6-F3 other identities and waiting/pre-QA blocked metadata never consume inference allowance', async () => {
  const {args,batch,log}=approvedExternalArgs();
  const metadata=['waiting-checks','blocked'].map(status=>qaIntent(batch,'metadata-'+status,status));
  const other=[{subjectSha:'b'.repeat(40)},{claudeRound:9},{feedbackFingerprint:'other-feedback'}]
    .map((patch,i)=>({...qaIntent(batch,'other-'+i),...patch}));
  batch.qaHistory=[...metadata,...other];batch.codexFinalReviewHistory=structuredClone(batch.qaHistory);
  batch.codexFinalQaInfrastructure={attempts:structuredClone(metadata)};
  const original=structuredClone(batch.qaHistory);
  await externalReviewStep(args);
  assert.equal(batch.phase,'ready');assert.equal(log.filter(x=>x==='qa').length,1);
  assert.deepEqual(batch.qaHistory,original);
  assert.equal(batch.codexFinalQaInfrastructure.attempts.filter(x=>x.status==='verified').length,1);
});
test('QA6-F3 ambiguous spent legacy intent cannot trigger inference or implementation retry', async () => {
  const {args,batch,log}=approvedExternalArgs();
  const ambiguous=qaIntent(batch,'missing');delete ambiguous.nonce;
  batch.qaHistory=[structuredClone(ambiguous)];
  args.workspace.execute=async()=>assert.fail('ambiguous legacy intent is not a code finding');
  await externalReviewStep(args);
  assert.equal(batch.phase,'blocked');assert.equal(batch.codexFinalReview.failureCode,'final-qa-infrastructure-history-ambiguous');
  assert.deepEqual(batch.qaHistory,[ambiguous]);assert.equal(log.includes('qa'),false);assert.equal(batch.implementation.length,1);
});
''')
f=tests/'comment-review-handoff.test.mjs';t=f.read_text().replace("import { feedbackFingerprint }", "import { externalReviewStep } from '../../src/bug-pipeline/external-review.mjs';\nimport { feedbackFingerprint }");f.write_text(t)
append('comment-review-handoff',r'''
test('QA6-F3 actual authorized typed QA recovery retains one legacy spend and permits only two new sessions', async () => {
  const f=fixture();f.setPermission('maintain');const b=f.remote.batches[0];
  const fingerprint=feedbackFingerprint(await f.github.reviewFeedback(81));
  const report=JSON.stringify({subject_sha:b.sha,verdict:'approved',summary:'Synthetic approved review',findings:[]});
  b.reviews=[{round:1,status:'approved',subjectSha:b.sha}];
  b.reviewLedger={rounds:[{round:1,verdict:'approved',subject_sha:b.sha,review_sha256:createHash('sha256').update(report).digest('hex')}]};
  b.reviewReports={'claude-review-1.json':report};b.phase='blocked';b.failureCode='controller-invariant';
  b.externalReview={status:'published',subjectSha:b.sha,feedbackFingerprint:fingerprint};
  const legacy={status:'failed',subjectSha:b.sha,claudeRound:1,feedbackFingerprint:fingerprint,nonce:'legacy-spent',reservedAt:'2026-10-17T00:00:00.000Z'};
  b.codexFinalReview=structuredClone(legacy);
  const recover=async()=>{const current=f.remote.batches[0];return f.handoff.recover(81,{action:'release-qa-reservation',expectedSha:current.sha,token:current.codexFinalReview.nonce,reason:'Synthetic authorized infrastructure recovery',authorizationRef:'test:trusted-host'});};
  await recover();let calls=0;
  for(let i=0;i<3;i++) {
    const current=structuredClone(f.remote.batches[0]);
    const args={repo,batch:current,gh:f.github,communication:{mirrorFeedback:async()=>{},publishState:async()=>{}},
      workspace:{prepare:async()=>{},execute:async()=>assert.fail('no implementation'),finalQa:async()=>{calls++;throw new Error('synthetic infrastructure failure');}},
      save:async()=>{const store=f.github.createStateStore();const state=await store.load();state.batches[0]=structuredClone(current);await store.save(state);},
      block:async()=>{},report:async()=>{}};
    if(i<2)await assert.rejects(externalReviewStep(args),/synthetic infrastructure failure/);
    else await externalReviewStep(args);
    if(i<2)await recover();
  }
  const final=f.remote.batches[0];assert.equal(calls,2);assert.equal(final.implementation.length,1);
  assert.deepEqual(final.qaHistory[0],legacy);assert.equal(final.qaHistory.length,3);
  assert.equal(new Set(final.codexFinalQaInfrastructure.attempts.map(x=>x.nonce)).size,3);
  assert.equal(final.codexFinalReview.failureCode,'final-qa-infrastructure-exhausted');
});
''')

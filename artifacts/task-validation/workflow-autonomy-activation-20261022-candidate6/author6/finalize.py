from pathlib import Path
import hashlib,json,re,difflib,stat,datetime
p=Path('/tmp/clinicos-autonomy-activation-20261022');a=p/'author6';s=p/'source6';b=p/'source5';q=p/'independent-qa5'
def meta(f):
 data=f.read_bytes();return {'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
def write(name,value): (a/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
r=json.loads((a/'reservation.json').read_text());before=json.loads((p/'source6-before.json').read_text());allowed=json.loads((a/'allowlist.json').read_text());assert meta(a/'task-contract.md')['sha256']==r['contractSha256'];assert meta(p/'source6-before.json')['sha256']==r['snapshotSha256'];assert r['attempt']==6 and r['nonce']=='43647508-76e7-40c3-85a4-4e88dcab8f4d';assert meta(q/'seal.json')['sha256']==r['independentQa5SealSha256'];changes=[];current={};patch=[]
for n,m in before.items():
 f=s/n;assert not f.is_symlink() and stat.S_ISREG(f.lstat().st_mode),n;assert meta(b/n)==m,n;assert bool(f.stat().st_mode&0o111)==bool((b/n).stat().st_mode&0o111),n
 current[n]={**meta(f),'physicalMode':oct(stat.S_IMODE(f.stat().st_mode)),'gitMode':'100755' if f.stat().st_mode&0o111 else '100644'}
 if current[n]['sha256']!=m['sha256']:
  assert n in allowed,n;changes.append(n);patch.extend(difflib.unified_diff((b/n).read_text().splitlines(True),f.read_text().splitlines(True),fromfile='a/'+n,tofile='b/'+n))
assert len(before)==138 and len(changes)==10
for f in s.rglob('*'):
 if f.is_file():assert str(f.relative_to(s)) in before,str(f)
for directory in [q,p/'author5']:
 seal=json.loads((directory/'seal.json').read_text())
 for n,m in seal['files'].items(): assert meta(directory/n)==m,(str(directory),n)
previous=json.loads((p/'author5/source-manifest.json').read_text());cumulative=sorted(set([x['path'] for x in previous['files']]+changes));assert len(cumulative)==22
manifest={'source':str(s),'attempt':6,'baseline':str(b),'gitParent':r['gitParent'],'publishedSourceHead':r['sourceHead'],'allowedPaths':allowed,'attemptDeltaPaths':changes,'actualDeltaCount':len(changes),'cumulativePaths':len(cumulative),'cumulativeCodeAndTests':20,'docs':2,'baselineFiles':138,'beforeManifestRawSha256':r['snapshotSha256'],'outsideAttemptScopeUnchanged':True,'baselineSource5Immutable':True,'regularFilesAndGitExecutableBitsVerified':True,'dependencySymlink':r['dependencyLink'],'files':[{'path':n,**current[n],'source5Sha256':before[n]['sha256'],'changedInAttempt6':n in changes} for n in cumulative],'all138BeforeAfter':{n:{'before':before[n],'after':current[n]} for n in before}}
write('source-manifest.json',manifest);write('source-after-all.json',current);(a/'source.patch').write_text(''.join(patch))
for name in ['operator-ownership.mjs','contracts.mjs','external-review.mjs']:
 n='agent-team/src/bug-pipeline/'+name;(a/('diff-'+name+'.txt')).write_text(''.join(difflib.unified_diff((b/n).read_text().splitlines(True),(s/n).read_text().splitlines(True),fromfile='a/'+n,tofile='b/'+n)))
runs={}
for label in ['original-probes-first','focused-final','original-probes-final','ambiguous-binding-pre-fix','focused-final2','original-probes-final2']:
 run=json.loads((a/(label+'.json')).read_text());log=(a/(label+'.log')).read_text();run['counts']={key:int(re.search(r'^# '+key+r' (\d+)$',log,re.M).group(1)) for key in ['tests','pass','fail','cancelled','skipped','todo']};runs[label]=run
assert runs['focused-final2']['exitCode']==0 and runs['focused-final2']['counts']['tests']==724 and runs['focused-final2']['counts']['fail']==0
assert runs['original-probes-final2']['exitCode']==0 and runs['original-probes-final2']['counts']['tests']==4 and runs['original-probes-final2']['counts']['fail']==0
syntax=json.loads((a/'syntax-final.json').read_text());assert syntax['passed']==8 and syntax['failed']==0
write('test-results.json',runs)
write('failure-history.json',[
 {'classification':'inherited genuine independent QA5 source findings','status':'PRESERVED_IMMUTABLE','filesVerified':44,'sealSha256':r['independentQa5SealSha256'],'originalOutcome':'715 scoped testsPASS; novel1PASS3FAIL; three confirmed medium findings; initial external fixture omission preserved separately in QA5','evidence':'../independent-qa5/findings.json and original probe logs; all sealed bytes verified unchanged'},
 {'classification':'additional same-cause F3 omitted-binding causal regression','evidence':'ambiguous-binding-pre-fix.log','counts':runs['ambiguous-binding-pre-fix']['counts'],'exitCode':runs['ambiguous-binding-pre-fix']['exitCode'],'harnessError':False,'detail':'First implementation safely blocked missing nonce but treated omitted subjectSha as nonmatching; actual final QA became ready. Same table extended to missing subjectSha/Claude-round/feedback/timestamp; final implementation requires affirmative known differing identity to ignore a spent record, otherwise blocks ambiguous history. Final724 suite passes all five omitted-field cases.'},
])
inputs=['author6/task-contract.md','author6/allowlist.json','author6/reservation.json','source6-before.json','author5/seal.json','author5/source-manifest.json','independent-qa5/seal.json','independent-qa5/report.md','independent-qa5/findings.json','independent-qa5/external-cas-probe.mjs','independent-qa5/recovery-budget-probe.mjs','independent-qa5/malformed-takeover-probe.mjs','independent-qa5/recovery-route-probe.mjs','independent-qa5/handoff-fixture.mjs','independent-qa5/pipeline-fixture.mjs']
write('read-receipts.json',{'inputs':{n:meta(p/n) for n in inputs},'nonce':r['nonce'],'stateCommit':r['stateCommit'],'immutableBaselineFilesVerified':138,'qa5SealedFilesVerified':44,'author5SealedFilesVerified':62,'probeAdaptation':'Only production import prefix ../qa-source5/ to ../source6/; original assertions and fixture logic unchanged. probe-adaptation.patch retained.','historicalPublicPacketProof':'Inherited from sealed QA5 historical integrity receipt; no duplicate live/Git audit or writes performed.'})
observations={n:json.loads((a/(n+'.json')).read_text()) for n in ['external-cas-observations','recovery-budget-observations','malformed-takeover-observations','recovery-route-observations']}
assert observations['external-cas-observations']['remoteAEqualsFrozen'] and observations['external-cas-observations']['resultAEqualsFrozen'] and observations['external-cas-observations']['phaseB']=='ready'
assert observations['recovery-budget-observations']['newQaCallbackInvocations']==2 and observations['recovery-budget-observations']['totalIncludingRetainedLegacy']==3
assert observations['malformed-takeover-observations']['intakeCalls']==0 and observations['malformed-takeover-observations']['queueCalls']==0
results={'status':'IMPLEMENTED_AWAITING_INDEPENDENT_QA','attempt':6,'model':'gpt-6.1-sol','nonce':r['nonce'],'source':str(s),'gitParent':r['gitParent'],'publishedSourceHead':r['sourceHead'],'actualDeltaPaths':changes,'actualDeltaCount':10,'allowedCount':11,'cumulativePaths':22,'actualFinalNativeSuites':runs['focused-final2']['counts'],'actualOriginalQa5ProbesFinal':runs['original-probes-final2']['counts'],'syntax':{'passed':8,'failed':0},'findingsAddressed':['QA5-F5','QA5-F3','QA5-F1'],'originalAssertionsUnchanged':True,'observations':observations,'authorFailures':'One additional same-cause F3 causal FAIL preserved; no harness error. See failure-history.json.','priorNativeImplementationEntriesPreservedByScope':4,'actualClaude1ChangesRequestedPreserved':True,'privateImplementation5FailedPreserved':True,'independentQaApprovalClaimed':False,'liveActions':False,'sourceFrozen':True}
write('results.json',results)
report='''# Continuation6 — implemented, awaiting independent QA

Three confirmed QA5 gaps have source fixes and causal evidence. This is author evidence only: independent QA6, publication/adoption, actual native CI, genuine Claude2, fresh final Codex, protected merge and activation remain root-owned and pending. No deployment, clinical resolution or issue closure is claimed.

## Bound scope and history

Reservation43647508-76e7-40c3-85a4-4e88dcab8f4d at canonical2e7f8e8dcfdd14c58c02468ef688a6222a99f1e5 preceded this author invocation and source edits. Contract and raw UTF8 snapshot digests match; all138 initial source6 files were byte-identical to immutable source5. The final snapshot has10 actual deltas within11 allowed paths:3 production modules,5 tests and2 docs. The allowed production pipeline.mjs required no change because both existing callers already catch typed ownership and reload. Cumulative current scope remains22 paths. No extra source file, symlink substitution or Git executable-mode change occurred; physical modes are reported as copied, without chmod.

Private code6 must descend from private source5 commit67c53efe45e2d5e2ffca228d3bf6639029bb27c5, itself descendant of current published PR504 headce7993a781bd2d378a1ca3ad2956b2c3606b4fe2. Root's reserved typed budget5→6 is not a code/review approval. Actual native4 implementation entries and genuine Claude1 changes-requested remain untouched; private implementation5 remains failed after QA5. Source5 was not published or adopted. No reset, new PR or grant was manufactured here. Source5's author715/syntax13 PASS is scoped historical evidence; QA5's later3 failures remain genuine.

## QA5-F5 — preserve typed external ownership loss until canonical reload

externalReviewStep now propagates review-operator-owned instead of converting it to a returned skip that concealed ownership loss from the caller. Both actual production callers are in runPipeline; their existing recoverOwnership paths reload canonical state, discard unsaved A, and resolve subsequent B by ID. The external correction catch also leaves an already reserved running attempt unchanged on this finite ownership code. Other failures retain their previous classification and fatal/persistence behavior.

The exact original QA5 external native409 probe is reused with only production import-path adaptation. It adds A.operatorCoordination plus remote A data and a valid bound partial handback during A's first QA reservation. Final observation: no error, A byte-identical both remotely and in returned state, B alone executes finalQa and reaches ready. No local dirty A enters B's save. Additional repository tests cover propagation at mirror/publication/comment handoff/correction, no owned block/status/model, a retained running tombstone and canonical reload before independently disposing closed B. Existing native observer/checkFreshOwnership APIs, definite409 classification, unowned CAS/integrity/auth/uncertain-write failures and old internal F5 tests are unchanged and pass.

## QA5-F3 — reconcile original inference intent across recovery collections

finalQaSpend binds one allowance to exact SHA, Claude round and feedback fingerprint. It counts nonce-deduplicated spent/reserved inference intents across the infrastructure ledger, captured current pointer, qaHistory and codexFinalReviewHistory. Existing historical records and ledger entries stay unchanged; imported entries retain their original fields plus provenance, and repeated copies of one nonce count once. Actual recovered running leases count as reserved intents; waiting-checks and pre-QA blocked metadata alone do not count. Explicit differing identities remain outside the current allowance.

A matching spent record with no reliable nonce/timestamp/binding is not assumed to be a new identity: ambiguous history blocks inference and code correction. This same-cause check first reproduced a missing-subjectSha failure after the initial scoped724 PASS; its actual FAIL remains preserved. The final table covers missing nonce, SHA, round, fingerprint and reservation time, while known other identities still proceed. No allowance is erased or refunded.

The exact original actual typed release-qa-reservation probe now retains one legacy failure in qaHistory and permits only two new failing finalQa invocations, total3. Its implementation count remains1. The repository regression also uses the original native handoff recovery/store with an explicitly synthetic trusted-host verifier, then checks ledger/history dedup and the same total. Original ordinary-resume refusal and specialized authorized recovery success both remain unchanged; no production handoff/auth/default verifier was modified. Final QA findings alone still reserve code corrections; infrastructure or ambiguous history never calls workspace.execute. Already-running sessions and exhausted allowances retain their original ownership/stop behavior.

## QA5-F1 — validate takeover container and explicit active type

validOperatorTakeover checks the object/container, explicit active boolean, nonce type and any handback shape. automationPaused uses the same check directly, so malformed truthy and falsy active values cannot escape via Boolean coercion. contracts.validateState rejects invalid takeover data before intake. Legitimate active:false and legacy budget-audit records without active remain valid and do not invent a takeover. An active legacy takeover without handback remains paused; nonce/actor/time handback binding and canonical actor audit semantics are unchanged.

The exact malformed-string-active probe now observes automationPaused:true, intake0, queue0 and invalid operator takeover. Tables cover string true/false/empty, numeric0/1, null, undefined, arrays/objects and malformed takeover containers. Positive inactive/audit and valid bound new-unclaimed workflow cases pass. No permission is inferred from an audit actor string.

## Final validation and limits

Final combined11 relevant/native suites:724/724 PASS,0 skipped/cancelled. Exact original QA5 three findings plus supported-recovery control:4/4 PASS on final source, with only import-prefix adaptation and no assertion weakening. Syntax8/8 PASS. These are separate validations; repeated runs are not added to an inflated unique-test total. Exact commands, exit codes, logs and source hashes are retained.

Original QA5 scripts/logs and first fixture failure remain immutable under their verified44-file seal; author5's62-file seal also verifies unchanged. Historical public packet/subject proof is inherited from sealed QA5 receipts, not re-audited with live calls. All three original causal failures are retained there; this attempt additionally preserves the omitted-binding F3 causal failure. No author6 harness failure occurred. Earlier first-stage PASS runs remain available without being portrayed as proving the later extended assertion.

Only offline injected boundaries and owned existing test fixtures ran, under fixed Node22, isolated TMPDIR, disabled global Git config/hooks and disallowed Git network protocols. VM modules replay original pipeline/external source with projection/process seams injected; no copied controller decision logic replaces those functions. No network/API/provider/model/credential/DB/browser/Git/canonical/label/deploy write occurred, and no clinical E2E rerun was needed. Root must independently validate this frozen result before any live continuation.
'''
(a/'report.md').write_text(report)
write('STOP.json',{'status':'STOP','reason':'Continuation6 three QA5 findings implemented and final source-bound validation complete. Await independent QA6; no approval/publication/activation claimed.','nonce':r['nonce'],'source':str(s),'sourceEditsStopped':True,'stoppedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
seal={'status':'IMPLEMENTED_AWAITING_INDEPENDENT_QA','nonce':r['nonce'],'files':{f.name:meta(f) for f in sorted(a.iterdir()) if f.is_file() and f.name!='seal.json'},'excluded':['owned-tmp/ temporary synthetic fixture files'],'sourceManifestSha256':meta(a/'source-manifest.json')['sha256']};write('seal.json',seal)
print(json.dumps({'status':results['status'],'sourceManifestSha256':meta(a/'source-manifest.json')['sha256'],'sealSha256':meta(a/'seal.json')['sha256'],'actualDeltaPaths':len(changes),'cumulativePaths':len(cumulative),'sourceFiles':len(current),'sealedFiles':len(seal['files'])},indent=2))

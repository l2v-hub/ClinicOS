from pathlib import Path
import hashlib,json,re,datetime
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'standalone-release-probe1';sha=lambda b:hashlib.sha256(b).hexdigest();v=json.loads((q/'reservation.json').read_text());obs=json.loads((q/'observations.json').read_text());source=r/'qa-source3';m=json.loads((r/'combined3-source-manifest.json').read_text())
for n,d in m.items():assert sha((source/n).read_bytes())==d['sha256']
p=r/'independent-qa3/seal.json';assert sha(p.read_bytes())=='d9ad31f41c6654abba35f9d5bc747e5932814a8653a2be0b27e2de4d44c94693'
for n,d in json.loads(p.read_text())['files'].items():assert sha((p.parent/n).read_bytes())==d['sha256']
a,b=obs;assert a['labels']==['claude-review-ready'];assert sum(x['operatorTakeoverActive'] for x in a['nativeStoreReads'])==2;assert b['adapterGuardChecked'] and len(b['merges'])==1 and b['mainResult']==0;assert len(b['readStates'])==10
counts={k:int(n) for k,n in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$',(q/'probes.log').read_text(),re.M)};assert counts['tests']==2 and counts['fail']==2 and counts['pass']==0
findings=[{'id':'S1','status':'CONFIRMED','severity':'high','source':'agent-team/src/bug-pipeline/standalone-review.mjs','lines':[619,732,741,852],'caller':{'source':'agent-team/src/bug-pipeline/pipeline.mjs','lines':[109,120]},'title':'Automatic standalone projection ignores fresh observed takeover outside unchanged subject','actualChain':a['automaticChain'],'observed':a,'expected':'Automatic controller must stop before projection after its own fresh store loads observe global pause or newly protected subject. Preserve explicitly authorized SHA-bound read-only handoff compatibility.','scope':'Observed one label write; no model/deploy/merge/clinical proof claimed'},{'id':'R1','status':'CONFIRMED','severity':'high','source':'agent-team/src/bug-pipeline/release.mjs','lines':[380,609,814,1304,1354],'title':'Automatic workflow_run release loses ownership context after candidate selection','actualChain':b['automaticChain'],'observed':b,'expected':'Automatic provenance must propagate from workflow_run selection through native release entry and all fresh guards, preventing merge/provider writes when current state is owned. Existing explicit maintainer release remains a distinct supported path.','scope':'Observed one synthetic merge through actual automatic main and supplied native guard callback; no actual merge/provider/deploy occurred'}]
(q/'findings.json').write_text(json.dumps(findings,indent=2)+'\n')
results={'status':'FAILED VALIDATION','sourceSha':v['sourceSha'],'reservationNonce':v['nonce'],'findings':findings,'hypotheses':{'standaloneAutomaticProjection':'CONFIRMED','automaticReleaseAfterSelection':'CONFIRMED'},'finalSafetyTests':counts,'firstRun':{'tests':2,'pass':0,'fail':2,'harnessFailures':0,'preserved':'first-*'},'retest':'Same two expected-safety assertions, strengthened read instrumentation and real supplied release callback guard invocation; still2 source failures,0 harness failures','harnessFailures':[],'sourceEdits':False,'all138SourceHashesUnchanged':True,'priorQa3SealUnchanged':True,'priorQa3Scope':'588+23 source tests PASS retained unchanged; these two targeted uncovered races are additional scope and block activation','liveWrites':False,'modelOrProviderCalls':0,'actualNetwork':False,'visual':'N/A bounded control-plane diagnostic; prohibited by contract','pending':'Root must reserve corrective implementation before actual Claude, merge or activation. No issue closure/deployment claim.'}
(q/'results.json').write_text(json.dumps(results,indent=2)+'\n')
report=f'''# Independent targeted safety diagnostic

Verdict: **FAILED VALIDATION**. Both hypotheses are **CONFIRMED** against exact immutable source `{v['sourceSha']}`. No implementation source was edited.

Reservation `{v['nonce']}` at `{v['stateCommit']}` preceded the diagnostic. Original QA3 remains immutable and honestly scoped:588 focused tests and23 probes passed, but the two new automatic paths below were not exercised by that earlier evidence. Do not activate or treat native CI alone as resolution of these findings.

| Hypothesis | Actual function chain | Observation | Result |
| --- | --- | --- | --- |
| S1 | runPipeline → finalizeStandaloneSubject → native controller.publishState → current → handoff.load | Initial pipeline sees unowned subject. Native controller subsequently loads active global takeover twice, subject bytes unchanged, yet adds `claude-review-ready`; pipeline completes without error/model | CONFIRMED |
| R1 | Original main workflow_run → selectAutoReleaseBatch → releaseBatch → freshReleaseGuard → merge callback | First state read is unowned. Reads2–10 expose takeover. The exact automatic main still invokes one synthetic merge for approved SHA and returns0; the synthetic merge also invokes the actual supplied native guard | CONFIRMED |

S1 locations: `standalone-review.mjs:619`, `:732`, `:741`, `:852`; initial automatic caller `pipeline.mjs:109`/`:120`. The selector correctly checks its initial snapshot, but native standalone current/load guards compare subject identity and native PR state without considering new global ownership outside that subject. This is an observed fresh-read violation, not an atomic cross-resource requirement.

R1 locations: `release.mjs:1304` automatic selection, `:1354` native release call, `:609` initial native load, `:380` freshReleaseGuard and `:814` merge. Automatic ownership context is not carried to the later release entry/guards. The reproduction executes actual automatic workflow_run main, rather than calling explicit releaseBatch and inferring behavior from that API. A fix must preserve the separate explicitly authorized maintainer release path.

## Test method and retained output

Two focused original-function safety assertions were run: **0PASS/2FAIL**, zero harness failures. The first proof is preserved under `first-*`. A justified bounded retest strengthened native read instrumentation and invoked the release callback guard at the synthetic merge boundary, as the real adapter does. Both unchanged expected-safety assertions again failed: **0PASS/2FAIL**, zero harness failures. This is not four different defects or a full-suite rerun.

`probes.mjs` imports actual standalone/pipeline functions unchanged. The copied fixture contains only synthetic fixture definitions and injected GitHub transport, not product implementation. Actual release main has no dependency-injection argument, so Node's SourceTextModule evaluates its exact original source bytes with only GitHub transport factory, process-runner factory and filesystem imports replaced at the side-effect boundary. Pure policy/review/ownership imports are actual modules. No release logic, branch condition, source predicate, approval or guard was rewritten. VM's process/env are synthetic and no subprocess is permitted. See command.json, observations.json and probes.log.

The source tree's138 file hashes and original QA3's29 sealed artifacts were verified before and after. HOME/home/CODEX_HOME were not modified. No actual GitHub/network/provider/model/Git/canonical/DB/browser/scheduler operation occurred. No raw canonical state, credential or clinical payload was printed. All status/merge effects here are offline synthetic observations only; no real deployment, cleanup, clinical resolution or issue closure is claimed.

Root owns the next reserved corrective scope, later independent gate, native/genuine review, protected merge and activation. The previous6 native PASS results remain their actual history, not evidence these newly reproduced races are absent.
'''
(q/'report.md').write_text(report);(q/'validation-report.md').write_text(report);(q/'source-after.json').write_text(json.dumps({'sourceSha':v['sourceSha'],'sourceFilesVerified':138,'priorQa3SealSha256':sha(p.read_bytes()),'priorQa3FilesVerified':29,'noSourceEdits':True},indent=2)+'\n');(q/'STOP.json').write_text(json.dumps({'status':'FAILED VALIDATION','sourceSha':v['sourceSha'],'nonce':v['nonce'],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'findings':['S1','R1'],'sourceEdits':False,'liveOperations':False,'rootCorrectionRequired':True},indent=2)+'\n')
files={}
for p in sorted(q.iterdir()):
 if p.name=='seal.json' or not p.is_file():continue
 b=p.read_bytes();files[p.name]={'sha256':sha(b),'bytes':len(b)}
(q/'seal.json').write_text(json.dumps({'status':'FAILED VALIDATION','sourceSha':v['sourceSha'],'nonce':v['nonce'],'files':files},indent=2)+'\n')
for n,d in files.items():assert sha((q/n).read_bytes())==d['sha256']
print(json.dumps({'status':'FAILED VALIDATION','hypotheses':{'S1':'CONFIRMED','R1':'CONFIRMED'},'safetyTests':counts,'harnessFailures':0,'sealedFiles':len(files),'sealSha256':sha((q/'seal.json').read_bytes())}))

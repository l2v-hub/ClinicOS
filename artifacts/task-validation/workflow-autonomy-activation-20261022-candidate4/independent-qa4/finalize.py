from pathlib import Path
import hashlib,json,re,datetime
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa4';sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda f:json.loads((q/f).read_text());v=read('reservation.json');before=read('source-before.json')
def counts(f):return{k:int(n) for k,n in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$',(q/f).read_text(),re.M)}
suite=counts('focused.log');assert(suite['tests'],suite['pass'],suite['fail'])==(689,689,0)
probes={}
for name,expected in [('original15',15),('additional8',8),('original-s1-r1',2),('new-probes',6),('handoff-probes',2)]:
 p=counts(name+'.log');assert(p['tests'],p['pass'],p['fail'])==(expected,expected,0);probes[name]=p
for n,d in before['snapshotManifest'].items():assert sha((r/'qa-source4'/n).read_bytes())==d['sha256']
for seal in before['seals']:
 p=r/seal['folder']/'seal.json';assert sha(p.read_bytes())==seal['sha256']
 for n,d in json.loads(p.read_text())['files'].items():assert sha((p.parent/n).read_bytes())==d['sha256']
results={'schemaVersion':1,'status':'verified','qaVerdict':'READY FOR CODEX QA','sourceSha':v['sourceSha'],'gitParent':v['gitParent'],'baseSha':v['baseSha'],'reservationNonce':v['nonce'],'independent':True,'findings':[],'focusedTests':suite,'focusedFiles':read('focused-command.json')['testFiles'],'probeGroups':probes,'novelOfflineProbes':{'tests':33,'pass':33,'fail':0,'skip':0},'syntax':{'files':18,'pass':18,'fail':0},'integrity':read('source-after.json'),'originalFindingsRetested':{'F1':'PASS unchanged QA2 original assertion','F2':'PASS unchanged QA2 original assertion','S1':'PASS original actual pipeline/native controller reproduction','R1':'PASS original exact-source VM automatic workflow_run/native callback reproduction'},'inherited':{'author4SixFileTests':538,'author4OriginalReproductions':2,'author4Syntax':9,'source3Qa':'588+23 PASS within earlier scope; later S1/R1 diagnosticFAILED retained','source3ActualNative':'6 PASS on9a6cc35c only; not candidate4 native approval','clinicalE2E':'unchanged/not rerun'},'harnessFailures':[],'harnessReadDiscovery':'An absent guessed manifest path was corrected by reading the actual named manifest; no test failure or source edit','security':{'status':'PASS','ownership':'Observed fresh automatic context retained through native read/save/live/publication/merge/dispatch/completion guards; explicit paths separate','asyncIsolation':'Concurrent explicit/automatic and exception tests pass on prebuilt native controller','authorization':'Explicit unauthorized/stale requests still rejected; current authorized Max/root/manual paths retained','history':'22 old subject hashes/typed budgets/history and144 previously published packet files unchanged; uncertain intent/running reservation tombstones retained','secretsPhi':'No source secret/PHI additions; synthetic fixtures and whitelisted runner environment; no actual credential access','dependenciesConfig':'Built-in AsyncLocalStorage only; no new package, workflow, sandbox, clinical schema or provider setting changes'},'visual':{'status':'N/A','reason':'Explicit bounded control-plane QA4 contract; browser prohibited; no runtime UI change'},'sourceEdits':False,'actualNetwork':False,'liveWrites':False,'realProviderOrModelCalls':0,'pending':['native required CI on new actual published SHA','genuine Claude review','fresh final Codex source review','native independent human trust-root approval and normal protected merge','explicit automation handback/activation and actual event proof','personal worker readiness','later verified deployment and issue closure'],'proofStop':'Independent source/harness/proof only'}
(q/'findings.json').write_text('[]\n');(q/'results.json').write_text(json.dumps(results,indent=2)+'\n')
report=f'''# Independent QA4

Verdict: **READY FOR CODEX QA**. Source validation **verified** for `{v['sourceSha']}`, parent published `{v['gitParent']}`. No actionable findings. This is an independent source/harness/proof stop, not native/provider approval or automation activation.

Reservation `{v['nonce']}` at canonical `{v['stateCommit']}` preceded this session. All implementation and prior proof files remained immutable.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract/identity | PASS:138 frozen context files,20 cumulative code/test/docs Git blob bindings,9-file actual delta within reserved12 paths;144 old published packet files retain hashes/blob bindings and declared100644 mode | task-contract.md, reservation.json, source-before.json |
| 1 Diff/security review | PASS: complete new9-file delta plus retained cumulative ownership/review/release controls and unchanged docs | candidate4-delta.diff, independent-source.diff, findings.json |
| 2 Fresh focused suites | **689/689 PASS**, ten requested files,0fail/skip/cancelled, run once | focused.log, focused-command.json, execution-policy.json |
| 2 Original QA2 probes | **15/15 PASS**, safety assertions retained | original15.mjs/log, probe-results.json |
| 2 QA3 integration probes | **8/8 PASS** | additional8.mjs/log |
| 2 Original S1/R1 | **2/2 PASS**, actual native functions and original-source VM main, safety assertions unchanged | original-s1-r1.mjs/log, observations.json |
| 2 New native negatives | **6/6 PASS**, context/provenance/late guard/tombstone/explicit compatibility | new-probes.mjs/log, new-command.json |
| 2 New native handoff negatives | **2/2 PASS**, automatic CAS rebase guard and explicit authorization | handoff-probes.mjs/log, handoff-command.json |
| 2 Static/integrity | **18/18 syntax PASS**;420 final source/old-packet file checks;22 supplied historical subject hashes match; prior proof seals unchanged | syntax.json, source-after.json, historical-subject-integrity.json |
| 3 Visual/clinical | N/A visual under explicit control-plane contract; browser prohibited; unchanged clinical E2E inherited/not rerun | task-contract.md |
| 4 Security | PASS within scope; automatic ownership, explicit authorization, safe logs, no package/config/provider weakening | results.json and tests above |

Total independent offline probes: **33/33 PASS**, separate from689 suite tests and18 syntax checks. Author4's538 six-file tests,2 original reproductions and9 syntax checks are inherited provenance, not fresh QA results.

## Previously confirmed findings

The original F1 successful triage CAS and F2 automatic batch communication assertions remain unchanged and pass. Original S1 now stops after the native automatic pipeline's fresh controller ownership load observes takeover: no label, block, save or model effect. Original R1 now carries actual workflow_run provenance into native releaseBatch and its fresh callback guards: initial unowned selection cannot authorize later merge after observed takeover.

The original S1/R1 proof imports real pipeline and standalone functions. Its release VM evaluates the exact original release module bytes with only transport/process/filesystem boundaries injected. No selector, release predicate, approval, guard or mode logic is replaced. All observed effects are synthetic.

Native invocation-local AsyncLocalStorage keeps automatic context across awaited/nested methods of prebuilt controllers. Independent new tests verify concurrent explicit publication remains allowed for its trusted current-SHA path, rejected automatic publication cannot leak mode to later explicit calls, and an exception cannot retain automatic mode. Ordinary unowned automatic publication still works. New ownership discovered during final authorization stops publication; explicit stale PR and revoked authorization remain rejected.

New native release probes invoke the supplied fresh merge callback guard, retain a pre-existing merge reservation, and stop on late takeover without block/comment/save. An exact dispatch guard observes ownership loss and retains its uncertain intent without converting that abort into a durable generic release block. Explicit manual release remains separate: stale SHA fails and a current authorized revision succeeds. A real automatic comment-handoff CAS rebase callback rejects a newly protected identity before commit/comment; the default explicit batch request/claim still requires current authorization.

The newly added comment-channel opt-in and per-operation guards do not transfer ownership or reset any budget/history. Cross-resource GitHub reads and ledger CAS remain bounded observations, not an atomic transaction guarantee.

## Integrity and execution limits

The20 code/test/docs paths are distinct from144 historical public packet paths. Their combined164 existing changed paths must not be misreported as164 new production files; a future current packet must preserve all actual bindings.144 old packet bytes match the prior published9a6 manifest and their declared Git blobs/modes. The unchanged CLI and standalone-contract test bytes match candidate3.

All22 actual historical subjects match the supplied canonical ownership projection using its sorted ASCII compact hash encoding. Original QA2 failure, QA3 earlier scoped PASS, later S1/R1 failure and author4 histories/seals remain unchanged. Earlier source3 six native checks on9a6 remain true history and do not approve candidate4. No genuine Claude request/adoption is inferred from metadata.

No test or harness failure occurred. Initial read discovery guessed an absent manifest name; the actual named manifest was then verified, with this read error recorded in harness-history.json. Assertions/skips/timeouts were not relaxed. Original probes were adapted only to the private source import path and their separate output filename.

No implementation source, real GitHub/canonical state, network/provider/model, credentials, clinical DB, browser, scheduler, deployment or issue status was changed. The runner environment did not assign HOME/home/CODEX_HOME. Existing repository auth tests pass synthetic environment objects; an existing standalone test gives its disposable local Git fixture a fixture-private child HOME. QA did not modify those tests or the user's environment; no real user/canonical Git operation ran. Suite-owned synthetic Git commands remained local; the orchestration disabled system/global configuration, hooks and external protocols where inherited by children. The fixture source/logs are retained for this distinction.

Actual full-repository required native CI on the newly published SHA, genuine Claude review, fresh final Codex QA, any independent human trust-root approval, ordinary protected merge, handback/activation and authentic event probe remain root responsibilities. Personal-worker readiness, deployment and issue closure are separate subsequent gates. No complete clinical flow or live automation success is claimed here.
'''
(q/'report.md').write_text(report);(q/'validation-report.md').write_text(report)
(q/'STOP.json').write_text(json.dumps({'status':'READY FOR CODEX QA','sourceValidation':'verified','sourceSha':v['sourceSha'],'nonce':v['nonce'],'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'findings':[],'sourceEdits':False,'liveOperations':False,'laterNativeReviewAndActivationPending':True},indent=2)+'\n')
files={}
for p in sorted(q.iterdir()):
 if p.name=='seal.json' or not p.is_file():continue
 b=p.read_bytes();files[p.name]={'sha256':sha(b),'bytes':len(b)}
(q/'seal.json').write_text(json.dumps({'schemaVersion':1,'status':'verified','qaVerdict':'READY FOR CODEX QA','sourceSha':v['sourceSha'],'nonce':v['nonce'],'files':files},indent=2)+'\n')
for n,d in files.items():assert sha((q/n).read_bytes())==d['sha256']
print(json.dumps({'status':'verified','sourceSha':v['sourceSha'],'findings':[],'suite':suite,'probes':{'tests':33,'pass':33,'fail':0},'syntax':18,'sealedFiles':len(files),'sealSha256':sha((q/'seal.json').read_bytes())}))

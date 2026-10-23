from pathlib import Path
import json,hashlib,subprocess
r=Path('/tmp/clinicos-railway-official-host-continuation4-20261022');q=r/'independent-qa';s=r/'qa-source';f=json.loads((r/'source-freeze.json').read_text())
after={str(p.relative_to(s)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'mode':oct(p.stat().st_mode&511)} for p in sorted(s.rglob('*')) if p.is_file()};assert after==json.loads((q/'source-before.json').read_text());(q/'source-after.json').write_text(json.dumps(after,indent=2))
entries=subprocess.check_output(['git','ls-tree','-r',f['sourceSha']],cwd='/workspace/ClinicOS',text=True);tree={line.split('\t')[1]:line.split()[2] for line in entries.splitlines()};proof=[]
for p in sorted(s.rglob('*')):
 if p.is_file():
  b=p.read_bytes();n=str(p.relative_to(s));blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();exact=tree[n]==blob
  if not exact:
   assert n=='scripts/automation/setup-claude-review-windows.ps1';original=subprocess.check_output(['git','show',f['sourceSha']+':'+n],cwd='/workspace/ClinicOS');assert original==b.replace(b'\r\n',b'\n')
  proof.append({'path':n,'exactGitBlob':exact,'binding':'exact' if exact else 'CRLF checkout normalization only; non-runtime Windows helper'})
(q/'snapshot-git-bindings.json').write_text(json.dumps(proof,indent=2))
(q/'readreceipts.json').write_text(json.dumps({'reservationNonce':'97660da3-3367-4b9e-bee0-7a9d03832f5d','canonicalReservation':'14a45a05eb1fcec73f173711b185d6d2276510e5','sourceSha':f['sourceSha'],'reviewed':['contract/reservation/source-freeze','complete six-file Git diff','all nine frozen context hash/byte bindings','whole three production file byte-equivalence against baseline except exact endpoint literal','configure bounded reader/client','deployment bounded reader/fetch/client/inspectDemo','inspector main/identity transport/projection/context','official host analysis report','author seal/results/commands/syntax status/focused test summary/source-after'],'snapshotBindings':'164 exact Git blobs;1 unchanged CRLF Windows helper normalized-equivalent','authorSealAllFiles':'PASS'},indent=2))
(q/'commands.md').write_text('''# Commands

Read contract, reservation, source-freeze, complete Git diff and author sealed evidence/official host analysis. Read-only Git diff/show/ls-tree; no writes/fetch/API.
Python: source165-file SHA256/bytes/mode inventories before/after;9 freeze bindings; author seal SHA256 and every listed file hash+bytes;659PASS/0FAIL summary and3syntax status; six author source-after hashes; full production baseline byte comparison.
Node22 /tmp/clinicos-node22-native12/node_modules/node/bin/node cases.mjs > cases.log 2>&1 (exit0,16/16PASS). All requests fake.
Additional full snapshot Git-blob assertion initially failed for Windows helper CRLF conversion; preserved initial-binding-probe-failure.json. Followup line-ending-proof.json verifies exact LF-normalized equality.164 other blobs exact. No source change or test expectation weakening.
Full659 suite deliberately not repeated; no browser/install/network/provider/credential/source/canonical actions.
''')
report='''# Continuation4 independent QA

**READY FOR CODEX QA** — zero actionable findings at any severity within this bounded host-alignment scope.

| Phase | Result | Evidence |
|---|---|---|
| Contract/source bindings | PASS | task-contract.md; reservation.json; source-before/after.json; snapshot-git-bindings.json |
| Static full delta review | PASS | source.diff; static-proof.json; readreceipts.json |
| Tests/runtime fake transport | PASS | author sealed659PASS/0FAIL+3syntax verified; cases.mjs; cases.log; cases-results.json (16/16) |
| Security | PASS | production equivalence and transport assertions below |
| Visual | N/A | Infrastructure-only endpoint constant change; no UI. Historical synthetic evidence is not new online proof. |

Root reservation nonce97660da3-3367-4b9e-bee0-7a9d03832f5d at canonical14a45a05eb1fcec73f173711b185d6d2276510e5 preceded this independent session. QA authored none of Luna's implementation. Source6c1a283e3b272edf9638ae6c7c67be96e4542910 based on mainc05ce82edcf6c3b7da5396b3bed3bf1c85396ca4. All9 frozen context files bind SHA256+bytes; all165 snapshot files remain byte/mode identical before/after.

Complete six-file diff reviewed. Whole-file baseline comparison proves each of three production files changes exactly one https://backboard.railway.app/graphql/v2 literal to https://backboard.railway.com/graphql/v2; all remaining bytes identical. Three tests add official endpoint assertions; existing fixtures update endpoint literals. No query/header/credential mode/target/scope/classifier/retry/budget/redirect/export/dependency/config/workflow policy changes. Official CLI API analysis supports default production .com compatibility; it establishes neither actual remote rejection cause nor authentication success.

Author seal9d9c0a942be6d5a0f5c8966d5e744d070e429c49b34955b431d4d567aca5d628 and every sealed artifact verified by hash+bytes; author source-after binds all6 modified frozen files. Focused log reports659tests/659PASS/0FAIL, and syntax.status records3zero exits. Full suite not repeated on unchanged source per contract.

Independent16-case fake-fetch matrix covers inspector main in project-token/account-bearer modes, public configure createClient with actual INVENTORY_QUERY, and deployment inspectDemo/createRailwayClient with actual target query/variables. Each covers foreign302redirect, provider errors plus data/private extensions, malformedJSON and network TypeError. Assertions require fixed .com endpoint, POST, exact credential headers, actual body/variables, redirect:error, finite un-aborted timeout signal, one native request and no old-host/foreign fallback. Inspector also requires1GitHub/0CLI/private-target reads and unchanged blocked identity phase/code/fixed enum projection. Entire printed annotations/receipts/error messages are bounded and exclude synthetic credential/provider sentinels/raw unknown codes. All16 PASS; no transport harness failures.

An additional all165 exact Git-blob assertion initially failed for scripts/automation/setup-claude-review-windows.ps1. Preserved initial-binding-probe-failure.json. Followup line-ending-proof.json demonstrates snapshot3083bytes/45CRLF versus Git3038bytes/0CRLF and exact LF-normalized equality. This unchanged non-runtime Windows context helper is a checkout normalization difference, not source modification or host-change finding. Other164 blobs match exactly. No source changes or weakened runtime assertions followed.

Security: secrets/PHI PASS (synthetic fixtures, no real credentials/data); logging PASS (no raw sentinels); bounded input PASS (existing limits/timeouts unchanged and malformed rejected); auth/authz PASS (exact headers/scopes unchanged); injection PASS (no SQL/HTML/application changes); dependencies PASS (none added); config PASS (fixed official endpoint only, redirect refusal unchanged). Zero actionable findings.

No actual network/provider/auth/database/browser/install/Git-write/canonical action. No identity success, token expiry/invalidity, release/deploy/merge/closure/native CI/Claude claim. Previous3implementations/3reviews preserved; continuation4 does not reset lineage. Root owns metadata/publication/subsequent protected gates and any fresh actual provider test.
'''
(q/'validation-report.md').write_text(report)
(q/'results.json').write_text(json.dumps({'verdict':'READY FOR CODEX QA','findings':[],'actionableFindingsAllSeverities':0,'phases':{'contractBindings':'PASS','static':'PASS','transportRuntimeFake':'PASS','security':'PASS','visual':'N/A infrastructure-only'},'independentCases':{'passed':16,'failed':0},'initialFailures':[{'probe':'all165 exact Git blob assertion','cause':'one unchanged Windows helper CRLF normalization','resolution':'exact LF-normalized equivalence proven; no source change','evidence':'line-ending-proof.json'}],'authorProof':{'verified':True,'tests':659,'passed':659,'failed':0,'syntaxPassed':3,'fullSuiteRepeated':False},'snapshot':{'files':165,'exactGitBlobs':164,'normalizedGitEquivalent':1,'frozen9Exact':True,'beforeAfterUnchanged':True},'liveProviderValidated':False},indent=2))
(q/'STOP.json').write_text(json.dumps({'status':'STOP','verdict':'READY FOR CODEX QA','sourceSha':f['sourceSha'],'nonce':'97660da3-3367-4b9e-bee0-7a9d03832f5d','sourceUnchanged':True,'liveActions':False,'findings':[]},indent=2))
files={str(p.relative_to(q)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(q.rglob('*')) if p.is_file() and p.name!='seal.json'};(q/'seal.json').write_text(json.dumps({'status':'sealed','verdict':'READY FOR CODEX QA','files':files},indent=2));print(hashlib.sha256((q/'seal.json').read_bytes()).hexdigest())

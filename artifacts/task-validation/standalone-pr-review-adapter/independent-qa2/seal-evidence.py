from pathlib import Path
import json,hashlib,datetime
base=Path(__file__).resolve().parent;packet=base.parent;repo=packet.parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
freeze=json.loads((packet/'cycle2/source-freeze.json').read_text());assert all(sha(repo/p)==h for p,h in freeze['files'].items())
prior=json.loads((base/'prior-proof-hashes.json').read_text());assert all(sha(packet/p)==h for p,h in prior.items())
manifest={str(p.relative_to(base)):sha(p) for p in sorted(base.rglob('*')) if p.is_file() and p.name not in ['evidence-hashes.json','final-seal.json']};(base/'evidence-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
seal={'verdict':'FAILED VALIDATION','reviewer':'/root/standalone_adapter_independent_qa2','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseline':'d1324cb3','sourceFiles':len(freeze['files']),'sourceMismatches':[],'priorProofFiles':len(prior),'priorProofMismatches':[],'sourceFreezeSha256':sha(packet/'cycle2/source-freeze.json'),'authorReportSha256':sha(packet/'cycle2/validation-report.md'),'sourceManifestSha256':sha(base/'source-hashes.json'),'priorProofManifestSha256':sha(base/'prior-proof-hashes.json'),'evidenceManifestSha256':sha(base/'evidence-hashes.json'),'validationReportSha256':sha(base/'validation-report.md'),'evidenceFiles':len(manifest),'findings':['F3 accepted Unicode report cannot import or recover via shorter report','F4 accepted state above1MiB cannot load when Contents encoding none'],'actualGitHubWrites':0,'actualModelCalls':0,'actualDeployments':0,'externalLiveReadOnlyReceipt':'Root-owned receipt only; QA2 did not repeat live calls'}
(base/'final-seal.json').write_text(json.dumps(seal,indent=2)+'\n');print(json.dumps(seal,indent=2))

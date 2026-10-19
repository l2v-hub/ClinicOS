import pathlib,json,hashlib,subprocess,sys
repo=pathlib.Path('/workspace/clinicos-standalone-pr-review');root=pathlib.Path('/workspace/.clinicos-cloud/492-continuation8-independent-qa-20261018');packet=repo/'artifacts/task-validation/standalone-pr-review-adapter/codex-followup-4'
hashbytes=lambda b:hashlib.sha256(b).hexdigest()
freeze=json.loads((packet/'source-freeze.json').read_bytes());prior=json.loads((packet/'prior-proof-manifest.json').read_bytes());author=json.loads((packet/'author-evidence-manifest.json').read_bytes());mismatches=[];present=0;sparse=0
for p,h in freeze['files'].items():
 if hashbytes((repo/p).read_bytes())!=h:mismatches.append(p)
for p,h in freeze['harness'].items():
 if hashbytes(pathlib.Path(p).read_bytes())!=h:mismatches.append(p)
for p,h in prior.items():
 f=repo/p
 if f.exists():b=f.read_bytes();present+=1
 else:b=subprocess.check_output(['git','show','HEAD:'+p],cwd=repo);sparse+=1
 if hashbytes(b)!=h:mismatches.append(p)
for p,h in author.items():
 if hashbytes((packet/p).read_bytes())!=h:mismatches.append('author:'+p)
stop=pathlib.Path('/workspace/.clinicos-cloud/492-continuation8-author-20261018/author-stop.json');assert hashbytes(stop.read_bytes())=='e1e353190129c9f1745723c6de90c19751f243107b3ef918f3a51c3b7e5dbcf9'
assert hashbytes((packet/'task-contract.md').read_bytes())=='2e452f496bde8a221c5d75f46aa13835a7072e49d4eaca1cd3b9852901640eba'
changed=subprocess.check_output(['git','diff','--name-only',freeze['baseline'],'HEAD'],cwd=repo).decode().splitlines();assert sorted(changed)==sorted(freeze['modifiedPaths'])
reservation=json.loads(pathlib.Path('/workspace/.clinicos-cloud/codex-after-claude-20261018/492-qa8-reservation.json').read_bytes());assert reservation['nonce']=='3c6b8bb4-e178-446c-92b9-40eefc08377e' and reservation['reservedBeforeSession'] and reservation['stateReadbackVerified']
result={'sourceSha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo).decode().strip(),'sourceInputs':len(freeze['files']),'changedPaths':len(changed),'unchangedOtherInputs':len(freeze['files'])-len(changed),'historicalProofs':len(prior),'presentWorkingTree':present,'sparseVerifiedHeadGitBlobOnly':sparse,'authorEvidenceFiles':len(author),'trustedHarnessFiles':len(freeze['harness']),'authorStopSha256':hashbytes(stop.read_bytes()),'sourceFreezeSha256':hashbytes((packet/'source-freeze.json').read_bytes()),'mismatches':mismatches}
(root/(sys.argv[1]+'.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert not mismatches

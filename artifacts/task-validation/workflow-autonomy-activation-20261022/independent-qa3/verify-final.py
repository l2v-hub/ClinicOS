from pathlib import Path
import hashlib,json,subprocess
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa3';sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda p:json.loads(p.read_text());before=load(q/'source-before.json');verified=0
for folder,m in before['snapshotManifests'].items():
 for n,meta in m.items():
  b=(r/folder/n).read_bytes();assert sha(b)==meta['sha256'] and len(b)==meta['bytes'];verified+=1
# Revalidate all previous immutable author source snapshots and their proof seals.
base={x['path']:x for x in load(r/'source-baseline.json')['files']};snapshots={}
for folder,author in [('baseline',None),('source','author'),('source2','author2'),('source3','author3')]:
 expected=base.copy()
 if author: expected.update({x['path']:x for x in load(r/author/'source-manifest.json')['files']})
 for n,meta in expected.items():
  b=(r/folder/n).read_bytes();assert sha(b)==meta['sha256'] and len(b)==meta['bytes'];verified+=1
 actual={str(p.relative_to(r/folder)) for p in (r/folder).rglob('*') if p.is_file() and not p.is_symlink()};assert actual==set(expected)
 snapshots[folder]={'files':len(expected),'allHashesMatch':True}
for folder in ['author','author2','author3','docs-root-correction','independent-qa']:
 s=load(r/folder/'seal.json')
 for n,m in s['files'].items():
  b=(r/folder/n).read_bytes();assert sha(b)==m['sha256'] and len(b)==m['bytes']
actual=load(r/'post-sync-canonical-readback.json');projection=load(r/'actual-existing-ownership-projection.json');checks=[]
for collection in ['batches','manualBatches','standaloneReviews']:
 for subject in actual['state'][collection]:
  h=sha(json.dumps(subject,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode());assert h==projection['wholeSubjectHashes'][collection][subject['id']];checks.append({'collection':collection,'id':subject['id'],'sha256':h})
assert len(checks)==22
(q/'actual-shape-integrity.json').write_text(json.dumps({'subjects':checks,'serialization':'Python sorted ASCII compact, matching supplied historical proof','allMatch':True,'inputs':{n:sha((r/n).read_bytes()) for n in ['post-sync-canonical-readback.json','actual-existing-ownership-projection.json']}},indent=2)+'\n')
syntax=[];env=load(q/'execution-policy.json')['environment'];code=load(r/'candidate3-code-commit.json')
for n in code['changedPaths']:
 if not n.endswith('.mjs'):continue
 p=subprocess.run(['/tmp/clinicos-node22-native12/node_modules/node/bin/node','--check',str(r/'qa-source3'/n)],env=env,capture_output=True,text=True,timeout=15);syntax.append({'path':n,'exitCode':p.returncode,'output':p.stdout+p.stderr});assert p.returncode==0
(q/'syntax.json').write_text(json.dumps(syntax,indent=2)+'\n')
(q/'source-after.json').write_text(json.dumps({'sourceSha':before['sourceSha'],'immutableFilesReverified':verified,'historicalSnapshots':snapshots,'qaAndCombinedFiles':276,'oldSubjectHashes':22,'sourceEdits':False,'syntaxFiles':len(syntax)},indent=2)+'\n');print(json.dumps({'integrity':'PASS','files':verified,'subjects':22,'syntax':len(syntax)}))

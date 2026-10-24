from pathlib import Path
import json,hashlib,difflib
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa3';sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda f:json.loads((r/f).read_text());v=load('independent-qa3/reservation.json');c=load('candidate3-code-commit.json');m=load('combined3-source-manifest.json')
assert sha((q/'task-contract.md').read_bytes())==v['contractSha256'];assert sha((r/'combined3-source-manifest.json').read_bytes())==v['combinedManifestSha256']==c['combinedManifestSha256'];assert v['sourceSha']==c['codeSha'];assert len(c['bindings'])==16
seals=[]
for folder,key in [('author3','author3SealSha256'),('docs-author','docs1SealSha256'),('docs-root-correction','docsCorrectionSealSha256')]:
 p=r/folder/'seal.json';assert sha(p.read_bytes())==v[key]==c[key];s=json.loads(p.read_text())
 if isinstance(s['files'],dict):
  for n,meta in s['files'].items():
   b=(r/folder/n).read_bytes();assert sha(b)==meta['sha256'] and len(b)==meta['bytes']
 else:
  for meta in s['files']:
   for directory,prefix in [('docs-baseline','before'),('docs-source','after')]:
    b=(r/directory/meta['path']).read_bytes();assert sha(b)==meta[prefix+'Sha256'] and len(b)==meta[prefix+'Bytes']
 seals.append({'folder':folder,'sha256':sha(p.read_bytes()),'files':len(s['files'])})
prior=load('independent-qa/seal.json');assert sha((r/'independent-qa/seal.json').read_bytes())=='58b274424fc6f336a3244c9eb87e4fbbc079275e629a1c9695e3192ecf45112c'
for n,meta in prior['files'].items():assert sha((r/'independent-qa'/n).read_bytes())==meta['sha256']
snapshots={}
for folder in ['combined3','qa-source3']:
 actual={str(f.relative_to(r/folder)) for f in (r/folder).rglob('*') if f.is_file() and not f.is_symlink()};assert actual==set(m);assert len(actual)==138
 for n,meta in m.items():
  b=(r/folder/n).read_bytes();assert sha(b)==meta['sha256'] and len(b)==meta['bytes'],n
 snapshots[folder]=m
for meta in c['bindings']:
 b=(r/'qa-source3'/meta['path']).read_bytes();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==meta['blob'];assert sha(b)==meta['sha256']
(q/'source-before.json').write_text(json.dumps({'sourceSha':c['codeSha'],'files':138,'gitBlobBindings':16,'seals':seals,'priorFailedQaFilesVerified':len(prior['files']),'snapshotManifests':snapshots},indent=2)+'\n')
for baseline,out in [('baseline','independent-source.diff'),('qa-source','candidate3-delta.diff')]:
 diff=[]
 for n in c['changedPaths']:
  old=r/baseline/n;new=r/'qa-source3'/n
  if old.exists() and old.read_bytes()==new.read_bytes():continue
  diff.extend(difflib.unified_diff(old.read_text().splitlines(True) if old.exists() else [],new.read_text().splitlines(True),fromfile=baseline+'/'+n,tofile='candidate3/'+n))
 (q/out).write_text(''.join(diff))
s=(r/'independent-qa/run-focused.py').read_text().replace("q=p/'independent-qa'","q=p/'independent-qa3'").replace("'issue-review-sync']","'issue-review-sync','issue-review-communication']").replace("p/'qa-source'","p/'qa-source3'")
(q/'run-focused.py').write_text(s)
(q/'probes.mjs').write_text((r/'independent-qa/probes.mjs').read_text().replace('../qa-source/','../qa-source3/'))
print('Integrity PASS138 files,16 bindings;29 new sealed records+29 previous QA files verified')

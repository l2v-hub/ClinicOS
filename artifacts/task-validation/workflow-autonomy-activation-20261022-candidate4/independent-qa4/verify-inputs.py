from pathlib import Path
import hashlib,json,difflib
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa4';sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda f:json.loads((r/f).read_text());v=read('independent-qa4/reservation.json');c=read('candidate4-code-commit.json');m=read('source4-frozen-snapshot-manifest.json');m3=read('combined3-source-manifest.json')
assert sha((q/'task-contract.md').read_bytes())==v['contractSha256'];assert sha((r/'source4-frozen-snapshot-manifest.json').read_bytes())==v['sourceManifestSha256']==c['sourceManifestSha256'];assert c['codeSha']==v['sourceSha'];assert c['parent']==v['gitParent'];assert len(m)==138;assert len(c['bindings'])==20
seals=[]
for folder,expected in [('author4',v['author4SealSha256']),('independent-qa3','d9ad31f41c6654abba35f9d5bc747e5932814a8653a2be0b27e2de4d44c94693'),('standalone-release-probe1','bce487135e880b82cadc25266428209d041bb491c71ce6fb26aa4a91002bbcbd'),('independent-qa','58b274424fc6f336a3244c9eb87e4fbbc079275e629a1c9695e3192ecf45112c')]:
 p=r/folder/'seal.json';assert sha(p.read_bytes())==expected
 s=json.loads(p.read_text())
 for n,d in s['files'].items():
  b=(r/folder/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes']
 seals.append({'folder':folder,'sha256':expected,'files':len(s['files'])})
for folder in ['source4','qa-source4']:
 actual={str(p.relative_to(r/folder)) for p in (r/folder).rglob('*') if p.is_file() and not p.is_symlink()};assert actual==set(m)
 for n,d in m.items():
  b=(r/folder/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes'],n
changed={n for n in m if m[n]!=m3[n]};assert changed==set(c['attemptDeltaPaths']);assert len(changed)==9
for d in c['bindings']:
 b=(r/'qa-source4'/d['path']).read_bytes();assert sha(b)==d['sha256'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==d['blob']
old=[]
for d in c['historicalPublicPacketBindings']:
 n=d['path'].split('artifacts/task-validation/workflow-autonomy-activation-20261022/',1)[1];p=r/'publication/packet'/n;b=p.read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==d['blob'];old.append({'path':d['path'],'sha256':d['sha256'],'blob':d['blob'],'mode':d['mode']})
assert len(old)==144
(q/'source-before.json').write_text(json.dumps({'sourceSha':v['sourceSha'],'parent':c['parent'],'files':138,'gitBlobBindings':20,'deltaPaths':sorted(changed),'seals':seals,'snapshotManifest':m,'historicalPublicPacket':old},indent=2)+'\n')
for folder,out,paths in [('qa-source3','candidate4-delta.diff',sorted(changed)),('baseline','independent-source.diff',c['changedCodePaths'])]:
 diff=[]
 for n in paths:
  p=r/folder/n;new=r/'qa-source4'/n;diff.extend(difflib.unified_diff(p.read_text().splitlines(True) if p.exists() else [],new.read_text().splitlines(True),fromfile=folder+'/'+n,tofile='candidate4/'+n))
 (q/out).write_text(''.join(diff))
(q/'harness-history.json').write_text(json.dumps({'initialDiscoveryReadError':'Expectedly named combined4-source-manifest.json absent; actual source4-frozen-snapshot-manifest.json found via directory listing. No test failed, no source edit.','priorFailures':'QA2 and later standalone/release diagnostic retained with verified seals'},indent=2)+'\n')
print('Integrity PASS138 frozenfiles20 currentbindings144 oldpacketbindings9 deltafiles')

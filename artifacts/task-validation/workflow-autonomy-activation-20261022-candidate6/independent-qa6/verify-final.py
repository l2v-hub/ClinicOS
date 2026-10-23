from pathlib import Path
import hashlib,json,subprocess
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa6';sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda p:json.loads(p.read_text());before=read(q/'source-before.json');c=read(r/'candidate6-code-commit.json');v=read(q/'reservation.json');checks=0
for folder in ['source6','qa-source6']:
 for n,d in before['snapshotManifest'].items():
  b=(r/folder/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes'];checks+=1
for d in before['historicalPublicPacket']:
 # source-before records binding paths, with the two actual published packets.
 prefix='artifacts/task-validation/workflow-autonomy-activation-20261022-candidate4/'
 if d['path'].startswith(prefix):p=r/'publication4/packet'/d['path'][len(prefix):]
 else:p=r/'publication/packet'/d['path'].split('artifacts/task-validation/workflow-autonomy-activation-20261022/',1)[1]
 b=p.read_bytes();assert sha(b)==d['sha256'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==d['blob'];checks+=1
for seal in before['seals']:
 p=r/seal['folder']/'seal.json';assert sha(p.read_bytes())==seal['sha256']
 for n,d in read(p)['files'].items():
  b=(p.parent/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes']
actual=read(r/'post-sync-canonical-readback.json');projection=read(r/'actual-existing-ownership-projection.json');subjects=[]
for collection in ['batches','manualBatches','standaloneReviews']:
 for s in actual['state'][collection]:
  h=sha(json.dumps(s,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode());assert h==projection['wholeSubjectHashes'][collection][s['id']];subjects.append({'collection':collection,'id':s['id'],'sha256':h})
assert len(subjects)==22
(q/'historical-subject-integrity.json').write_text(json.dumps({'subjects':subjects,'allMatch':True,'readOnlyInheritedSnapshot':True},indent=2)+'\n')
syntax=[];env=read(q/'execution-policy.json')['environment']
for n in c['attemptDeltaPaths']:
 if not n.endswith('.mjs'):continue
 p=subprocess.run(['/tmp/clinicos-node22-native12/node_modules/node/bin/node','--check',str(r/'qa-source6'/n)],env=env,capture_output=True,text=True,timeout=15);assert p.returncode==0;syntax.append({'path':n,'exitCode':p.returncode,'output':p.stdout+p.stderr})
assert len(syntax)==8
(q/'syntax.json').write_text(json.dumps(syntax,indent=2)+'\n')
(q/'metadata-clarifications.json').write_text(json.dumps({'contractUnchanged':True,'actualPrivateParent':c['parent'],'actualLivePublishedHead':v['livePublishedHead'],'actualDeltaComparedTo':'private source5','actualDeltaCount':len(c['attemptDeltaPaths']),'scope':'Inherited Current Behaviour prose accidentally calls private parent published and delta vs4; authoritative reservation/code binding and initial section correctly distinguish them. No source finding or permission change.'},indent=2)+'\n')
(q/'source-after.json').write_text(json.dumps({'sourceSha':v['sourceSha'],'filesChecked':checks,'snapshotFiles':138,'boundCurrentPaths':22,'actualDeltaPaths':10,'historicalPublicPacketFiles':269,'oldSubjectHashes':22,'author6AndQa5SealsUnchanged':True,'sourceEdits':False,'independentSyntaxPass':8},indent=2)+'\n');print(json.dumps({'integrity':'PASS','files':checks,'subjects':22,'syntax':8}))

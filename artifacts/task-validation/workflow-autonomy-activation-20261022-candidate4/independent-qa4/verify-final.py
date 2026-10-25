from pathlib import Path
import hashlib,json,subprocess
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa4';sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda f:json.loads((r/f).read_text());b=read('independent-qa4/source-before.json');c=read('candidate4-code-commit.json');v=read('independent-qa4/reservation.json');env=read('independent-qa4/execution-policy.json')['environment'];checks=0
for folder in ['source4','qa-source4']:
 for n,m in b['snapshotManifest'].items():
  data=(r/folder/n).read_bytes();assert sha(data)==m['sha256'] and len(data)==m['bytes'];checks+=1
for old in ['independent-qa','independent-qa3','standalone-release-probe1','author4']:
 s=next(x for x in b['seals'] if x['folder']==old);p=r/old/'seal.json';assert sha(p.read_bytes())==s['sha256']
 for n,m in json.loads(p.read_text())['files'].items():
  d=(p.parent/n).read_bytes();assert sha(d)==m['sha256'] and len(d)==m['bytes']
pub=read('publication/manifest.json');assert pub['sha']==c['parent'];assert len(pub['packet']['files'])==144
for old in b['historicalPublicPacket']:
 n=old['path'].split(pub['packet']['path']+'/',1)[1];d=(r/'publication/packet'/n).read_bytes();assert sha(d)==old['sha256']==pub['packet']['files'][n];assert hashlib.sha1(b'blob '+str(len(d)).encode()+b'\0'+d).hexdigest()==old['blob'];assert old['mode']=='100644';checks+=1
actual=read('post-sync-canonical-readback.json');proj=read('actual-existing-ownership-projection.json');subjects=[]
for collection in ['batches','manualBatches','standaloneReviews']:
 for subject in actual['state'][collection]:
  digest=sha(json.dumps(subject,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode());assert digest==proj['wholeSubjectHashes'][collection][subject['id']];subjects.append({'collection':collection,'id':subject['id'],'sha256':digest})
assert len(subjects)==22
(q/'historical-subject-integrity.json').write_text(json.dumps({'subjects':subjects,'allMatch':True,'serialization':'Python sorted ASCII compact as supplied root proof'},indent=2)+'\n')
syntax=[]
for n in c['changedCodePaths']:
 if not n.endswith('.mjs'):continue
 p=subprocess.run(['/tmp/clinicos-node22-native12/node_modules/node/bin/node','--check',str(r/'qa-source4'/n)],env=env,capture_output=True,text=True,timeout=15);assert p.returncode==0;syntax.append({'path':n,'exitCode':p.returncode,'output':p.stdout+p.stderr})
(q/'syntax.json').write_text(json.dumps(syntax,indent=2)+'\n')
(q/'source-after.json').write_text(json.dumps({'sourceSha':v['sourceSha'],'immutableSourceAndHistoricalPacketFilesChecked':checks,'frozenSourceFiles':138,'gitBlobBindings':20,'historicalPublicPacketFiles':144,'oldSubjectHashes':22,'syntaxFiles':len(syntax),'previousSealsUnchanged':True,'sourceEdits':False},indent=2)+'\n')
print(json.dumps({'integrity':'PASS','files':checks,'subjects':22,'syntax':len(syntax)}))

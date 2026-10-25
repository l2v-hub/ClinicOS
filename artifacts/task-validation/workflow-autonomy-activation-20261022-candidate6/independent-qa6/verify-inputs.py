from pathlib import Path
import hashlib,json,difflib
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa6';sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda f:json.loads((r/f).read_text());v=read('independent-qa6/reservation.json');c=read('candidate6-code-commit.json');m=read('source6-frozen-snapshot-manifest.json');m4=read('source5-frozen-snapshot-manifest.json')
assert sha((q/'task-contract.md').read_bytes())==v['contractSha256'];assert sha((r/'source6-frozen-snapshot-manifest.json').read_bytes())==v['sourceManifestRawSha256']==c['sourceManifestRawSha256'];assert c['codeSha']==v['sourceSha'];assert c['parent']==v['gitParent'];assert len(m)==138 and len(c['bindings'])==22
seals=[]
for folder,expected in [('author6',v['author6SealSha256']),('independent-qa5','655122adbf8d401c4fee77706cb33b31aebab40c48562e3d04118e817e863e9a')]:
 p=r/folder/'seal.json';assert sha(p.read_bytes())==expected
 for n,d in json.loads(p.read_text())['files'].items():
  b=(p.parent/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes']
 seals.append({'folder':folder,'sha256':expected,'files':len(json.loads(p.read_text())['files'])})
for folder in ['source6','qa-source6']:
 actual={str(p.relative_to(r/folder)) for p in (r/folder).rglob('*') if p.is_file() and not p.is_symlink()};assert actual==set(m)
 for n,d in m.items():
  b=(r/folder/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes']
changed={n for n in m if m[n]!=m4[n]};assert changed==set(c['attemptDeltaPaths']) and len(changed)==10
for d in c['bindings']:
 b=(r/'qa-source6'/d['path']).read_bytes();assert sha(b)==d['sha256'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==d['blob']
old=[]
for d in c['historicalPublicPacketBindings']:
 prefix='artifacts/task-validation/workflow-autonomy-activation-20261022-candidate4/'
 if d['path'].startswith(prefix):p=r/'publication4/packet'/d['path'][len(prefix):]
 else:p=r/'publication/packet'/d['path'].split('artifacts/task-validation/workflow-autonomy-activation-20261022/',1)[1]
 b=p.read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==d['blob'];old.append({'path':d['path'],'local':str(p),'sha256':d['sha256'],'blob':d['blob'],'mode':d['mode']})
assert len(old)==269
comment=read('publication4/actual-Claude1-comment-changes-requested.json');assert comment['id']==6353848644;assert sha(comment['body'].encode())=='f4d87b533716ce163ea5fff27155dc1441617a40d2fcb85778d128bd2802807e';review=json.loads(comment['body'].split('\n',1)[1]);assert len(review['report']['findings'])==5 and review['subject_sha']==v['livePublishedHead'];
(q/'source-before.json').write_text(json.dumps({'sourceSha':v['sourceSha'],'files':138,'gitBlobBindings':22,'deltaPaths':sorted(changed),'seals':seals,'snapshotManifest':m,'historicalPublicPacket':old,'authenticClaude1':{'id':comment['id'],'bodySha256':sha(comment['body'].encode()),'findings':5,'subjectSha':review['subject_sha']}},indent=2)+'\n')
diff=[]
for n in sorted(changed):
 p=r/'qa-source5'/n;new=r/'qa-source6'/n;diff.extend(difflib.unified_diff(p.read_text().splitlines(True),new.read_text().splitlines(True),fromfile='candidate5/'+n,tofile='candidate6/'+n))
(q/'independent-source.diff').write_text(''.join(diff));print('Integrity PASS138files22bindings269oldpackets10deltas; authenticClaude1 findings5')

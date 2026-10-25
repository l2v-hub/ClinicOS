from pathlib import Path
import hashlib,json,subprocess,difflib
r=Path('/tmp/clinicos-autonomy-activation-20261022');q=r/'independent-qa7';repo='/workspace/ClinicOS';sha=lambda b:hashlib.sha256(b).hexdigest();rd=lambda p:json.loads(p.read_text());v=rd(q/'reservation.json');m=rd(r/'source7-frozen-snapshot-manifest.json');c=rd(r/'candidate7-code-commit.json');git=lambda *a:subprocess.check_output(['git','-C',repo,*a])
assert sha((q/'task-contract.md').read_bytes())==v['contractSha256'];assert sha((r/'source7-frozen-snapshot-manifest.json').read_bytes())==v['sourceManifestRawSha256'];assert git('show','-s','--format=%P',v['sourceSha']).decode().strip()==v['gitParent']
seals=[]
for folder,expected in [('author7',v['author7SealSha256']),('author6','223bd8549a0bd78fc9c47e2d425f16473bc10b1d112be576ce742d6b2fdfe064'),('independent-qa6','21af8377471b43c6c902287986c5995361e6ed0a829f1f661ee996ad7cf26f36'),('luna-draftReady7','f18ae6e38b26c30a3945b3e54dff466c0e6cea7811df0bdbc258e337280560f7'),('release-proof7-child','07d2f63586847a73757caabdc1ac324bb59e7483a4c152dd7d0efdb40c6510d7')]:
 p=r/folder/'seal.json';assert sha(p.read_bytes())==expected
 for n,d in rd(p)['files'].items():
  b=(p.parent/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes'],(folder,n)
 seals.append({'folder':folder,'sha256':expected,'files':len(rd(p)['files'])})
assert len(m)==138
for n,d in m.items():
 b=(r/'qa-source7'/n).read_bytes();assert sha(b)==d['sha256'] and len(b)==d['bytes'];g=git('show',v['sourceSha']+':'+n);assert g==b or (n=='scripts/automation/setup-claude-review-windows.ps1' and b.replace(b'\r\n',b'\n')==g and g==git('show',v['gitParent']+':'+n))
m6=rd(r/'source6-frozen-snapshot-manifest.json');changed=[n for n in m if m[n]!=m6[n]];assert len(changed)==18
allchanges=git('diff','--name-only',v['baseSha'],v['sourceSha']).decode().splitlines();codechanges=[n for n in allchanges if not n.startswith('artifacts/')];assert len(codechanges)==26
old=git('ls-tree','-r',v['gitParent'],'artifacts/task-validation/workflow-autonomy-activation-20261022','artifacts/task-validation/workflow-autonomy-activation-20261022-candidate4','artifacts/task-validation/workflow-autonomy-activation-20261022-candidate6').decode().splitlines()
# Candidate7 binding identifies the exact earlier public packet paths.
bindings=c['historicalPublicPacketBindings'];assert len(bindings)==430
for d in bindings:
 b=git('show',v['sourceSha']+':'+d['path']);assert sha(b)==d['sha256'];assert git('rev-parse',v['sourceSha']+':'+d['path']).decode().strip()==d['blob'];assert git('show',v['gitParent']+':'+d['path'])==b
s=rd(r/'source7-readonly-test-support-receipt.json');support=r/'qa-source7'/s['declaredSourceSymlink']['path'];assert support.is_symlink() and str(support.resolve())==s['declaredSourceSymlink']['target'];b=Path(s['privateCopy']).read_bytes();assert sha(b)==s['sha256'];assert git('show',s['sourceMain']+':'+s['originalPath'])==b;assert Path(s['privateCopy']).stat().st_mode&0o777==0o444
comment=rd(r/'peer-static-review2/actual-comment.json');assert sha(comment['body'].encode())=='6faf10fc34a2b90d886c576ecd60f1ea14f84ef55fdcbe655d3b7b8b1d909db6';(q/'peer-static-review-body.md').write_text(comment['body'])
out={'sourceSha':v['sourceSha'],'parent':v['gitParent'],'sourceFiles':len(m),'snapshotManifest':m,'attemptDelta':changed,'cumulativeCodePaths':codechanges,'historicalPublicPacketFiles':len(bindings),'seals':seals,'readonlySupport':s,'sourceEdits':False};(q/'source-before.json').write_text(json.dumps(out,indent=2)+'\n')
(q/'independent-source.diff').write_bytes(git('diff',v['gitParent'],v['sourceSha'],'--',*changed));print('PASS:138 source Git blobs;18 attempt deltas;26 cumulative code paths;430 old packet blobs;5 seals;readonly support')

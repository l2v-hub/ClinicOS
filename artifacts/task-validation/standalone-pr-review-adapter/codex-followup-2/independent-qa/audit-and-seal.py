from pathlib import Path
import hashlib,json,re,zipfile,subprocess,io
from PIL import Image
pub=Path(__file__).resolve().parent
repo=Path('/workspace/clinicos-standalone-pr-review')
sha=lambda b:hashlib.sha256(b).hexdigest()
freeze=json.loads((pub/'source-freeze.json').read_text())
prior=json.loads((pub/'prior-proof-manifest.json').read_text())
source_bad=[p for p,h in freeze['files'].items() if sha((repo/p).read_bytes())!=h]
prior_bad=[p for p,h in prior.items() if sha((repo/p).read_bytes())!=h]
support=json.loads((pub/'supporting-source-hashes.json').read_text())
support_bad=[p for p,h in support.items() if sha((repo/p).read_bytes())!=h]
assert not source_bad and not prior_bad and not support_bad
integrity={'sourceFiles':len(freeze['files']),'sourceMismatch':source_bad,'priorProofFiles':len(prior),'priorProofMismatch':prior_bad,'supportingFiles':len(support),'supportingMismatch':support_bad,'sourceDigest':freeze['sourceDigest']}
(pub/'integrity-after.json').write_text(json.dumps(integrity,indent=2)+'\n')
patterns=[re.compile(rb'\bghp_[A-Za-z0-9]{25,}'),re.compile(rb'github_pat_[A-Za-z0-9_]{20,}'),re.compile(rb'\bsk-ant-[A-Za-z0-9_-]{20,}'),re.compile(rb'\bsk-proj-[A-Za-z0-9_-]{20,}'),re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),re.compile(rb'Bearer\s+[A-Za-z0-9_.-]{30,}'),re.compile(rb'(?i)(?:postgres(?:ql)?|mysql)://[^\s\x22\x27]+:[^\s\x22\x27]+@')]
findings=[];images=[];videos=[];archives=[]
def scan(name,data):
 for pat in patterns:
  if pat.search(data): findings.append({'path':name,'pattern':pat.pattern.decode()})
def decode_image(name,data):
 with Image.open(io.BytesIO(data)) as im:
  im.load()
  return {'path':name,'dimensions':list(im.size),'format':im.format}
exclude={'media-security-validation.json','artifact-manifest.json','final-seal.json'}
for p in sorted(pub.rglob('*')):
 if not p.is_file() or p.name in exclude:continue
 assert not p.is_symlink()
 name=str(p.relative_to(pub));data=p.read_bytes();assert len(data)<=25*1024*1024,name
 scan(name,data)
 if p.suffix.lower() in ['.png','.jpg','.jpeg']:images.append(decode_image(name,data))
 if p.suffix=='.webm':
  run=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,timeout=60);assert run.returncode==0,run.stderr.decode()
  info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',str(p)]))
  assert float(info['format']['duration'])>0
  videos.append({'path':name,'decodedAllFrames':True,'info':info})
 if p.suffix=='.zip':
  with zipfile.ZipFile(p) as z:
   assert z.testzip() is None
   decoded=0
   for m in z.infolist():
    assert not m.filename.startswith('/') and '..' not in Path(m.filename).parts
    body=z.read(m);scan(name+':'+m.filename,body)
    if body.startswith(b'\xff\xd8') or body.startswith(b'\x89PNG\r\n\x1a\n'):
     decode_image(name+':'+m.filename,body);decoded+=1
   archives.append({'path':name,'members':len(z.infolist()),'CRCAllMembersValid':True,'allMembersSecretScanned':True,'imageMembersDecoded':decoded})
assert not findings,findings
assert len(images)>=2 and len(videos)>=1 and len(archives)>=1
browser=json.loads((pub/'test-results/browser-result.json').read_text());assert browser['result']=='PASS' and not browser['consoleErrors'] and not browser['httpErrors'] and browser['reloaded']
media={'result':'PASS','publicFileMaxBytes':25*1024*1024,'credentialFindings':findings,'images':images,'videos':videos,'archives':archives,'PHI':'Manual review: browser synthetic controller outcomes only; private actual-state fixture excluded. No clinical records or services accessed.','actualStateFixturePublished':False}
(pub/'media-security-validation.json').write_text(json.dumps(media,indent=2)+'\n')
manifest={str(p.relative_to(pub)):{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(pub.rglob('*')) if p.is_file() and p.name not in ['artifact-manifest.json','final-seal.json']}
assert len(manifest)+2<=100
assert max(v['bytes'] for v in manifest.values())<=25*1024*1024
(pub/'artifact-manifest.json').write_text(json.dumps({'files':manifest,'filesExcludingManifestAndSeal':len(manifest),'totalBytesExcludingManifestAndSeal':sum(v['bytes'] for v in manifest.values())},indent=2)+'\n')
seal={'verdict':'READY FOR CODEX QA','sourceDigest':freeze['sourceDigest'],'sourceFiles':len(freeze['files']),'historicalProofFiles':len(prior),'sourceAndHistoricalProofsUnchanged':True,'artifactManifestSha256':sha((pub/'artifact-manifest.json').read_bytes()),'publicFilesIncludingManifestAndSeal':len(manifest)+2,'publicFileMaxBytesObserved':max(v['bytes'] for v in manifest.values()),'publicFilesMax25MiB':True,'mediaDecodedAndZipMembersCRCCheckedAndScanned':True,'actualGitHubStateModelProviderProductionCalls':0,'sourceEdits':0,'writePolicy':'All reviewer writes stop after this final seal. Root owns publication/release.'}
(pub/'final-seal.json').write_text(json.dumps(seal,indent=2)+'\n')
print(json.dumps({'sealSha256':sha((pub/'final-seal.json').read_bytes()),**seal},indent=2))

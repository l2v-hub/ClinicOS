from pathlib import Path
import json,hashlib,zipfile,subprocess,re,io
from PIL import Image
base=Path(__file__).resolve().parent; packet=base.parent; repo=packet.parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
freeze=json.loads((packet/'cycle3/source-freeze.json').read_text()); sources={p:sha(repo/p) for p in freeze['files']}; assert sources==freeze['files']
prior=json.loads((base/'prior-proof-hashes.json').read_text()); priorbad=[p for p,h in prior.items() if sha(packet/p)!=h]; assert not priorbad
media={'png':[],'videos':[],'zip':[],'credentialFindings':[],'sourceFrozen':True,'priorProofFilesUnchanged':len(prior),'PHI':'Synthetic fixtures and scalar real-Git verification counts only; manual content inspection performed.'}
patterns=[re.compile(rb'\bghp_[A-Za-z0-9]{25,}'),re.compile(rb'github_pat_[A-Za-z0-9_]{20,}'),re.compile(rb'sk-ant-[A-Za-z0-9_-]{20,}'),re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]
def scan(name,data):
 for pat in patterns:
  if pat.search(data):media['credentialFindings'].append({'file':name,'pattern':pat.pattern.decode()})
for p in base.rglob('*'):
 if not p.is_file() or p.name in ['media-security-validation.json','evidence-hashes.json','final-seal.json']:continue
 scan(str(p.relative_to(base)),p.read_bytes())
 if p.suffix=='.png':
  with Image.open(p) as im:im.load();media['png'].append({'path':str(p.relative_to(base)),'size':list(im.size),'mode':im.mode})
 if p.suffix=='.webm':
  decode=subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True,timeout=60);assert decode.returncode==0,decode.stderr.decode()
  info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',str(p)]));media['videos'].append({'path':str(p.relative_to(base)),'decoded':True,'info':info})
 if p.suffix=='.zip':
  with zipfile.ZipFile(p) as z:
   assert z.testzip() is None
   for member in z.infolist():
    assert not member.filename.startswith('/') and '..' not in Path(member.filename).parts
    data=z.read(member);scan(str(p.relative_to(base))+':'+member.filename,data)
    if member.filename.endswith('.jpeg') or data[:2]==b'\xff\xd8':
     with Image.open(io.BytesIO(data)) as im:im.load()
   media['zip'].append({'path':str(p.relative_to(base)),'members':len(z.infolist()),'CRCValid':True,'membersScanned':True})
assert not media['credentialFindings'];assert len(media['png'])==7 and len(media['videos'])==3 and len(media['zip'])==3
(base/'media-security-validation.json').write_text(json.dumps(media,indent=2)+'\n')
(base/'test-results/source-integrity.json').write_text(json.dumps({'sourceFreezeSha256':sha(packet/'cycle3/source-freeze.json'),'authorReportSha256':sha(packet/'cycle3/validation-report.md'),'sourceFilesUnchanged':len(sources),'allPriorProofFilesUnchanged':len(prior),'priorProofMismatches':priorbad},indent=2)+'\n')
print(json.dumps(media,indent=2))

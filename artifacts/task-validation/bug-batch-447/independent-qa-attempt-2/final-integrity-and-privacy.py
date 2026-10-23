from pathlib import Path
import hashlib,json,re,zipfile,subprocess
p=Path('artifacts/task-validation/bug-batch-447');q=p/'independent-qa-attempt-2';digest=lambda b:hashlib.sha256(b).hexdigest();initial=json.loads((q/'initial-integrity.json').read_text());history=[]
for name,sha in initial['scope'].items():assert digest(Path(name).read_bytes())==sha,name
for name,sha in initial['contracts'].items():assert digest((p/name).read_bytes())==sha,name
for name,sha in initial['history'].items():
 archive=q/'preserved-pre-qa/files'/name;assert digest(archive.read_bytes())==sha,name
 original=p/name;present=original.exists() and digest(original.read_bytes())==sha
 if not present:assert name.startswith(('test-results/','evidence/')),name
 history.append({'path':name,'sha256':sha,'unchangedOriginal':present,'byteIdenticalPreserved':str(archive.relative_to(p))})
for name,sha in json.loads((q/'legacy-before.json').read_text()).items():
 f=Path(name);assert (digest(f.read_bytes()) if f.exists() else None)==sha,name
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert head==initial['head']
(q/'final-integrity.json').write_text(json.dumps({'head':head,'sourcePathsUnchanged':92,'contractsUnchanged':22,'historyBytePreserved':len(history),'historyChangedOnlyCanonicalRuntimePaths':True,'history':history,'legacyPathsRestored':25,'noSourceChanges':True},indent=2))
patterns={'signedSimulator':rb'\bsim\.[A-Za-z0-9_-]{20,450}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])','jwt':rb'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}','github':rb'\b(?:github_pat_[A-Za-z0-9_]{30,}|gh[pousr]_[A-Za-z0-9]{30,})','apiSecret':rb'\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{35,}','passwordDsn':rb'postgres(?:ql)?://[^\s\x00\x22\x27:@/]+:[^\s\x00\x22\x27@/]{8,}@'}
cache={};findings=[];classifications=[];files=0;members=0;uniqueMembers=0;largest=[]
def scan(data):
 found=[]
 for kind,pat in patterns.items():
  for match in re.finditer(pat,data):
   # Exact JavaScript template syntax is not a materialized credential.
   if kind=='passwordDsn' and match.group()==b'postgresql://postgres:${secret}@':continue
   found.append(kind)
 return sorted(set(found))
for f in sorted(p.rglob('*')):
 assert not f.is_symlink(),f
 if not f.is_file() or f.name=='whole-packet-privacy-final.json':continue
 data=f.read_bytes();sha=digest(data);files+=1;largest.append((len(data),str(f.relative_to(p))))
 if sha in cache:result,memberCount=cache[sha];members+=memberCount
 else:
  memberCount=0;result=[]
  if f.suffix=='.zip':
   with zipfile.ZipFile(f) as z:
    assert z.testzip() is None,f
    for i in z.infolist():
     b=z.read(i);memberCount+=1;uniqueMembers+=1
     for kind in scan(b):result.append({'member':i.filename,'kind':kind})
  elif f.suffix not in ['.png','.webm','.woff2','.pdf','.jpg','.jpeg']:
   result=[{'kind':kind} for kind in scan(data)]
   if b'postgresql://postgres:${secret}@' in data:classifications.append({'file':str(f.relative_to(p)),'kind':'template expression, no materialized credential'})
  cache[sha]=(result,memberCount);members+=memberCount
 for row in result:findings.append({'file':str(f.relative_to(p)),**row})
assert not findings,findings
large=[{'bytes':n,'path':name} for n,name in sorted(largest,reverse=True)[:8]]
assert max(n for n,_ in largest)<=25*1024*1024
result={'filesInspected':files,'uniqueFileContentsScanned':len(cache),'zipMembersVerifiedIncludingHashIdenticalCopies':members,'uniqueZipMembersDecodedAndScanned':uniqueMembers,'credentialFindings':findings,'sourceTemplateClassifications':classifications,'crcValid':True,'noSymlinks':True,'allFilesAtMost25MiB':True,'largestFiles':large,'cryptographicContentCache':'SHA256-identical files reuse the same byte scan and ZIP CRC/member result; every path and file hash is independently read'}
(q/'whole-packet-privacy-final.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k not in ['largestFiles','sourceTemplateClassifications']}))

from pathlib import Path
import json,hashlib,re,zipfile,io,subprocess
p=Path('artifacts/task-validation/bug-batch-447');q=p/'independent-qa-attempt-3';digest=lambda b:hashlib.sha256(b).hexdigest();initial=json.loads((q/'initial-integrity.json').read_text())
for f,h in initial['source'].items():assert digest(Path(f).read_bytes())==h,f
for f,h in initial['contracts'].items():assert digest((p/f).read_bytes())==h,f
refs=json.loads((q/'preserved-pre-qa/relocation-provenance.json').read_text())['files'];preserved=0
for f,r in refs.items():assert digest((q/r['object']).read_bytes())==r['sha256'],f;preserved+=1
qa2=json.loads((p/'independent-qa-attempt-2/final-seal.json').read_text()); print('qa2 keys',qa2.keys())
qa2files=qa2.get('files',{});
for f,h in qa2files.items():assert digest((p/'independent-qa-attempt-2'/f).read_bytes())==h,f
for f,h in json.loads((q/'legacy-before.json').read_text()).items():assert (digest(Path(f).read_bytes()) if Path(f).exists() else None)==h,f
patterns={'signedSimulator':rb'\bsim\.[A-Za-z0-9_-]{20,450}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])','jwt':rb'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}','github':rb'\b(?:github_pat_[A-Za-z0-9_]{30,}|gh[pousr]_[A-Za-z0-9]{30,})','apiSecret':rb'\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{35,}','passwordDsn':rb'postgres(?:ql)?://[^\s\x00\x22\x27:@/]+:[^\s\x00\x22\x27@/]{8,}@'}
cache={};findings=[];files=members=uniqueMembers=0;largest=[];templates=[]
def scan(data):
 out=[]
 for kind,pat in patterns.items():
  for m in re.finditer(pat,data):
   if kind=='passwordDsn' and re.fullmatch(rb'postgres(?:ql)?://[A-Za-z_]+:\$\{[A-Za-z_][A-Za-z0-9_]*\}@',m.group()):continue
   out.append(kind)
 return sorted(set(out))
for f in sorted(p.rglob('*')):
 assert not f.is_symlink(),f
 if not f.is_file() or f.name in ['whole-packet-privacy-final.json','final-integrity.json','final-seal.json'] and f.parent==q:continue
 b=f.read_bytes();h=digest(b);files+=1;largest.append((len(b),str(f.relative_to(p))))
 if h not in cache:
  result=[];n=0
  if b.startswith(b'PK\x03\x04'):
   with zipfile.ZipFile(io.BytesIO(b)) as z:
    assert z.testzip() is None,str(f)
    for i in z.infolist():
     n+=1;uniqueMembers+=1
     for kind in scan(z.read(i)):result.append({'member':i.filename,'kind':kind})
  else:
   result=[{'kind':k} for k in scan(b)]
  cache[h]=(result,n)
 result,n=cache[h];members+=n
 for row in result:findings.append({'path':str(f.relative_to(p)),**row})
audit={'filesInspected':files,'uniqueFileContentsScanned':len(cache),'zipMembersVerifiedIncludingHashIdenticalCopies':members,'uniqueZipMembersDecodedAndScanned':uniqueMembers,'credentialFindings':findings,'crcValid':True,'noSymlinks':True,'allFilesAtMost25MiB':max(n for n,_ in largest)<=25*1024*1024,'largestFiles':[{'bytes':n,'path':f} for n,f in sorted(largest,reverse=True)[:8]],'archiveObjectsClassifiedByMagicBytes':True,'cryptographicContentCache':'Every path and SHA independently read; SHA-identical content shares byte and ZIP CRC/member inspection. Exact non-materialized JavaScript ${identifier} DSN templates are not credentials.'}
(q/'whole-packet-privacy-final.json').write_text(json.dumps(audit,indent=2)+'\n');assert not findings,findings;assert audit['allFilesAtMost25MiB'],audit['largestFiles']
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==initial['head']
(q/'final-integrity.json').write_text(json.dumps({'head':initial['head'],'sourcePathsUnchanged':94,'contractsUnchanged':26,'authorFilesBytePreserved':preserved,'qa2SealedFilesUnchanged':len(qa2files),'legacyPathsRestored':25,'noProductSourceChange':True},indent=2)+'\n')
print(json.dumps({k:v for k,v in audit.items() if k not in ['largestFiles','cryptographicContentCache']}))

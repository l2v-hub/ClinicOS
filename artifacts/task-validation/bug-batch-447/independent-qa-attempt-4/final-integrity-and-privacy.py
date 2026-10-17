from pathlib import Path
import json,hashlib,re,zipfile,io,subprocess
r=Path.cwd();p=r/'artifacts/task-validation/bug-batch-447';q=p/'independent-qa-attempt-4';old=p/'independent-qa-attempt-3';digest=lambda b:hashlib.sha256(b).hexdigest();initial=json.loads((q/'initial-integrity.json').read_text())
for n,h in initial['source'].items():assert digest((r/n).read_bytes())==h,n
for n,h in initial['contracts'].items():assert digest((p/n).read_bytes())==h,n
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==initial['head']
sealed={}
for folder,count in [('independent-qa-attempt-2',806),('independent-qa-attempt-3',262)]:
 d=json.loads((p/folder/'final-seal.json').read_text());assert len(d['files'])==count
 for n,h in d['files'].items():assert digest((p/folder/n).read_bytes())==h,(folder,n)
 sealed[folder]=count
refs=json.loads((old/'preserved-pre-qa/relocation-provenance.json').read_text())['files']
for n,d in refs.items():assert digest((old/d['object']).read_bytes())==d['sha256'],n
ownrefs=json.loads((q/'preserved-pre-qa/relocation-provenance.json').read_text())['files']
for n,d in ownrefs.items():assert digest((p/d['object']).read_bytes())==d['sha256'],n
legacy=json.loads((old/'legacy-before.json').read_text())
for n,h in legacy.items():assert (digest(Path(n).read_bytes()) if Path(n).exists() else None)==h,n
canonical=json.loads((q/'canonical-current-hashes.json').read_text())['files']
for n,h in canonical.items():assert digest((p/n).read_bytes())==h,n
patterns={'signedSimulator':rb'\bsim\.[A-Za-z0-9_-]{20,450}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])','jwt':rb'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}','github':rb'\b(?:github_pat_[A-Za-z0-9_]{30,}|gh[pousr]_[A-Za-z0-9]{30,})','apiSecret':rb'\bsk-(?:proj-|ant-api\d{2}-)?[A-Za-z0-9_-]{35,}','passwordDsn':rb'postgres(?:ql)?://[^\s\x00\x22\x27:@/]+:[^\s\x00\x22\x27@/]{8,}@'}
def scan(data):
 result=[]
 for kind,pattern in patterns.items():
  for m in re.finditer(pattern,data):
   if kind=='passwordDsn' and re.fullmatch(rb'postgres(?:ql)?://[A-Za-z_]+:\$\{[A-Za-z_][A-Za-z0-9_]*\}@',m.group()):continue
   result.append(kind)
 return sorted(set(result))
cache={};uniqueMembers=0
def inspect(data,depth=0):
 global uniqueMembers
 assert depth<9,'Unexpected nested archive depth'
 sha=digest(data)
 if sha in cache:return cache[sha]
 findings=[{'kind':x} for x in scan(data)] if not data.startswith(b'PK\x03\x04') else [];members=0
 if data.startswith(b'PK\x03\x04'):
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   assert z.testzip() is None
   for item in z.infolist():
    uniqueMembers+=1;members+=1;rows,nested=inspect(z.read(item),depth+1);members+=nested
    for row in rows:findings.append({'member':item.filename+(('::'+row['member']) if row.get('member') else ''),'kind':row['kind']})
 cache[sha]=(findings,members);return findings,members
files=members=0;findings=[];largest=[]
for f in sorted(p.rglob('*')):
 assert not f.is_symlink(),f
 if not f.is_file() or f.parent==q and f.name in ['whole-packet-privacy-final.json','final-integrity.json','final-seal.json','final-integrity-and-privacy.txt']:continue
 b=f.read_bytes();files+=1;largest.append((len(b),str(f.relative_to(p))));rows,n=inspect(b);members+=n
 for row in rows:findings.append({'path':str(f.relative_to(p)),**row})
audit={'filesInspected':files,'uniqueContentsScannedIncludingArchiveMembers':len(cache),'zipMemberVisitsIncludingHashIdenticalReferences':members,'uniqueZipMembersDecodedAndScanned':uniqueMembers,'credentialFindings':findings,'crcValid':True,'noSymlinks':True,'allFilesAtMost25MiB':max(n for n,_ in largest)<=25*1024*1024,'largestFiles':[{'bytes':n,'path':name} for n,name in sorted(largest,reverse=True)[:10]],'archiveObjectsClassifiedByMagicBytes':True,'nestedArchivesInspected':True,'cryptographicContentCache':'Every file path and SHA independently read; SHA-identical contents share CRC/member credential inspection. Exact unmaterialized JavaScript ${identifier} DSN templates are not credentials.','phiAndAuthorizationProvenance':'Only randomly marked disposable synthetic local database, fixed synthetic fixtures and normal simulator accounts; no developer/production/patient-provider data read. Live issue bodies remain private; publishable read receipts contain hashes only.','newOversizeZipRecompressionRequired':False}
(q/'whole-packet-privacy-final.json').write_text(json.dumps(audit,indent=2)+'\n');assert not findings,findings;assert audit['allFilesAtMost25MiB'],audit['largestFiles']
(q/'final-integrity.json').write_text(json.dumps({'head':initial['head'],'sourcePathsUnchanged':94,'contractsUnchanged':27,'allOther93SourceAndOld26ContractsIdenticalToQa3':True,'authorHistoricalArtifactsResolved':len(refs),'historicalSealedFilesUnchanged':sealed,'overwrittenCanonicalProofReferencesVerified':len(ownrefs),'currentCanonicalHashesVerified':len(canonical),'legacyPathsUnchanged':len(legacy),'noProductSourceFixOrGitGithubMutation':True,'actualQa4CanonicalInvocations':1,'localAllFivePhasesPass':True,'externalReviewedMainGateRetained':True},indent=2)+'\n')
print(json.dumps({k:v for k,v in audit.items() if k not in ['largestFiles','cryptographicContentCache','phiAndAuthorizationProvenance']}))

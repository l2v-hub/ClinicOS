from pathlib import Path
import json,hashlib,re,datetime
r=Path(__file__).parent
files=sorted(p for p in r.rglob('*') if p.is_file() and p.name not in ('artifact-manifest.json','final-seal.json','secret-scan.json'))
patterns={'github_token':rb'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})','provider_key':rb'sk-(?:ant-|proj-)[A-Za-z0-9_-]{25,}','private_key':rb'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----','signed_storage':rb'https://[^\s"\x27]+(?:blob\.core\.windows\.net|actions\.githubusercontent\.com)/[^\s"\x27]*[?&](?:sig|signature)=[A-Za-z0-9%+/=]{20,}'}
findings=[]
for p in files:
 raw=p.read_bytes()
 for label,pattern in patterns.items():
  if re.search(pattern,raw):findings.append({'path':str(p.relative_to(r)),'pattern':label})
 assert p.stat().st_size<=25*1024*1024
scan={'scope':'all external evidence regular files before manifest/seal; synthetic markers are not real credentials','patterns':list(patterns),'findings':findings,'filesScanned':len(files),'maxFileBytes':max(p.stat().st_size for p in files),'allFilesUnder25MiB':True}
assert not findings
(r/'secret-scan.json').write_text(json.dumps(scan,indent=2)+'\n')
files.append(r/'secret-scan.json')
manifest={str(p.relative_to(r)):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(files)}
(r/'artifact-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
seal={'sealedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'subjectSha':'9ec1c16fcb061f14cdab47c699087d504d8f2305','manifestSha256':hashlib.sha256((r/'artifact-manifest.json').read_bytes()).hexdigest(),'verdict':'READY FOR CODEX QA — offline scope only','overallFinalDecision':'IMPLEMENTED — NOT VERIFIED','candidateTestsPassed':34,'independentTestsPassed':8,'findingCount':0,'priorProofFilesPreserved':49,'sourceFilesPreserved':3,'frozenMetadataFilesPreserved':8,'status':'STOPPED — sealed; root owns publication and later gates'}
(r/'final-seal.json').write_text(json.dumps(seal,indent=2)+'\n')
print(json.dumps(seal,indent=2))

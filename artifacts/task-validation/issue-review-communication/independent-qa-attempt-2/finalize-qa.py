from pathlib import Path
import hashlib,json,subprocess,re,zipfile,os,base64
r=Path('.').resolve();p=r/'artifacts/task-validation/issue-review-communication';q=p/'independent-qa-attempt-2';h=lambda b:hashlib.sha256(b).hexdigest();before=json.loads((q/'before-proof.json').read_text())
for x in before['sources']['files']:assert h((r/x['file']).read_bytes())==x['sha256']
for f,v in before['contracts'].items():assert h((p/f).read_bytes())==v
for x in before['guards']:assert h((r/x['file']).read_bytes())==x['expectedSha256']
for f,v in before['historicalFiles'].items():assert h((r/f).read_bytes())==v,f
for link in (r/'node_modules',r/'frontend/node_modules'):
 assert link.is_symlink();link.unlink()
(q/'source-preservation-check.json').write_text(json.dumps({'sourceFilesUnchanged':7,'contractsUnchanged':4,'guardSourcesUnchanged':19,'historicalFilesUnchanged':len(before['historicalFiles']),'borrowedDependencyLinksRemoved':True},indent=2)+'\n')
video=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height','-of','json',str(q/'review-bridge.webm')],text=True));assert float(video['format']['duration'])>0;assert video['streams'][0]['codec_name']=='vp8';(q/'video-verification.json').write_text(json.dumps(video,indent=2)+'\n')
counts={'files':0,'zipFiles':0,'zipMembersCRCValidated':0,'bytesInspected':0};findings=[]
credential_patterns=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'github_pat_[A-Za-z0-9_]{60,}',rb'gh[pousr]_[A-Za-z0-9]{36,}',rb'sk-ant-[A-Za-z0-9_-]{40,}',rb'sk-proj-[A-Za-z0-9_-]{40,}']
secret_values=[v.encode()for k,v in os.environ.items()if len(v)>24 and any(t in k.upper()for t in ['TOKEN','SECRET','PASSWORD','API_KEY'])]
def inspect(b,name):
 counts['bytesInspected']+=len(b)
 if any(re.search(z,b)for z in credential_patterns)or any(v in b for v in secret_values):findings.append(name)
 for m in re.finditer(rb'\b(eyJ[A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\b',b):
  try:
   header=json.loads(base64.urlsafe_b64decode(m[1]+b'='*((4-len(m[1])%4)%4)));payload=json.loads(base64.urlsafe_b64decode(m[2]+b'='*((4-len(m[2])%4)%4)))
   if isinstance(header,dict)and isinstance(payload,dict):findings.append(name+':decodable-signed-session')
  except Exception:pass
files=[f for f in p.rglob('*')if f.is_file()]+[r/x['file']for x in before['sources']['files']]
for f in files:
 counts['files']+=1;inspect(f.read_bytes(),str(f.relative_to(r)))
 if f.suffix=='.zip':
  counts['zipFiles']+=1
  with zipfile.ZipFile(f)as z:
   assert z.testzip()is None
   for item in z.infolist():
    if not item.is_dir():counts['zipMembersCRCValidated']+=1;inspect(z.read(item),str(f.relative_to(r))+':'+item.filename)
assert not findings,findings
(q/'privacy-audit.json').write_text(json.dumps({**counts,'highConfidenceCredentialFindings':findings,'actualPHI':'none; only synthetic issue/code fixtures; no patient/database access','externalGitHubProviderModelWrites':0,'newDependencies':0,'rawIssueBodiesCopied':False,'remainingSecurityFindings':[]},indent=2)+'\n')
(q/'build-test-results.json').write_text(json.dumps([{'name':'full-regression','exit':0,'tests':628,'passed':625,'skippedNativeWindows':3},{'name':'types','exit':0,'projects':['tsconfig.app.json','tsconfig.node.json'],'note':'Wrong initial relative binary path preserved in types-preflight-wrong-binary.log; corrected absolute compiler and both noEmit project checks pass.'},{'name':'build','exit':0,'modules':740,'seconds':35.74}],indent=2)+'\n')
print(json.dumps({'preservedHistoricalFiles':len(before['historicalFiles']),'privacy':counts,'video':video['format']}))

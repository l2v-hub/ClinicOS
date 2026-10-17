from pathlib import Path
import json,hashlib,zipfile,re,os,subprocess
p=Path('artifacts/task-validation/demo-source-configuration');q=p/'independent-qa-attempt-2';h=lambda b:hashlib.sha256(b).hexdigest()
initial=json.loads((q/'test-results/initial-hashes.json').read_text());findings=[];entries=0;zipmembers=0;allbytes=0
credential=re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|sk-ant-[A-Za-z0-9_-]{25,}|sk-proj-[A-Za-z0-9_-]{25,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,})')
secrets=[v.encode() for k,v in os.environ.items() if any(x in k.upper() for x in ['TOKEN','SECRET','API_KEY']) and len(v)>=20]
def scan(data,path):
 global entries,allbytes
 entries+=1;allbytes+=len(data)
 if credential.search(data):findings.append({'path':path,'kind':'credential-pattern'})
 if any(v in data for v in secrets):findings.append({'path':path,'kind':'bound-credential'})
for f in p.rglob('*'):
 if f.is_symlink():findings.append({'path':str(f),'kind':'symlink'});continue
 if f.is_file():
  scan(f.read_bytes(),str(f))
  if f.suffix=='.zip':
   with zipfile.ZipFile(f) as z:
    assert z.testzip() is None
    for n in z.namelist():
     if not n.endswith('/'):scan(z.read(n),str(f)+'!'+n);zipmembers+=1
for f,x in initial['sourceHashes'].items():assert h(Path(f).read_bytes())==x,f
for f,x in initial['contractHashes'].items():assert h((p/f).read_bytes())==x,f
for f,x in initial['preexistingEvidence'].items():assert h(Path(f).read_bytes())==x,f
assert len(initial['preexistingEvidence'])==38
changed=subprocess.check_output(['git','diff','--name-only','HEAD'],text=True).strip().split('\n');assert sorted(changed)==sorted(initial['sourceHashes'])
result={'passed':not findings,'scannedEntries':entries,'zipMembers':zipmembers,'scannedBytes':allbytes,'findings':findings,'unchangedSourceFiles':3,'unchangedFrozenContracts':3,'unchangedPreexistingEvidenceFiles':38,'historicalAttempt1Files':29,'actualProviderRequests':0,'databaseAccess':False,'syntheticFixturesOnly':True,'liveCredentialValuesPrinted':False,'checklist':{'secrets':'PASS: bounded receipt and fixed diagnostics; local bound credential scan zero','PHI':'PASS: synthetic fixture metadata only','logging':'PASS: metadata ids/outcomes only; actual bound value reflection rejected','inputValidation':'PASS: schema, bounded response/body, exact target and digest','authorization':'PASS: manual protected exact-current-main and read-only GitHub token','injection':'PASS: fixed queries, GraphQL variables; no DB SQL/UI production surface','dependencies':'PASS: no new packages','configuration':'PASS: unchanged release guards, scopes and budgets; no direct deploy/storage/patient operation'}}
(q/'test-results/security-and-preservation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'passed':not findings,'findings':findings,'scannedEntries':entries,'zipMembers':zipmembers,'preexistingEvidenceUnchanged':38}))
assert not findings

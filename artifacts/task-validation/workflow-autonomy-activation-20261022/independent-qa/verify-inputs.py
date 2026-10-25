from pathlib import Path
import hashlib,json,datetime,stat
p=Path('/tmp/clinicos-autonomy-activation-20261022');q=p/'independent-qa'
sha=lambda b:hashlib.sha256(b).hexdigest()
load=lambda f:json.loads((p/f).read_text())
reservation=load('independent-qa/reservation.json');code=load('candidate2-code-commit.json');baseline=load('source-baseline.json');m1=load('author/source-manifest.json');m2=load('author2/source-manifest.json')
assert code['codeSha']==reservation['sourceSha']=='2e4a635ad5f34bb6f886342d15eaed63674d3dae'
assert sha((q/'task-contract.md').read_bytes())==reservation['contractSha256']
seals=[]
for folder,key in [('author','author1SealSha256'),('author2','author2SealSha256')]:
 b=(p/folder/'seal.json').read_bytes();assert sha(b)==reservation[key]==code[key];seal=json.loads(b)
 for name,meta in seal['files'].items():
  f=p/folder/name;data=f.read_bytes();assert sha(data)==meta['sha256'] and len(data)==meta['bytes'],str(f)
 seals.append({'folder':folder,'sealSha256':sha(b),'sealedFilesVerified':len(seal['files'])})
base={x['path']:x for x in baseline['files']};allowed={x['path']:x for x in code['bindings']};allpaths=set(base)|set(allowed)
assert len(allowed)==12 and set(code['changedPaths'])==set(allowed)
assert len(allpaths)==137
snapshots={}
for folder in ['baseline','source','source2','qa-source']:
 expected=base.copy()
 if folder=='source':expected.update({x['path']:x for x in m1['files']})
 elif folder in ['source2','qa-source']:expected.update(allowed)
 actual={str(f.relative_to(p/folder)) for f in (p/folder).rglob('*') if f.is_file() and not f.is_symlink()}
 assert actual==set(expected),(folder,len(actual),len(expected))
 records=[]
 for name,meta in sorted(expected.items()):
  f=p/folder/name;data=f.read_bytes();assert sha(data)==meta['sha256'] and len(data)==meta['bytes'],(folder,name)
  records.append({'path':name,'sha256':sha(data),'bytes':len(data)})
 snapshots[folder]={'files':len(records),'manifestSha256':sha(json.dumps(records,separators=(',',':')).encode()),'manifest':records}
for name,meta in allowed.items():
 b=(p/'qa-source'/name).read_bytes();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==meta['blob'],name
for meta in m1['files']:assert (p/'source'/meta['path']).read_bytes()==(p/'qa-source'/meta['path']).read_bytes()
for meta in m2['files']:
 assert meta['sha256']==allowed[meta['path']]['sha256']
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceSha':code['codeSha'],'parent':code['parent'],'base':code['base'],'snapshotFiles':137,'boundGitBlobs':12,'authorSeals':seals,'author1CoreFilesInheritedExactly':len(m1['files']),'outside12Unchanged':True,'baselinePreserved':True,'snapshots':snapshots}
(q/'source-before.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='snapshots'}))

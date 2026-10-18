import os,json,hashlib,zipfile,shutil
own='/workspace/.clinicos-cloud/maintenance470-sparse6-independent-qa-20261018';repo='/workspace/ClinicOS/agent-team/.worktrees/maintenance-470'
def digest(b):return hashlib.sha256(b).hexdigest()
def check(root,manifest):
 result={'files':len(manifest),'bytes':0,'mismatches':[]}
 for p,h in manifest.items():
  b=open(root+'/'+p,'rb').read();expected=h.get('sha256') if isinstance(h,dict) else h
  if digest(b)!=expected:result['mismatches'].append(p)
  result['bytes']+=len(b)
 assert not result['mismatches'],result
 return result
p=repo+'/artifacts/task-validation/maintenance-470/codex-followup-2/prior-proof-manifest.json';manifest=json.load(open(p));before=check(repo,manifest)
old={}
for d,m in [('maintenance470-readonly-author-20261018','evidence-manifest.json'),('maintenance470-readonly-qa-20261018','public-manifest.json'),('maintenance470-sparse-fix-author-20261018','evidence-manifest.json')]:
 root='/workspace/.clinicos-cloud/'+d;old[d]=check(root,json.load(open(root+'/'+m)))
source=check(repo,json.load(open('/workspace/.clinicos-cloud/maintenance470-sparse-fix-author-20261018/source-input-manifest.json')))
with zipfile.ZipFile(own+'/private-trace.zip') as z:
 assert z.testzip() is None
 entries=z.namelist()
 for name in entries:
  b=z.read(name)
  for forbidden in [b'synthetic-railway-credential',b'synthetic-github-credential',b'private-password',b'never-public']:
   assert forbidden not in b,(name,forbidden)
  if name.endswith(('.trace','.network','.stacks')):
   for line in b.splitlines():
    if line:json.loads(line)
trace={'crc':'PASS','decode':'PASS','sensitiveSentinelScan':'PASS','entries':len(entries),'private':True}
shutil.rmtree(own+'/sparse');shutil.rmtree(own+'/runtime')
after=check(repo,manifest);assert before==after
json.dump({'full5998Before':before,'full5998After':after,'manifestSha256':digest(open(p,'rb').read()),'oldExternalSeals':old,'authorSourceInputs':source,'privateTrace':trace,'cleanup':{'ownedSparseAndVerificationHomeRemoved':True,'baselineRemoved':False}},open(own+'/final-integrity.json','w'),indent=2)

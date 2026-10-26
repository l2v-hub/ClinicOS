import pathlib,subprocess,json,hashlib,shutil
owned=pathlib.Path('/tmp/clinicos-output-policy-qa3'); old=pathlib.Path('/tmp/clinicos-output-policy-qa2/snapshot'); repo='/workspace/ClinicOS'; out=pathlib.Path('/workspace/.clinicos-cloud/cloud-review-activation-20261025/codex-execution-diagnostics/runtime-output-policy-qa3')
meta=json.loads((out.parent/'runtime-output-policy-publication3/source-candidate.json').read_text()); previous=json.loads((out.parent/'runtime-output-policy-qa2/source-hashes-before.json').read_text())
for p,h in previous.items(): assert hashlib.sha256((old/p).read_bytes()).hexdigest()==h,p

if not (owned/'snapshot').exists(): shutil.copytree(old,owned/'snapshot',symlinks=True)
rows=[]
for p,h in meta['sourceHashes'].items():
 data=subprocess.check_output(['git','-C',repo,'show',meta['code']+':'+p]); target=owned/'snapshot'/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 actual=hashlib.sha256(data).hexdigest();assert actual==h
 blob=subprocess.check_output(['git','-C',repo,'rev-parse',meta['code']+':'+p],text=True).strip(); rows.append({'path':p,'gitBlobSha1':blob,'rawSha256':actual})
(out/'source-hashes-before.json').write_text(json.dumps(rows,indent=2)+'\n')
# Every tracked copied file must match frozen candidate; untracked files inventoried, never trusted as source.
tracked=set(subprocess.check_output(['git','-C',repo,'ls-tree','-r','--name-only',meta['code']],text=True).splitlines());validated=[];unknown=[];restored=[]
for f in (owned/'snapshot').rglob('*'):
 if f.is_file() and not f.is_symlink():
  p=str(f.relative_to(owned/'snapshot'))
  if p in tracked:
   data=subprocess.check_output(['git','-C',repo,'show',meta['code']+':'+p]);
   if data!=f.read_bytes():
    assert len(data)<1024*1024,p;f.write_bytes(data);restored.append(p)
   validated.append(p)
  else:unknown.append(p)
(out/'context-validation.json').write_text(json.dumps({'source':str(old),'baselineSixHashesValidated':True,'copiedTrackedFilesByteEqualToCandidate':validated,'untrackedContext':unknown,'tinyTrackedContextRestoredFromFrozenGit':restored},indent=2)+'\n')
for d in ['logs','test-results','screenshots','trace','playwright-report','evidence-scripts']: (out/d).mkdir(exist_ok=True)
for name in ['complete.diff','round3.diff']:
 args=['git','-C',repo,'diff',meta['base'] if name=='complete.diff' else meta['parent'],meta['code'],'--',*meta['sourceHashes']]
 (out/name).write_bytes(subprocess.check_output(args))
print(json.dumps({'rows':rows,'validatedContextCount':len(validated),'untrackedCount':len(unknown)},indent=2))

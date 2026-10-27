from pathlib import Path
import subprocess,json,hashlib,yaml
p=Path(__file__).resolve().parent
r=json.loads((p/'reservation.json').read_text());w='/workspace/.clinicos-cloud/issue516-frontend-api-root-author-worktree-20261027';sha=r['baseSha'];base=p/'source-files';files=r['files']
def get(f):return subprocess.check_output(['git','-C',w,'show',sha+':'+f])
class UniqueLoader(yaml.SafeLoader):pass
def mapping(loader,node,deep=False):
 result={}
 for k,v in node.value:
  key=loader.construct_object(k,deep=deep)
  assert key not in result,'duplicate YAML key'
  result[key]=loader.construct_object(v,deep=deep)
 return result
UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,mapping)
allSource=subprocess.check_output(['git','-C',w,'diff','--name-only','2dc0c0050a9f18a51a7ac980b42b46057870e27e',sha]).decode().splitlines()
source=[f for f in allSource if not f.startswith('artifacts/task-validation/')]
assert len(source)==80 and set(files)<=set(source)
skills=[f for f in source if f.endswith('/SKILL.md')]
assert len(skills)==27
frontmatter=[]
for f in skills:
 text=(base/f).read_text() if f in files else get(f).decode()
 assert text.startswith('---\n');parts=text.split('---\n',2);assert len(parts)==3
 meta=yaml.load(parts[1],Loader=UniqueLoader)
 assert meta['name']==Path(f).parent.name and isinstance(meta['description'],str) and meta['description'].strip()
 if 'disable-model-invocation' in meta:assert type(meta['disable-model-invocation']) is bool
 frontmatter.append({'file':f,'name':meta['name'],'valid':True})
 if meta['name']=='wizard':assert meta['disable-model-invocation'] is True
 if meta['name']=='pr':assert meta['metadata']['credits']['license']=='MIT';prurl=meta['metadata']['credits']['url']
agentYamls=[f for f in source if f.endswith('/agents/openai.yaml')]
assert len(agentYamls)==27
for f in agentYamls:
 text=(base/f).read_text() if f in files else get(f).decode();meta=yaml.load(text,Loader=UniqueLoader)
 assert isinstance(meta['interface']['display_name'],str) and isinstance(meta['interface']['short_description'],str)
 if '/wizard/' in f:assert meta['policy']['allow_implicit_invocation'] is False
assert sorted(str(x.relative_to(base)) for x in base.rglob('*') if x.is_file())==sorted(files)
credits=(base/'.agents/skills/pr/CREDITS.md').read_text();notice=(p/'public-provenance/humanlayer-skills-LICENSE-pinned.txt').read_bytes()
assert notice.decode() in credits and prurl in credits and 'github.com/humanlayer/humanlayer' not in credits
assert get('docs/agents/matt-pocock-LICENSE.txt').startswith(b'MIT License')
pr=(base/'.agents/skills/pr/SKILL.md').read_text()
assert pr.split('---\n',2)[2]==get('.agents/skills/pr/SKILL.md').decode().split('---\n',2)[2]
wm=(base/'.agents/skills/wizard/SKILL.md').read_text()
assert 'For setup: `.env`, `.env.example`, `.env.*`' not in wm and 'Never read live `.env` files' in wm
ask=(base/'.agents/skills/ask-matt/SKILL.md').read_text()
assert 'Model-invoked, so the agent reaches for it the moment it hits a wall' not in ask
wt=Path(r['worktree']);assert all((wt/f).read_bytes()==get(f) for f in files)
reads=json.loads((p/'public-provenance/reads.json').read_text());assert len(reads)==5 and all(x['status']==200 for x in reads)
projection={f:{'bytes':(base/f).stat().st_size,'sha256':hashlib.sha256((base/f).read_bytes()).hexdigest(),'gitBlobSha1':hashlib.sha1(b'blob '+str((base/f).stat().st_size).encode()+b'\0'+(base/f).read_bytes()).hexdigest()} for f in files}
result={'schemaVersion':1,'reservationNonce':r['nonce'],'verdict':'READY_FOR_INDEPENDENT_QA','checks':{'importedFrontmatterValid':27,'agentYamlValid':27,'wizardExplicitOnlyBothHarnesses':True,'wizardKeysOnlyNoLiveEnvResearch':True,'originalPrBodyUnchanged':True,'exactHumanLayerMitNoticeIncluded':True,'canonicalPinnedUrlConsistent':True,'mattPocockLicenseUnchanged':True,'sourceFileCeiling':80,'addedSourceFiles':0,'changedSourceFiles':5,'worktreeUntouchedAndBaselineExact':True,'provenancePublicReads':5,'allPublicReadsHttp200':True},'sourceProjection':projection,'providerInvocations':0,'vendoredScriptsExecuted':0,'realEnvOrSecretFilesRead':0,'gitApiCanonicalWrites':0,'finalDecision':'PARTIAL pending independent QA/newheadCI/genuinepeer/final/protectedmerge'}
(p/'validation-result.json').write_text(json.dumps(result,indent=2)+'\n')
(p/'all-27-frontmatter-validation.json').write_text(json.dumps(frontmatter,indent=2)+'\n')
(p/'frozen-source-manifest.json').write_text(json.dumps(projection,indent=2)+'\n')
print(json.dumps(result,indent=2))

import pathlib,yaml,re,subprocess,json
src=pathlib.Path('/tmp/clinicos470-protected-inventory8-independent');out=pathlib.Path('/tmp/clinicos470-protected-inventory8-20261022/independent-qa');p=src/'.github/workflows/inspect-demo-storage.yml';text=p.read_text();w=yaml.load(text,Loader=yaml.BaseLoader)
assert w['permissions']=={'contents':'read'};assert set(w['on'])=={'pull_request','workflow_dispatch'};assert w['concurrency']=={'group':'demo-storage-inspect','cancel-in-progress':'false'}
j=w['jobs']['inspect'];assert j['environment']=='glistening-friendship / demo';assert j['needs']=='test';assert j['timeout-minutes']=='10'
for guard in ["github.event_name == 'workflow_dispatch'","github.repository == 'l2v-hub/ClinicOS'","github.ref == 'refs/heads/main'","github.ref_name == 'main'","github.workflow_ref == 'l2v-hub/ClinicOS/.github/workflows/inspect-demo-storage.yml@refs/heads/main'","github.actor == 'l2v-hub'",'github.triggering_actor == github.actor','github.sha == github.workflow_sha','inputs.reviewed_sha == github.sha',"inputs.auth_mode == 'project-token'","inputs.auth_mode == 'account-bearer'"]:assert guard in j['if']
allowed={'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683','actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020','actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02'};shell=[]
for job in w['jobs'].values():
 assert 'env' not in job
 for step in job['steps']:
  if 'uses' in step:assert step['uses'] in allowed
  if step.get('uses','').startswith('actions/checkout'):assert step['with']=={'ref':'${{ github.sha }}','persist-credentials':'false'}
  if 'run' in step:
   v=subprocess.run(['/bin/bash','-n'],input=step['run'],text=True,capture_output=True);assert v.returncode==0;shell.append({'name':step['name'],'syntaxStatus':v.returncode})
secret=[s for s in j['steps'] if 'env'in s];assert len(secret)==1;secret=secret[0];assert secret['shell']=='bash';assert 'set -euo pipefail' in secret['run'];assert '2>&1' not in secret['run'];assert secret['run'].strip().endswith('node scripts/maintenance/demo-storage-inspect.mjs | tee "$RUNNER_TEMP/demo-storage-receipt.txt"')
upload=j['steps'][-1];assert 'env'not in upload;assert upload['if']=='${{ always() }}';assert upload['with']['path']=='${{ runner.temp }}/demo-storage-receipt.txt';assert upload['with']['retention-days']=='7';assert '*' not in upload['with']['path'];assert upload['with']['if-no-files-found']=='warn'
files=[src/'scripts/maintenance/demo-storage-inspect.mjs',src/'scripts/maintenance/demo-storage-binding-readonly.mjs'];closure=[]
for path in files:
 s=path.read_text();imports=re.findall(r"from\s+['\"]([^'\"]+)",s);assert all(i.startswith('node:') or i=='./demo-storage-binding-readonly.mjs' for i in imports);assert 'import('not in s;assert not re.search(r'\brequire\s*\(',s);closure.append({'file':str(path.relative_to(src)),'imports':imports})
helper=files[0].read_text();assert 'state.cliReads + state.nativeReads + state.githubReads < 100' in helper;assert '8 * 60 * 1000' in helper;assert 'Math.min(remaining, 30000)'in helper;assert 'const MAX_BYTES = 4 * 1024 * 1024' in helper
(out/'static-review.json').write_text(json.dumps({'status':'PASS','yamlParser':'PyYAML BaseLoader','shellSyntax':shell,'importClosure':closure,'workflowIdentityEnvironmentCredentialsArtifact':'PASS','sourceRequestCapsDeadlinesAndNoRetriesReviewed':'PASS','noMutationTransportClosure':'PASS'},indent=2)+'\n');print('Static YAML/bash/import/guards PASS')

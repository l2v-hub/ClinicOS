import pathlib,json,shutil,hashlib,os,subprocess
r=pathlib.Path('/workspace/ClinicOS/agent-team/.worktrees/bug-batch-447');p=r/'artifacts/task-validation/bug-batch-447';q=p/'independent-qa-attempt-3';initial=json.load(open(q/'initial-integrity.json'));digest=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
def stable():
 for name,sha in initial['source'].items():assert digest(r/name)==sha,name
 for name,sha in initial['contracts'].items():assert digest(p/name)==sha,name
keys=['PATH','HOME','LANG','LC_ALL','TMPDIR','TZ','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','REQUESTS_CA_BUNDLE','CURL_CA_BUNDLE','npm_config_cafile','NPM_CONFIG_CAFILE'];env={k:os.environ[k] for k in keys if k in os.environ};env['PATH']='/opt/codex/runtimes/codex-primary-runtime/dependencies/python/bin:'+env['PATH']
stable()
with open(q/'browser-lifecycle.txt','w') as log:run=subprocess.run(['flock','/tmp/clinicos-browser-qa.lock','node','/tmp/clinicos-native447-smoke.mjs'],cwd=r,env=env,stdout=log,stderr=subprocess.STDOUT)
shutil.copytree(p/'evidence',q/'browser/evidence');(q/'browser/test-results').mkdir()
for f in (p/'test-results').iterdir():
 if f.is_file() and f.name in ['browser-native-clear-scope.txt','database-provenance.json','temporary-ps-database-tests.txt','stack-result.json','native-adapter-result.json','native-adapter-failure.json','postgres-native-emulator.log','backend.local.log','frontend.local.log']:shutil.copy2(f,q/'browser/test-results'/f.name)
stable();(q/'browser-command.json').write_text(json.dumps({'exit':run.returncode,'sourceStable94':True,'contractsStable26':True},indent=2));assert run.returncode==0,'Browser acceptance failed; inspect own evidence'
intake=q/'intake-regression';intake.mkdir();shutil.copytree(p/'intake-regression/font-assets',intake/'font-assets');env.update(QA_POSTGRES_MODE='docker',PLAYWRIGHT_BROWSERS_PATH='/workspace/.cache/clinicos-batch447-playwright',PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/usr/bin/chromium')
with open(q/'intake-lifecycle.txt','w') as log:run=subprocess.run(['flock','/tmp/clinicos-browser-qa.lock','node','scripts/e2e/issue-450-ingresso.mjs',str(intake)],cwd=r,env=env,stdout=log,stderr=subprocess.STDOUT)
stable();(q/'intake-command.json').write_text(json.dumps({'exit':run.returncode,'sourceStable94':True,'contractsStable26':True},indent=2));assert run.returncode==0,'Intake acceptance failed; inspect own evidence'
print('Independent browser7 and intake19 completed;94source/26contracts stable.',flush=True)

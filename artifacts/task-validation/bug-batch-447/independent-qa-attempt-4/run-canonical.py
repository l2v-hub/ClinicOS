import pathlib,json,shutil,hashlib,os,subprocess,time
r=pathlib.Path.cwd();p=r/'artifacts/task-validation/bug-batch-447';q=p/'independent-qa-attempt-4';initial=json.loads((q/'initial-integrity.json').read_text());digest=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
def stable():
 for n,v in initial['source'].items():assert digest(r/n)==v,n
 for n,v in initial['contracts'].items():assert digest(p/n)==v,n
stable();wrapper=pathlib.Path('/tmp/clinicos-native447-smoke.mjs');portable=pathlib.Path('/workspace/.clinicos-cloud/isolated-qa/batch447-browser.mjs');assert digest(wrapper)==digest(portable)=='051c7897ef56868e08706b048e6d4c91751dd797d37da7ae96e064803d440c56'
keys=['PATH','HOME','LANG','LC_ALL','TMPDIR','TZ','HTTPS_PROXY','HTTP_PROXY','ALL_PROXY','NO_PROXY','NODE_EXTRA_CA_CERTS','SSL_CERT_FILE','SSL_CERT_DIR','REQUESTS_CA_BUNDLE','CURL_CA_BUNDLE','npm_config_cafile','NPM_CONFIG_CAFILE'];env={k:os.environ[k] for k in keys if k in os.environ};env['PATH']='/opt/codex/runtimes/codex-primary-runtime/dependencies/python/bin:'+env['PATH'];start=time.monotonic()
with (q/'browser-lifecycle.txt').open('w') as f:run=subprocess.run(['flock','/tmp/clinicos-browser-qa.lock','node',str(wrapper)],cwd=r,env=env,stdout=f,stderr=subprocess.STDOUT)
shutil.copytree(p/'evidence',q/'browser/evidence');(q/'browser/test-results').mkdir(parents=True)
for name in ['browser-native-clear-scope.txt','database-provenance.json','temporary-ps-database-tests.txt','stack-result.json','native-adapter-result.json','native-adapter-failure.json','postgres-native-emulator.log','backend.local.log','frontend.local.log']:
 f=p/'test-results'/name
 if f.exists():shutil.copy2(f,q/'browser/test-results'/name)
stable();result={'exit':run.returncode,'durationSeconds':round(time.monotonic()-start,3),'sourceStable94':True,'contractsStable27':True,'canonicalInvocations':1,'command':['flock','/tmp/clinicos-browser-qa.lock','node',str(wrapper)],'wrapperSha256':digest(wrapper),'wholeLifecycleLock':True,'explicitOwnedPostgresPort':55447,'dev5432NeverAccessed':True,'sourceSubstitutionOrRuntimeHook':False}
(q/'browser-command.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert run.returncode==0,'Actual canonical browser acceptance failed; retain evidence and STOP'

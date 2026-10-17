import pathlib,os,subprocess,json,glob,concurrent.futures
r=pathlib.Path('.').resolve();q=r/'artifacts/task-validation/issue-review-communication/independent-qa-attempt-2'
env={k:v for k,v in os.environ.items() if not any(x in k.upper() for x in ('TOKEN','SECRET','PASSWORD','API_KEY','DATABASE_URL','AUTH'))};env.update(PATH=str(q/'deny-provider-bin')+':'+env['PATH'],GH_CONFIG_DIR=str(q/'empty-gh-config'),GIT_CONFIG_GLOBAL='/dev/null',CI='true')
def run(name,args,cwd=r):
 with (q/(name+'.log')).open('w') as f:p=subprocess.run(args,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
 (q/(name+'-exit.txt')).write_text(str(p.returncode)+'\n');return {'name':name,'exit':p.returncode}
commands=[('full-regression',['node','--test',*sorted(glob.glob('agent-team/tests/bug-pipeline/*.test.mjs')),*sorted(glob.glob('scripts/quality-gate/*test.mjs'))],r),('types',['node','node_modules/typescript/bin/tsc','--noEmit'],r/'frontend'),('build',['npm','run','build'],r/'frontend')]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex: results=list(ex.map(lambda x:run(*x),commands))
(q/'build-test-results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results));raise SystemExit(any(x['exit'] for x in results))

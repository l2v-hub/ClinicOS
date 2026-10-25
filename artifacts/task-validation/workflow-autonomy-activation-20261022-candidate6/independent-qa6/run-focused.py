from pathlib import Path
import subprocess,json,time
p=Path('/tmp/clinicos-autonomy-activation-20261022');q=p/'independent-qa6';tmp=q/'owned-tmp';tmp.mkdir(mode=0o700,exist_ok=True)
node='/tmp/clinicos-node22-native12/node_modules/node/bin/node'
files=['contracts','operator-ownership','pipeline','external-review','release','github','issue-review-sync','issue-review-communication','standalone-review','standalone-review-contracts','comment-review-handoff']
args=[node,'--test','--test-reporter=tap',*[f'agent-team/tests/bug-pipeline/{x}.test.mjs' for x in files]]
env={'PATH':'/usr/bin:/bin','TMPDIR':str(tmp),'LANG':'C.UTF-8','GIT_CONFIG_GLOBAL':'/dev/null','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_COUNT':'2','GIT_CONFIG_KEY_0':'core.hooksPath','GIT_CONFIG_VALUE_0':'/dev/null','GIT_CONFIG_KEY_1':'protocol.allow','GIT_CONFIG_VALUE_1':'never'}
policy={'command':args,'cwd':str(p/'qa-source6'),'environment':env,'homeOrCodexHomeModified':False,'authority':'Parent explicitly permits only suite-owned disposable synthetic Git fixtures; no real repository/user/canonical Git or network. All provider/GitHub/model side effects injected.','sourceEdits':False}
(q/'execution-policy.json').write_text(json.dumps(policy,indent=2)+'\n')
start=time.monotonic()
with (q/'focused.log').open('w') as f:r=subprocess.run(args,cwd=p/'qa-source6',env=env,stdout=f,stderr=subprocess.STDOUT,timeout=180)
(q/'focused-command.json').write_text(json.dumps({'exitCode':r.returncode,'elapsedSeconds':time.monotonic()-start,'testFiles':files},indent=2)+'\n')
print(json.dumps({'exitCode':r.returncode,'elapsedSeconds':time.monotonic()-start}))

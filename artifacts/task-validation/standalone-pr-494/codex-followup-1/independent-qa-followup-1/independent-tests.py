import os,sys,socket,unittest,importlib.util,hashlib,gzip,io,urllib.error
from unittest.mock import patch
sys.dont_write_bytecode=True
assert not any(k in os.environ for k in ('GITHUB_TOKEN','GH_TOKEN','CODEX_API_KEY','ANTHROPIC_API_KEY','HTTPS_PROXY','HTTP_PROXY'))
def denied(*a,**k): raise AssertionError('NETWORK_BLOCKED')
socket.socket=denied; socket.create_connection=denied
p='/workspace/clinicos-topology-receipt/scripts/automation/recover-demo-topology-receipt.py'
s=importlib.util.spec_from_file_location('candidate',p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
def log(title='hostile case',prefix='',extra=''):
 lines=['outside '+extra,'##[group]Run '+m.CI_COMMAND,'not ok 1 - '+title,'  ---','  location: agent-team/tests/bug-pipeline/standalone-review.test.mjs:42:3','  code: ERR_ASSERTION','  operator: strictEqual','  failureType: testCodeFailure','  ...','# tests 1','# pass 0','# fail 1','# cancelled 0','# skipped 0','# todo 0','##[error]Process completed with exit code 1.']
 return (prefix+'\n'.join('2026-10-18T17:00:00.123Z '+x for x in lines)+'\n').encode()
class Cases(unittest.TestCase):
 def reject(self,raw,code=None):
  with self.assertRaises(m.RecoveryError) as e:m.parse_ci_log(raw)
  if code:self.assertEqual(str(e.exception),code)
 def test_plain_colored_gzip(self):
  raw=log('\x1b[31mhostile\x1b[0m case', '\ufeff', '\x1b[32mgreen\x1b[m')
  self.assertEqual(m.parse_ci_log(raw),m.parse_ci_log(log()))
  self.assertEqual(m.parse_ci_log(gzip.compress(raw)),m.parse_ci_log(log()))
  self.assertEqual(m.parse_ci_log(raw)['failures'][0]['testTitleSha256'],hashlib.sha256(b'hostile case').hexdigest())
 def test_fetched_raw_digest_independent(self):
  run={'id':m.CI_RUN,'run_attempt':2,'head_sha':m.CI_HEAD,'head_branch':m.CI_BRANCH,'status':'completed','conclusion':'failure','event':'pull_request','path':'.github/workflows/bug-pipeline-tests.yml','repository':{'full_name':m.REPO,'id':m.REPO_ID},'head_repository':{'full_name':m.REPO,'id':m.REPO_ID},'created_at':'2026-10-18T16:00:00Z','updated_at':'2026-10-18T18:00:00Z'}
  job={'id':m.CI_JOB,'run_id':m.CI_RUN,'run_attempt':2,'head_sha':m.CI_HEAD,'name':'bug-pipeline-tests','status':'completed','conclusion':'failure','started_at':'2026-10-18T16:30:00Z','completed_at':'2026-10-18T17:30:00Z','steps':[{'name':m.CI_STEP,'status':'completed','conclusion':'failure','number':3,'started_at':'2026-10-18T16:45:00Z','completed_at':'2026-10-18T17:15:00Z'}]}
  raw=gzip.compress(log('\x1b[31mhostile case\x1b[0m', '\ufeff'))
  class Client:
   def api(self,route):return job if '/jobs/' in route else run
   def job_log(self):return raw
  body=m.ci_comment(Client())
  import json
  payload=json.loads(body.split('```json\n')[1].split('\n```')[0])
  self.assertEqual(payload['fetchedBytes'],len(raw));self.assertEqual(payload['fetchedBytesSha256'],hashlib.sha256(raw).hexdigest())
  self.assertEqual(payload['failures'][0]['testTitleSha256'],hashlib.sha256(b'hostile case').hexdigest())
  self.assertNotIn('hostile case',body)
 def test_hostile_controls(self):
  for bad in ('\x00','\x1b','\x1b]0;title\x07','\x1b[2J','\ufeff','\rinterior','\x1b[1:2m','\x1b['+'1'*65+'m'):
   with self.subTest(bad=repr(bad)):self.reject(log(extra=bad),'LOG_CONTROL')
  self.reject(log(prefix='\ufeff\ufeff'),'LOG_CONTROL')
  self.reject(log()+b'\xff','LOG_ENCODING')
 def test_sgr_bounds(self):
  self.assertEqual(m.parse_ci_log(log(extra='\x1b['+'1'*64+'m')),m.parse_ci_log(log()))
  # Spread SGR over valid timestamped lines to stay below the line-byte limit.
  raw=log(); lines=raw.splitlines(); lines[:0]=[b'2026-10-18T17:00:00Z '+b'\x1b[m'*100]*40+[b'2026-10-18T17:00:00Z '+b'\x1b[m'*96]
  m.parse_ci_log(b'\n'.join(lines)); lines.insert(0,b'2026-10-18T17:00:00Z \x1b[m');self.reject(b'\n'.join(lines),'LOG_SGR_LIMIT')
 def test_limits_compression(self):
  self.reject(b'x'*(m.MAX_LOG+1),'LOG_SIZE');self.reject(log(extra='x'*8200),'LOG_LINE_SIZE')
  self.reject(gzip.compress(b'x'*(m.MAX_LOG+1)),'LOG_EXPANSION')
  self.reject(gzip.compress(log())+b'trailing','LOG_EXPANSION')
  self.reject(gzip.compress(log())[:-4],'LOG_EXPANSION')
 def test_http_codes_and_suppression(self):
  for auth in (True,False):
   for status in (403,404,410,503,True,'403',99,600):
    class Opener:
     def open(self,*a,**k):raise urllib.error.HTTPError('https://private.invalid/?signature=NEVER_PRINT',status,'NEVER_PRINT',{'Authorization':'NEVER_PRINT'},io.BytesIO(b'NEVER_PRINT'))
    c=m.GitHub('synthetic-local-credential');c.opener=Opener()
    with self.assertRaises(m.RecoveryError) as e:c.request('https://api.github.com/repos/'+m.REPO+'/test' if auth else 'https://x.blob.core.windows.net/?signature=NEVER_PRINT',authenticated=auth)
    self.assertEqual(str(e.exception),('API' if auth else 'STORAGE')+'_HTTP_'+(str(status) if type(status)is int and 100<=status<=599 else 'STATUS_INVALID'))
    self.assertNotIn('NEVER_PRINT',str(e.exception))
 def test_expiry_before_archive(self):
  run=dict(id=m.RUN,run_attempt=m.ATTEMPT,head_sha=m.SOURCE_SHA,head_branch='main',status='completed',conclusion='success',event='workflow_dispatch',path='.github/workflows/inspect-demo-source-topology.yml',repository={'full_name':m.REPO,'id':m.REPO_ID},head_repository={'full_name':m.REPO,'id':m.REPO_ID},created_at='2026-10-18T00:00:00Z',updated_at='2026-10-18T01:00:00Z')
  class Client:
   def api(self,route):return {'expired':True} if 'artifacts' in route else run
   def archive(self):raise AssertionError('ARCHIVE_CALLED')
  with self.assertRaisesRegex(m.RecoveryError,'^ARTIFACT_EXPIRED$'):m.topology_comment(Client(),())
 def test_idempotence_foreign_conflict_freshness_lost_post(self):
  sha='a'*40;env={'GITHUB_EVENT_NAME':'workflow_dispatch','GITHUB_REPOSITORY':m.REPO,'GITHUB_REF':'refs/heads/main','GITHUB_SHA':sha,'RECOVERY_REVIEWED_SHA':sha}
  body=m.MARKER+'\nindependent projected body'
  class Client:
   def __init__(self):self.comments=[{'body':m.MARKER,'user':{'login':'foreign','type':'User'}}];self.posts=0;self.refs=0;self.move=False;self.lost=False
   def api(self,route,data=None):
    if route=='git/ref/heads/main':
     self.refs+=1;return {'ref':'refs/heads/main','object':{'type':'commit','sha':'b'*40 if self.move and self.refs==2 else sha}}
    if data is None:return self.comments
    self.posts+=1;r={'body':data['body'],'user':{'login':'github-actions[bot]','type':'Bot'}};self.comments.append(r)
    if self.lost:raise m.RecoveryError('API_HTTP_FAILED')
    return r
  with patch.object(m,'topology_comment',return_value=body):
   c=Client();self.assertEqual(m.recover(c,env),'published');self.assertEqual(m.recover(c,env),'already-published');self.assertEqual(c.posts,1)
   for user,content in (({'login':'github-actions[bot]','type':'User'},body),({'login':'github-actions[bot]','type':'Bot'},body+'conflict'),({},body)):
    c=Client();c.comments=[{'body':content,'user':user}]
    with self.assertRaises(m.RecoveryError):m.recover(c,env)
    self.assertEqual(c.posts,0)
   c=Client();c.move=True
   with self.assertRaisesRegex(m.RecoveryError,'^MAIN_MOVED$'):m.recover(c,env)
   self.assertEqual(c.posts,0)
   c=Client();c.lost=True
   with self.assertRaisesRegex(m.RecoveryError,'^API_HTTP_FAILED$'):m.recover(c,env)
   self.assertEqual(m.recover(c,env),'already-published');self.assertEqual(c.posts,1)
if __name__=='__main__':unittest.main(verbosity=2)

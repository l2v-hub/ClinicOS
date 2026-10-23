import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '/workspace/ClinicOS/node_modules/playwright/index.mjs';
import { createGitHub } from '../../../../agent-team/src/bug-pipeline/github.mjs';
import { createCommentReviewHandoff } from '../../../../agent-team/src/bug-pipeline/comment-review-handoff.mjs';
import { createIssueReviewCommunication, REVIEW_LABELS } from '../../../../agent-team/src/bug-pipeline/issue-review-communication.mjs';
import { externalReport, externalReviewStep } from '../../../../agent-team/src/bug-pipeline/external-review.mjs';
import { createWorkspace } from '../../../../agent-team/src/bug-pipeline/workspace.mjs';
import { dashboardSnapshot } from '../../../../agent-team/src/bug-pipeline/dashboard.mjs';
import { fixture } from '../independent-qa/qa-fixture.mjs';

// Independent loopback-only synthetic GitHub server. Actual GitHub adapter, state store,
// handoff, communication, dashboard, external controller and Git workspace are imported.
// Model conclusions and correction execution are declared synthetic callbacks, not Max.
const out = path.dirname(new URL(import.meta.url).pathname), repo='l2v-hub/ClinicOS';
const tmp = await mkdtemp(path.join(os.tmpdir(),'clinicos-independent-handoff-'));
const git=(args,cwd=tmp)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
let server,browser,context;
let actor='maintainer', permission='write', serial=300, version=1, state, issues, reviews, pr;
const history=[], actions=[];
let finalVerdict='verified';
try {
  git(['init','-b','main']); git(['config','user.name','Synthetic QA']);git(['config','user.email','qa@example.invalid']);
  await mkdir(path.join(tmp,'src'),{recursive:true});await writeFile(path.join(tmp,'src/feature.ts'),'export const selection = true;\n');
  const packet='artifacts/task-validation/bug-batch-17';
  await mkdir(path.join(tmp,packet),{recursive:true});await writeFile(path.join(tmp,packet,'codex-independent-qa.md'),'# Immutable previous packet\n');
  git(['add','.']);git(['commit','-m','Synthetic fixture']);
  const sha=git(['rev-parse','HEAD']);
  const wt=path.join(tmp,'agent-team','.worktrees','bug-batch-17');await mkdir(path.dirname(wt),{recursive:true});
  git(['worktree','add','-b','codex/bug-batch-17',wt]);await mkdir(path.join(wt,'node_modules'));
  const batch=structuredClone(fixture().batch);batch.sha=sha;batch.baseSha=sha;batch.externalReview.subjectSha=sha;batch.packetHashes={};
  state={schemaVersion:1,repository:repo,batches:[batch]};
  issues=new Map([17,81].map(number=>[number,{number,state:'open',...(number===81?{pull_request:{}}:{}),labels:[{name:'In progress'},{name:'unrelated-clinical'}],comments:[]}]));
  reviews=[];pr={number:81,state:'open',draft:false,merged:false,created_at:'2026-10-17T00:00:00.000Z',head:{sha,ref:batch.branch,repo:{full_name:repo,fork:false}},base:{ref:'main'}};
  const labels=REVIEW_LABELS.map(name=>({name}));
  async function api(endpoint,method,body,login){
    const e=endpoint.split('?')[0], at=()=>({id:++serial,user:{login,type:'User'},created_at:'2026-10-17T12:00:00.000Z'});
    if(e==='user')return {login};
    if(e==='graphql')return {data:{repository:{pullRequest:{reviewThreads:{pageInfo:{hasNextPage:false},nodes:[]}}}}};
    if(/\/collaborators\/[^/]+\/permission$/.test(e))return {permission};
    if(e.includes('/git/ref/heads/'))return {object:{sha}};
    if(e.includes('/contents/.codex-bug-state.json')){
      if(method==='GET')return {type:'file',sha:`v${version}`,content:Buffer.from(JSON.stringify(state)).toString('base64')};
      assert.equal(body.sha,`v${version}`,'CAS must reject old version');state=JSON.parse(Buffer.from(body.content,'base64'));version++;return {content:{sha:`v${version}`}};
    }
    if(e.includes('/git/trees/'))return {truncated:false,tree:[{type:'blob',path:'src/feature.ts'}]};
    if(e.includes('/commits/'))return {sha:pr.head.sha,commit:{committer:{date:'2026-10-17T00:00:00.000Z'}}};
    if(e===`repos/${repo}/labels`)return labels;
    if(e===`repos/${repo}/pulls/81`)return pr;
    if(e===`repos/${repo}/pulls/81/comments`)return [];
    if(e===`repos/${repo}/pulls/81/reviews`){if(method==='POST'){const v={...at(),...body,state:'COMMENTED',submitted_at:'2026-10-17T12:00:00.000Z'};reviews.push(v);return v}return reviews;}
    const match=e.match(/\/issues\/(\d+)(?:\/(comments|labels)(?:\/(.*))?)?$/);
    assert.ok(match,`Unexpected synthetic endpoint ${e}`);const issue=issues.get(Number(match[1]));assert.ok(issue);
    if(!match[2])return {...issue,comments:undefined};
    if(match[2]==='comments'){if(method==='POST'){const v={...at(),body:body.body};issue.comments.push(v);return v}return issue.comments;}
    if(method==='POST'){for(const name of body.labels)if(!issue.labels.some(v=>v.name===name))issue.labels.push({name});}
    if(method==='DELETE')issue.labels=issue.labels.filter(v=>v.name!==decodeURIComponent(match[3]));
    return issue.labels;
  }
  let origin;
  const run=async call=>{
    if(call.args[0]==='pr'&&call.args[1]==='checks')return {ok:true,stdout:JSON.stringify([{name:'synthetic-required-check',state:'SUCCESS',bucket:'pass'}])};
    assert.equal(call.command,'gh');assert.equal(call.args[0],'api');
    const method=call.args.includes('-X')?call.args[call.args.indexOf('-X')+1]:'GET';
    const r=await fetch(`${origin}/api`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:call.args[1],method,body:call.input?JSON.parse(call.input):undefined,actor})});
    const result=await r.json();if(!result.ok)return {ok:false,stderr:result.error};
    return {ok:true,stdout:JSON.stringify(call.args.includes('--slurp')?[result.value]:result.value)};
  };
  const github=createGitHub({cwd:tmp,repo,run});
  const handoff=createCommentReviewHandoff({github,run,cwd:tmp});
  const communication=createIssueReviewCommunication({github,run,cwd:tmp,readReport:externalReport});
  const workspace=createWorkspace({root:tmp,repo,models:{qa:async()=>({status:finalVerdict,summary:'Independent synthetic final QA result; no live model called.'})},run:async call=>{
    if(call.command==='git'&&call.args[0]==='fetch')return {ok:true,stdout:''};
    try{return {ok:true,stdout:execFileSync(call.command,call.args,{cwd:call.cwd,encoding:'utf8'})}}catch(e){return {ok:false,stderr:e.stderr??''}};
  }});
  const snapshot=()=>({dashboard:dashboardSnapshot({repo,state,issues:[issues.get(17)],queue:[],setup:{merged:true}}),prLabels:issues.get(81).labels.map(v=>v.name),issueLabels:issues.get(17).labels.map(v=>v.name),attempt:state.batches[0].reviews.at(-1),external:state.batches[0].externalReview,history,actions,dirty:git(['status','--porcelain'],wt)});
  async function action(name){
    const b=()=>state.batches[0];let result;
    if(name==='request'){actor='maintainer';result=await handoff.request(81);}
    else if(name==='claim'){actor='review-bot';result=await handoff.claim(81);}
    else if(name==='duplicate')await assert.rejects(handoff.claim(81),/not available/);
    else if(name==='stale'){await assert.rejects(handoff.submit(81,{subject_sha:'f'.repeat(40),verdict:'approved',summary:'Stale review',findings:[]}));result='Rejected stale SHA';}
    else if(name==='unauthorized'){permission='read';try{await assert.rejects(handoff.submit(81,{subject_sha:sha,verdict:'approved',summary:'Unauthorized review',findings:[]}));result='Rejected unauthorized actor';}finally{permission='write';}}
    else if(name==='submit')result=await handoff.submit(81,{subject_sha:sha,verdict:'approved',summary:'Synthetic exact-source approval for independent protocol QA',findings:[]});
    else if(name==='reconcile'){actor='maintainer';result=await handoff.reconcilePR(81);assert.equal(result.externalReview.feedbackChanged,false);}
    else if(name==='codex'||name==='codex-findings'){
      finalVerdict=name==='codex'?'verified':'changes-requested';
      if(name==='codex-findings'){b().codexFinalReview=null;b().phase='waiting-review';}
      const store=github.createStateStore();let subject=await store.load(),current=subject.batches[0];
      const ws={...workspace,execute:async()=>{actions.push('correct');return {status:'implemented'}},verify:async()=>actions.push('test'),simplify:async()=>{actions.push('simplify');return {status:'implemented'}},qa:async()=>{actions.push('independent-qa');return {status:'verified'}},checkpoint:async()=>{actions.push('checkpoint');pr.head.sha='b'.repeat(40);return pr.head.sha},publish:async()=>actions.push('publish'),issueEvidence:async()=> 'Declared synthetic callback evidence'};
      await externalReviewStep({repo,batch:current,gh:github,workspace:ws,communication,save:options=>store.save(subject,options),report:async()=>{},block:async(_,reason)=>{throw Error(reason)}});
      assert.equal(git(['status','--porcelain'],wt),'','Real finalQa/prepare must leave reviewed worktree clean');
      result=current.phase;
    } else throw Error('Unknown QA action');
    await communication.publishState(b());history.push({name,phase:b().phase,label:issues.get(81).labels.find(v=>REVIEW_LABELS.includes(v.name))?.name,rounds:b().reviews.length});return {result,...snapshot()};
  }
  const html=`<!doctype html><meta charset="utf-8"><title>ClinicOS — independent synthetic protocol QA</title><style>body{font:16px system-ui;margin:36px;background:#eff6ff;color:#12324d}button{margin:4px;padding:10px;background:#dbeafe;border:1px solid #64748b}pre{background:white;padding:20px;white-space:pre-wrap}#result{max-height:300px;overflow:auto}h1{font-size:25px}</style><h1>ClinicOS review handoff — synthetic QA only</h1><p>No live GitHub, Claude Max, deploy, database or patients.</p><div>${['request','claim','duplicate','stale','unauthorized','submit','reconcile','codex','codex-findings'].map(n=>'<button data-action="'+n+'">'+n+'</button>').join('')}</div><pre id="summary"></pre><pre id="result"></pre><script>function render(v){const s=v.dashboard.rows[0];document.querySelector("#summary").textContent=JSON.stringify({phase:s.phase,status:s.status,sha:s.sha,implementation:s.implementation,reviews:s.reviews,prLabels:v.prLabels,issueLabels:v.issueLabels,dirtyWorktree:v.dirty,history:v.history},null,2);document.querySelector("#result").textContent=JSON.stringify(v,null,2)}async function refresh(){const r=await fetch('/snapshot');render(await r.json())}document.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const r=await fetch('/action/'+b.dataset.action,{method:'POST'});const v=await r.json();render(v);document.body.dataset.last=b.dataset.action;});refresh()</script>`;
  server=http.createServer(async(req,res)=>{try{
    if(req.url==='/api'){let body='';for await(const c of req)body+=c;const p=JSON.parse(body);res.setHeader('content-type','application/json');try{res.end(JSON.stringify({ok:true,value:await api(p.endpoint,p.method,p.body,p.actor)}));}catch(e){res.end(JSON.stringify({ok:false,error:e.message}));}return;}
    if(req.url==='/snapshot'){res.setHeader('content-type','application/json');res.end(JSON.stringify(snapshot()));return;}
    if(req.url.startsWith('/action/')){res.setHeader('content-type','application/json');const value=await action(req.url.slice(8));res.end(JSON.stringify(value));return;}
    res.setHeader('content-type','text/html');res.end(html);
  }catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  context=await browser.newContext({viewport:{width:1365,height:1000},recordVideo:{dir:path.join(out,'video'),size:{width:1365,height:1000}}});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('dashboard'));
  const click=async name=>{await page.locator(`[data-action="${name}"]`).click();await page.waitForFunction(n=>document.body.dataset.last===n,name);return JSON.parse(await page.locator('#result').textContent());};
  const projected=(s,label)=>{for(const names of [s.prLabels,s.issueLabels]){assert.equal(names.filter(n=>REVIEW_LABELS.includes(n)).join(','),label);assert.ok(names.includes('In progress'));assert.ok(names.includes('unrelated-clinical'));}};
  projected(await click('request'),'claude-review-ready');projected(await click('claim'),'claude-reviewing');
  assert.equal((await click('duplicate')).attempt.round,1);assert.equal((await click('stale')).attempt.status,'running');assert.equal((await click('unauthorized')).attempt.status,'running');
  await click('submit');const handed=await click('reconcile');projected(handed,'codex-review-ready');assert.equal(handed.external.feedbackChanged,false);assert.equal(handed.dashboard.rows[0].phase,'codex-review-ready · controllo Codex');
  await page.screenshot({path:path.join(out,'01-codex-review-ready.png'),fullPage:true});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('codex-review-ready'));const reloaded=JSON.parse(await page.locator('#result').textContent());projected(reloaded,'codex-review-ready');
  const approved=await click('codex');assert.equal(approved.dashboard.rows[0].phase,'Pronto al rilascio');assert.equal(approved.dirty,'');
  await page.screenshot({path:path.join(out,'02-independent-codex-approved.png'),fullPage:true});
  const corrected=await click('codex-findings');assert.equal(corrected.external.status,'comment-requested');projected(corrected,'claude-review-ready');assert.deepEqual(corrected.actions,['correct','test','simplify','test','independent-qa','checkpoint','publish']);assert.equal(corrected.dashboard.rows[0].implementation,2);assert.equal(corrected.dashboard.rows[0].reviews,1);assert.equal(corrected.dashboard.rows[0].sha,'b'.repeat(40));
  await page.screenshot({path:path.join(out,'03-correction-new-sha.png'),fullPage:true});
  assert.deepEqual(errors,[]);await context.tracing.stop({path:path.join(out,'trace.zip')});await context.close();context=null;await browser.close();browser=null;
  await writeFile(path.join(out,'browser-result.json'),JSON.stringify({status:'PASS',scope:'Actual browser and production modules, loopback synthetic GitHub transport and declared synthetic model/correction callbacks; real Git finalQa/prepare; no actual Max or deploy',flows:9,errors,history,actions,final:snapshot()},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',flows:9,errors,final:state.batches[0].phase,history}));
} finally {if(context)await context.close();if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));await rm(tmp,{recursive:true,force:true});}

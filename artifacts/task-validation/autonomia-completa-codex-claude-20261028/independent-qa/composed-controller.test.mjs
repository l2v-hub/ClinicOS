import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline } from '../../../../agent-team/src/bug-pipeline/pipeline.mjs';
import { createGitHub } from '../../../../agent-team/src/bug-pipeline/github.mjs';
import {
  recordDeployment,
  captureReleaseReviewProof,
  releaseBatch,
  selectAutoReleaseBatch,
  publicationComplete,
} from '../../../../agent-team/src/bug-pipeline/release.mjs';
import { feedbackFingerprint, planSchema, sha256 } from '../../../../agent-team/src/bug-pipeline/contracts.mjs';
import { adaptivePlanningSchema, validateWorkItems } from '../../../../agent-team/src/bug-pipeline/work-items.mjs';

const repo = 'l2v-hub/ClinicOS';
const sha = (letter) => letter.repeat(40);
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function planFor(issues = [17, 18]) {
  const batch = Math.min(...issues);
  return {
    groups: [
      {
        title: 'Stabilize the patient list filter',
        feature: 'Patient list',
        rationale: 'The related reports share the same filter behavior.',
        execution: {
          difficulty: 'low',
          mode: 'delegate',
          reason: 'Bounded, independently testable change.',
        },
        analysis:
          'Both issues describe the same feature regression with separate reproduction details.',
        issues: [...issues],
        scope: ['frontend/src/features/patients/filter.ts'],
        fileMap: issues.map((issue) => ({
          issue,
          files: ['frontend/src/features/patients/filter.ts'],
        })),
        separationReason: '',
        acceptance: issues.map((issue) => ({
          issue,
          criteria: [`Issue #${issue} reproduces and is fixed`],
        })),
        tasks: [
          {
            title: 'Fix and cover filter behavior',
            files: ['frontend/src/features/patients/filter.ts'],
            steps: ['Correct filter state handling', 'Add regression coverage'],
          },
        ],
        verification: [
          {
            command: 'node',
            args: ['--test', 'frontend/src/features/patients/filter.test.mjs'],
          },
          { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        ],
        evidence: issues.map((issue) => ({
          issue,
          screenshot: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${issue}.png`,
          trace: `artifacts/task-validation/bug-batch-${batch}/evidence/issue-${issue}-trace.zip`,
          video: '',
        })),
      },
    ],
    blocked: [],
  };
}

function blankState() {
  return { schemaVersion: 1, repository: repo, batches: [] };
}

function batchFor({ issues = [17, 18], phase = 'ready', head = sha('a'), reviews = [] } = {}) {
  const plan = planFor(issues).groups[0];
  return {
    id: `bug-batch-${Math.min(...issues)}`,
    branch: `codex/bug-batch-${Math.min(...issues)}`,
    issues,
    plan,
    phase,
    implementation: [{ round: 1, status: 'passed' }],
    reviews,
    sha: head,
    pr: { number: 81, url: 'https://github.com/l2v-hub/ClinicOS/pull/81' },
  };
}

function openFeedback(batch, overrides = {}) {
  return {
    state: 'OPEN',
    isDraft: false,
    headRef: batch.branch,
    baseRef: 'main',
    headIsFork: false,
    headRepo: repo,
    head: batch.sha,
    comments: [],
    unresolved: false,
    changesRequested: false,
    ...overrides,
  };
}

function harness({
  issues = [17, 18],
  initialState = null,
  queue = issues,
  plan = null,
  executeResults = [],
  reviews = [],
  checks = [true],
  now = () => 1_000_000,
  triageWindowMs = 0,
  feedback,
  failSave = false,
  adaptiveWorkItems = { enabled: false, maxParallel: 2 },
} = {}) {
  const log = [];
  const stateRef = { value: clone(initialState) };
  const counts = {
    plan: 0,
    execute: 0,
    simplify: 0,
    verify: 0,
    review: 0,
    checks: 0,
  };
  let saveCount = 0;
  const hydrated = [];
  const issueComments = [];
  const planningInput = [];
  let currentBatch = null;
  let checkpoint = 0;
  const nextSha = () => sha(String.fromCharCode('a'.charCodeAt(0) + checkpoint++));

  const store = {
    async load() {
      log.push('store.load');
      return clone(stateRef.value);
    },
    async save(state) {
      log.push('store.save');
      saveCount += 1;
      if (failSave === true || (typeof failSave === 'number' && saveCount >= failSave))
        throw new Error('injected remote compare-and-swap conflict');
      stateRef.value = clone(state);
    },
  };
  const gh = {
    async setIssueStatus(number, status) {
      log.push(`gh.setIssueStatus:${number}:${status}`);
    },
    async draftReady() {
      log.push('gh.draftReady');
    },
    async intake(event) {
      log.push('gh.intake');
      assert.deepEqual(event, { action: 'test' });
    },
    async discoverQueue() {
      log.push('gh.discoverQueue');
      return queue;
    },
    async viewIssue(number) {
      log.push(`gh.viewIssue:${number}`);
      const item = {
        number,
        state: 'open',
        title: `Bug ${number}`,
        body: `Hydrated issue body for #${number}`,
        labels: [{ name: 'bug' }, { name: 'codex-triage' }, { name: 'codex-run' }],
        comments: [
          {
            id: number * 10,
            body: `Hydrated comment for #${number}`,
            user: { login: 'reporter' },
          },
        ],
      };
      hydrated.push(item);
      return item;
    },
    async commentIssue(number, body) {
      log.push(`gh.commentIssue:${number}`);
      issueComments.push({ number, body });
      return { number, body };
    },
    async createDraft(data) {
      log.push('gh.createDraft');
      assert.equal(data.branch, `codex/bug-batch-${Math.min(...issues)}`);
      return { number: 81, url: 'https://github.com/l2v-hub/ClinicOS/pull/81' };
    },
    async reviewFeedback(number) {
      log.push('gh.reviewFeedback');
      assert.equal(number, 81);
      const target =
        currentBatch ??
        stateRef.value?.batches?.find((candidate) => candidate.pr?.number === number);
      return feedback ? feedback({ batch: target, log }) : openFeedback(target);
    },
    async commentPR(number, body) {
      log.push('gh.commentPR');
      assert.equal(number, 81);
      assert.match(body, /Claude review/);
    },
    async requiredChecks(number) {
      log.push('gh.requiredChecks');
      assert.equal(number, 81);
      const check = checks[Math.min(counts.checks, checks.length - 1)];
      counts.checks += 1;
      return { ok: Boolean(check) };
    },
  };
  const workspace = {
    root: '/tmp/clinicos-pipeline-test',
    async qa() {
      log.push('workspace.qa');
      return {
        status: 'verified',
        summary: 'Independent acceptance/evidence review.',
      };
    },
    async prepare(batch) {
      log.push('workspace.prepare');
      currentBatch = batch;
    },
    async execute(batch, options) {
      log.push(`workspace.execute:${options.phase}:${options.round}`);
      counts.execute += 1;
      const result = executeResults[Math.min(counts.execute - 1, executeResults.length - 1)] ?? {
        status: 'implemented',
        summary: 'done',
      };
      return typeof result === 'function' ? result(batch, options) : result;
    },
    async verify() {
      log.push('workspace.verify');
      counts.verify += 1;
    },
    async simplify() {
      log.push('workspace.simplify');
      counts.simplify += 1;
      return { status: 'implemented', summary: 'simplified' };
    },
    async checkpoint(batch) {
      log.push('workspace.checkpoint');
      batch.sha = nextSha();
      return batch.sha;
    },
    async publish(batch) {
      log.push('workspace.publish');
      assert.equal(batch.sha.length, 40);
    },
    prBody() {
      return 'Draft evidence';
    },
    reviewBody(batch, result) {
      return `Claude review ${batch.reviews.length}/4: ${result.verdict}`;
    },
    async issueEvidence(batch) {
      log.push('workspace.issueEvidence');
      return batch.issues.map((number) => `Evidence for #${number}`).join('\n');
    },
    async review(batch) {
      log.push('workspace.review');
      counts.review += 1;
      const result = reviews[Math.min(counts.review - 1, reviews.length - 1)] ?? {
        verdict: 'approved',
        summary: 'Reviewed current SHA.',
        findings: [],
      };
      return { subject_sha: batch.sha, ...result };
    },
  };
  const models = {
    async plan(input) {
      log.push('models.plan');
      counts.plan += 1;
      assert.equal(input.cwd, workspace.root);
      assert.equal(input.issues.length, issues.length);
      assert.deepEqual(
        input.scopeSchema,
        adaptiveWorkItems.enabled ? adaptivePlanningSchema : planSchema,
      );
      for (const issue of input.issues) {
        assert.match(issue.body, new RegExp(`Hydrated issue body for #${issue.number}`));
        assert.equal(issue.comments[0].body, `Hydrated comment for #${issue.number}`);
        planningInput.push({
          number: issue.number,
          body: issue.body,
          comment: issue.comments[0].body,
        });
      }
      return plan ?? planFor(issues);
    },
    async execute() {
      throw new Error('pipeline must use the workspace executor');
    },
  };
  return {
    log,
    store,
    gh,
    workspace,
    models,
    stateRef,
    counts,
    hydrated,
    issueComments,
    planningInput,
    run: (event = { action: 'test' }, reviewMode = 'internal') =>
      runPipeline({
        repo,
        event,
        gh,
        models,
        workspace,
        store,
        reviewMode,
        now,
        triageWindowMs,
        adaptiveWorkItems,
      }),
  };
}


import { runWithIntakeContinuation } from '../../../../agent-team/src/bug-pipeline/intake-continuation.mjs';
import { runWorkItems } from '../../../../agent-team/src/bug-pipeline/work-items.mjs';
import { authorizationBinding } from '../../../../agent-team/src/bug-pipeline/operator-authorization.mjs';
import { exportKnownFailedOutputs } from '../../../../agent-team/src/bug-pipeline/cli.mjs';
import { writeFile, readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runBugReview } from '../../../../scripts/quality-gate/claude-bug-review.mjs';
import { externalReviewStep } from '../../../../agent-team/src/bug-pipeline/external-review.mjs';
import { reviewExternalBatch } from '../../../../agent-team/src/bug-pipeline/claude-review-cron.mjs';

const qaEvents = [];
test('independent composition: one event, durable quiet intake, actual graph host, correction and fresh review without graph replay', async (t) => {
  const planned = planFor([17]);
  planned.groups[0].tasks.push({title:'Second ordered criterion',files:[...planned.groups[0].scope],steps:['Complete second bounded edit']});
  const graph = {issues:[17],nodes:['first','second'].map((id,index)=>({id,title:id,issues:[17],taskIndexes:[index],criteriaRefs:[{issue:17,index:0}],dependsOn:index?['first']:[],scope:[...planned.groups[0].scope],readFiles:[],difficulty:'low',risk:{level:'low',reason:'Synthetic controlled fixture'},coupling:{level:'ordered',reason:'Shared file ordered'},conflictKeys:[],routePreference:'senior',verificationIndexes:[0,1],summary:'Synthetic '+id}))};
  let clock = 0, passes = 0, childCalls = 0, graphHead = sha('1');
  const h = harness({issues:[17],plan:{plan:planned,workGraphs:[graph]},triageWindowMs:120000,now:()=>clock,adaptiveWorkItems:{enabled:true,maxParallel:2},reviews:[{verdict:'changes-requested',summary:'Synthetic missing criterion',findings:[{severity:'medium',file:planned.groups[0].scope[0],line:1,problem:'Synthetic incomplete behavior',requested_change:'Complete accepted criterion',test_expectation:'Both criteria pass'}]},{verdict:'approved',summary:'Synthetic approved changed head',findings:[]}]});
  const profile = {id:'qa-senior',provider:'codex',model:'synthetic-model',tier:'senior',ready:true,limit:1,availability:'cli-preflight-not-inference-verified'};
  const childWorkspace = {
    integrationHead:async()=>graphHead,
    coordinates:(b,item,r)=>({cwd:'/synthetic/'+item.id+'-'+r.nonce,branch:'codex/'+item.id+'-'+r.nonce,packet:'artifacts/task-validation/bug-batch-17'}),
    prepareChild:async({item})=>{qaEvents.push('prepare:'+item.id);return {checkpoint:{packetHashes:{}}};},
    captureChildCheckpoint:async({reservation})=>({head:reservation.sourceIntegrationSha,output:{}}),
    checkpointChild:async({item})=>({sha:item.id==='first'?sha('2'):sha('3'),manifest:{synthetic:item.id}}),
    integrateChild:async({item,childSha,beforeSha})=>{assert.equal(graphHead,beforeSha);graphHead=childSha;qaEvents.push('integrate:'+item.id);return {sha:graphHead};},
    inspectIntegration:async()=>{}
  };

  const syntheticRun = (batch,cwd,verdict) => async ({command,args})=> {
    if(command==='git') {
      if(args[0]==='rev-parse') return {ok:true,stdout:args[1]==='--show-toplevel'?cwd:batch.sha};
      return {ok:true,stdout:args[0]==='ls-files'?batch.plan.scope.join('\0')+'\0':''};
    }
    assert.equal(command,'claude');
    if(args[0]==='--help')return {ok:true,stdout:'--print --output-format --json-schema --tools --permission-mode --restricted --setting-sources --strict-mcp-config --mcp-config'};
    if(args[0]==='auth')return {ok:true,stdout:'{"loggedIn":true}'};
    assert(args.includes('--print'));
    const durable=h.stateRef.value.batches[0];assert.equal(durable.reviews.at(-1).status,'running');assert.equal(durable.reviews.at(-1).subjectSha,batch.sha);
    qaEvents.push('synthetic-review:'+verdict+':'+batch.sha);
    return {ok:true,stdout:JSON.stringify({structured_output:{subject_sha:batch.sha,verdict,summary:'Synthetic exact-SHA worker report',findings:verdict==='approved'?[]:[{severity:'medium',file:batch.plan.scope[0],line:1,problem:'Synthetic accepted criterion missing',requested_change:'Complete accepted behavior',test_expectation:'Both checks pass'}]}})};
  };
  const reviewRoot=await mkdtemp(fileURLToPath(new URL('./synthetic-reviews-',import.meta.url)));
  t.after(()=>rm(reviewRoot,{recursive:true,force:true}));
  const reviewPacket='artifacts/task-validation/bug-batch-17';
  const prepareReview=async(name)=>{const cwd=reviewRoot+'/'+name;await mkdir(cwd+'/'+reviewPacket,{recursive:true});for(const file of ['task-contract.md','implementation-plan.md'])await writeFile(cwd+'/'+reviewPacket+'/'+file,'Synthetic acceptance only');return cwd;};
  const priorPrepare=h.workspace.prepare;
  h.workspace.prepare=async(batch)=>{batch.baseSha??=sha('0');return priorPrepare(batch);};
  h.workspace.review=async(batch)=>{
    const round=batch.reviews.length,verdict=round===1?'changes-requested':'approved';
    const cwd=await prepareReview('internal-'+round),directory=cwd+'/'+reviewPacket;
    if(batch.reviewLedger)await writeFile(directory+'/claude-review-state.local',JSON.stringify(batch.reviewLedger));
    for(const [name,body] of Object.entries(batch.reviewReports??{}))await writeFile(directory+'/'+name,body);
    await runBugReview({cwd,packet:reviewPacket,run:syntheticRun(batch,cwd,verdict)});
    batch.reviewLedger=JSON.parse(await readFile(directory+'/claude-review-state.local','utf8'));
    batch.reviewReports??={};batch.reviewReports['claude-review-'+round+'.json']=await readFile(directory+'/claude-review-'+round+'.json','utf8');
    return JSON.parse(batch.reviewReports['claude-review-'+round+'.json']);
  };
  h.gh.createStateStore=()=>{qaEvents.push('synthetic-ownership-interruption');throw Object.assign(new Error('Synthetic ownership guard interruption at review handoff'),{code:'review-operator-owned'});};
  const oldExecute=h.workspace.execute;
  h.workspace.execute=async(batch,options)=>{
    if(options.phase!=='implementation') {qaEvents.push('correction:'+options.phase);return oldExecute(batch,options);}
    assert.equal(h.stateRef.value.batches[0].implementation[0].status,'running');
    return runWorkItems({batch,workspace:childWorkspace,models:{executeWorkItem:async({item,reservation})=>{
      const durable=h.stateRef.value.batches[0].workItems.runs[0].nodes.find(n=>n.id===item.id);
      assert.equal(durable.status,'running');assert.equal(durable.nonce,reservation.nonce);
      childCalls++;qaEvents.push('model:'+item.id);return {status:'implemented',summary:'Synthetic bounded output'};
    }},effects:options.effects,context:options,pool:[profile]});
  };
  const result=await runWithIntakeContinuation({repo,now:()=>clock,wait:async(ms)=>{assert(ms<=30000);assert.equal(childCalls,0);clock+=ms;},observe:async()=>clone(h.stateRef.value),runOnce:async()=>{passes++;return h.run({action:'test'},'external');}});
  const batch=result.batches[0];
  assert.equal(clock,120000);assert.equal(passes,2);assert.equal(h.counts.plan,1);assert.equal(childCalls,2);
  assert.equal(batch.workItems.runs.length,1);assert.equal(batch.workItems.runs[0].status,'completed');
  assert.deepEqual(qaEvents.filter(e=>e.startsWith('model:')),['model:first','model:second']);
  assert(qaEvents.indexOf('integrate:first')<qaEvents.indexOf('model:second'));
  assert.equal(batch.implementation.length,1);assert.equal(batch.reviews.length,0);
  assert.equal(batch.phase,'waiting-checks');assert.equal(batch.externalReview,undefined);
  const budget=JSON.stringify({implementation:batch.implementation,reviews:batch.reviews,graph:batch.workItems});
  await h.run({action:'test'},'external');
  assert.equal(childCalls,2);assert.equal(h.counts.plan,1);
  assert.equal(JSON.stringify({implementation:h.stateRef.value.batches[0].implementation,reviews:h.stateRef.value.batches[0].reviews,graph:h.stateRef.value.batches[0].workItems}),budget);

  const communication={publishState:async()=>{},mirrorFeedback:async()=>{}};
  const save=async()=>h.store.save(result);
  h.gh.reviewFeedback=async()=>({...openFeedback(batch),number:81,url:batch.pr.url,mergeCommitSha:null});
  h.gh.requiredChecks=async()=>({ok:true,details:['synthetic-build: SUCCESS']});
  h.gh.publishExternalReview=async(_pr,head,report)=>{assert.equal(report.subject_sha,head);qaEvents.push('synthetic-authenticated-publication:'+report.verdict);};
  h.workspace.finalQa=async(current)=>{const durable=h.stateRef.value.batches[0];assert.equal(durable.codexFinalReview.status,'running');assert.equal(durable.codexFinalQaInfrastructure.attempts.at(-1).status,'running');qaEvents.push('final-codex-qa:'+current.sha);return {status:'verified',summary:'Synthetic independent final result'};};
  const external=()=>externalReviewStep({repo,batch,gh:h.gh,workspace:h.workspace,save,communication,report:async()=>{},block:async(_batch,reason)=>assert.fail(reason)});
  await external();assert.equal(batch.externalReview.status,'requested');
  for(const verdict of ['changes-requested','approved']) {
    const cwd=await prepareReview('external-'+(batch.reviews.length+1));
    await reviewExternalBatch({state:result,batch,store:h.store,github:h.gh,cwd,run:syntheticRun(batch,cwd,verdict),communication});
    assert.equal(batch.externalReview.status,'published');
    const reviewed=batch.sha;
    await external();
    if(verdict==='changes-requested'){assert.notEqual(batch.sha,reviewed);assert.equal(batch.externalReview.status,'requested');qaEvents.push('external-correction-fresh-head:'+batch.sha);}
  }
  assert.equal(batch.reviews.length,2);assert.equal(batch.implementation.length,2);
  assert.equal(batch.codexFinalReview.status,'verified');assert.equal(batch.codexFinalReview.claudeRound,2);assert.equal(batch.phase,'ready');
  assert.equal(childCalls,2);assert.equal(batch.workItems.runs.length,1);
  await writeFile(new URL('./same-batch-ready.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  const binding=authorizationBinding({state:result,subject:batch,actor:'synthetic-qa',action:'resume'});
  const before=binding.historyDigest;
  const originalSummary=batch.workItems.runs[0].nodes[0].resultSummary;
  batch.workItems.runs[0].nodes[0].resultSummary='Changed child historical result';
  assert.notEqual(authorizationBinding({state:result,subject:batch,actor:'synthetic-qa',action:'resume'}).historyDigest,before);
  batch.workItems.runs[0].nodes[0].resultSummary=originalSummary;

  batch.evidence=batch.plan.evidence.map(entry=>({issue:entry.issue,files:{screenshot:{path:entry.screenshot,sha256:'1'.repeat(64),bytes:16},trace:{path:entry.trace,sha256:'2'.repeat(64),bytes:17}}}));
  await save();
  let nativeState='OPEN',nativeMerge=null,closed=false,mergeCalls=0;
  const releaseGithub={
    requiredChecks:async()=>({ok:true,details:['synthetic-build: SUCCESS']}),
    viewIssue:async number=>({number,state:closed?'closed':'open',comments:[]}),
    reviewFeedback:async()=>({...openFeedback(batch),number:81,url:batch.pr.url,state:nativeState,mergeCommitSha:nativeMerge}),
    readFileAtRevision:async file=>file.endsWith('evidence-manifest.json')?{content:JSON.stringify(batch.evidence)}:Object.values(batch.evidence[0].files).find(entry=>entry.path===file),
    mergePullRequest:async(number,head,{guard})=>{await guard();assert.equal(number,81);assert.equal(head,batch.sha);mergeCalls++;nativeState='MERGED';nativeMerge=sha('f');qaEvents.push('synthetic-protected-merge:'+head);return {mergeSha:nativeMerge,reviewedSha:head};},
    commentIssue:async(_number,_body,{guard})=>{await guard();qaEvents.push('synthetic-deployment-proof-comment');},
    setIssueStatus:async(_number,status,{guard})=>{await guard();assert.equal(status,'Risolto');closed=true;qaEvents.push('synthetic-issue-closed-after-deployment');}
  };
  const releaseArgs={repo,github:releaseGithub,store:h.store,batchId:batch.id,reviewedSha:batch.sha,configured:{botToken:true,vercel:true,railway:true},execute:true,automatic:true};
  await assert.rejects(releaseBatch({...releaseArgs,reviewedSha:sha('e')}));assert.equal(mergeCalls,0);assert.equal(closed,false);
  const released=await releaseBatch(releaseArgs);assert.equal(released.status,'merged');assert.equal(closed,false);assert.equal(mergeCalls,1);
  const deployArgs={repo,github:releaseGithub,store:h.store,batchId:batch.id,mergeSha:nativeMerge,automatic:true};
  await assert.rejects(recordDeployment({...deployArgs,vercelUrl:'https://untrusted.invalid'}));assert.equal(closed,false);
  await assert.rejects(recordDeployment({...deployArgs,mergeSha:sha('e'),vercelUrl:'https://clinicos-eosin.vercel.app'}));assert.equal(closed,false);
  await recordDeployment({...deployArgs,vercelUrl:'https://clinicos-eosin.vercel.app'});
  const complete=h.stateRef.value.batches[0];assert.equal(publicationComplete(complete),true);assert.equal(closed,true);
  assert.equal(complete.release.reviewProof.finalCodexReview.subjectSha,batch.sha);
  assert(qaEvents.indexOf('final-codex-qa:'+batch.sha)<qaEvents.indexOf('synthetic-protected-merge:'+batch.sha));
  assert(qaEvents.indexOf('synthetic-deployment-proof-comment')<qaEvents.indexOf('synthetic-issue-closed-after-deployment'));
  await writeFile(new URL('./same-batch-released.json',import.meta.url),JSON.stringify(h.stateRef.value,null,2)+'\n');
  await writeFile(new URL('./composed-results.json',import.meta.url),JSON.stringify({kind:'offline synthetic composed controller',loneEventPasses:passes,quietWindowMs:clock,plannerCalls:h.counts.plan,childModelCalls:childCalls,graphRuns:1,implementationAttempts:2,reviewRounds:2,headChanged:true,restartReplayedModels:0,authorizationBoundToChildHistory:true,externalReviewWorkerRounds:2,finalCodexQaSessions:1,syntheticProtectedMerges:mergeCalls,syntheticDeploymentRecorded:publicationComplete(complete),syntheticIssueClosed:closed,negativeReleaseGuards:3,events:qaEvents,limitations:['In-memory synthetic GitHub, workspace and model adapters','Actual external worker, external review reconciliation and release modules use synthetic authenticated GitHub/model/deployment boundaries','No live activation, provider invocation, deployment or closure claimed']},null,2)+'\n');
});

test('independent corrected retention caller visits failed graph for completed and running parents', async()=>{
  for(const status of ['completed','running']) {
    const exports=await exportKnownFailedOutputs({state:{batches:[{id:'bug-batch-17',controllerProgress:{status},workItems:{runs:[{status:'failed',nodes:[{id:'child',status:'blocked'}]}]}}]},workspace:{},outputRoot:'/unused'});
    assert.equal(exports.length,1);
    assert.equal(exports[0].itemId,'child');
    assert.equal(exports[0].status,'child-output-unavailable-or-guard-refused');
  }
});

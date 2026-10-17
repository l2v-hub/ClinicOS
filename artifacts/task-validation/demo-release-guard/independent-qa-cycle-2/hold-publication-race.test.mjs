import test from 'node:test';
import {createGitHub} from '../../../../agent-team/src/bug-pipeline/github.mjs';
import assert from 'node:assert/strict';
import {
  releaseBatch,
  selectAutoReleaseBatch,
  recordDeployment,
  ReleaseGateError,
  publishDeploymentCompletion,
} from '../../../../agent-team/src/bug-pipeline/release.mjs';
import { feedbackFingerprint, sha256 } from '../../../../agent-team/src/bug-pipeline/contracts.mjs';

const sha = 'a'.repeat(40);
const mergeSha = 'b'.repeat(40);
const screenshotPath = 'artifacts/task-validation/bug-batch-5/evidence/issue-5.png';
const tracePath = 'artifacts/task-validation/bug-batch-5/evidence/issue-5.zip';
const screenshot = { path: screenshotPath, sha256: '1'.repeat(64), bytes: 16 };
const trace = { path: tracePath, sha256: '2'.repeat(64), bytes: 17 };
const recorded = [{ issue: 5, files: { screenshot, trace } }];
const report = JSON.stringify({
  subject_sha: sha,
  verdict: 'approved',
  summary: 'The implementation meets the accepted plan.',
  findings: [],
});

function fixture(scope = ['frontend/src/Patient.jsx']) {
  const feedback = {
    number: 9,
    url: 'https://github.com/l2v-hub/ClinicOS/pull/9',
    state: 'OPEN',
    head: sha,
    headRef: 'codex/bug-batch-5',
    headRepo: 'l2v-hub/ClinicOS',
    headIsFork: false,
    baseRef: 'main',
    isDraft: false,
    mergeCommitSha: null,
    comments: [],
    unresolved: false,
    changesRequested: false,
  };
  const batch = {
    id: 'bug-batch-5',
    branch: 'codex/bug-batch-5',
    issues: [5],
    plan: {
      title: 'Fix patient list display',
      feature: 'Patient list',
      rationale: 'The list hides rows.',
      execution: {
        difficulty: 'low',
        mode: 'delegate',
        reason: 'Bounded, independently testable change.',
      },
      analysis: 'Patient rows should be visible.',
      issues: [5],
      scope,
      acceptance: [{ issue: 5, criteria: ['Rows render'] }],
      tasks: [{ title: 'Render rows', files: [scope[0]], steps: ['Update component'] }],
      verification: [
        { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
        { command: 'node', args: ['--test', 'patient.test.mjs'] },
      ],
      evidence: [{ issue: 5, screenshot: screenshotPath, trace: tracePath, video: '' }],
    },
    phase: 'ready',
    implementation: [{ round: 1, status: 'passed' }],
    reviews: [{ round: 1, status: 'approved', subjectSha: sha }],
    sha,
    approvedSha: sha,
    pr: { number: 9, url: feedback.url },
    evidence: recorded,
    reviewReports: { 'claude-review-1.json': report },
    reviewLedger: {
      rounds: [{ round: 1, subject_sha: sha, verdict: 'approved', review_sha256: sha256(report) }],
    },
    feedbackFingerprint: feedbackFingerprint(feedback),
  };
  const state = { schemaVersion: 1, repository: 'l2v-hub/ClinicOS', batches: [batch] };
  let saved = state;
  const calls = [];
  const github = {
    async setIssueStatus(number, status) {
      calls.push(['status', number, status]);
    },
    async viewIssue(number) {
      return { number, state: 'open', comments: [] };
    },
    async reviewFeedback() {
      return structuredClone(feedback);
    },
    async requiredChecks() {
      return { ok: true, details: ['build: SUCCESS'] };
    },
    async readFileAtRevision(file) {
      calls.push(['read', file]);
      if (file.endsWith('evidence-manifest.json')) return { content: JSON.stringify(recorded) };
      if (file === screenshotPath) return screenshot;
      if (file === tracePath) return trace;
      throw new Error(`Unexpected evidence path ${file}`);
    },
    async draftReady() {
      calls.push(['ready']);
    },
    async mergePullRequest(number, subject) {
      calls.push(['merge', number, subject]);
      return { mergeSha, reviewedSha: subject };
    },
    async commentIssue(number, body) {
      calls.push(['comment', number, body]);
    },
  };
  const store = {
    async load() {
      return structuredClone(saved);
    },
    async save(value) {
      calls.push(['save']);
      saved = structuredClone(value);
    },
  };
  return { batch, feedback, state, github, store, calls, getSaved: () => saved };
}

test('a hold applied while reading issue comments prevents completion publication',async()=>{
 const f=fixture();
 f.batch.release={status:'deployed', reviewedSha:sha,mergeSha, deployment:{status:'deployed',reviewedSha:sha,mergeSha,vercelUrl:'https://clinicos-eosin.vercel.app'}};
 f.github.viewIssue=async(number)=>{ f.state.batches[0].releaseHold={reason:'Independent review requested during remote issue read'}; return{number,state:'open',comments:[]};};
 await assert.rejects(publishDeploymentCompletion({batch:f.batch,github:f.github,store:f.store,repo:'l2v-hub/ClinicOS'}),/releaseHold/);
 assert.equal(f.calls.filter(([type])=>type==='status').length,0);
 assert.equal(f.calls.filter(([type])=>type==='comment').length,0,'Must not publish Risolto after a durable hold was applied during the awaited issue read');
});

function deployedFixture(){const f=fixture();f.batch.release={status:'deployed',reviewedSha:sha,mergeSha,deployment:{status:'deployed',reviewedSha:sha,mergeSha,vercelUrl:'https://clinicos-eosin.vercel.app'}};return f;}
test('hold during real GitHub status adapter label inspection prevents actual close PATCH',async()=>{
 const f=deployedFixture();const patches=[];
 const real=createGitHub({repo:f.state.repository,cwd:'/tmp',run:async({args,input})=>{
   if(args[1].endsWith('/labels/Risolto')) f.state.batches[0].releaseHold={reason:'Synthetic hold while status adapter awaits label inspection'};
   if(args.includes('PATCH'))patches.push({held:!!f.state.batches[0].releaseHold,body:JSON.parse(input)});
   return{ok:true,code:0,stdout:'{}',stderr:''};
 }});
 f.github.setIssueStatus=real.setIssueStatus;
 await publishDeploymentCompletion({batch:f.batch,github:f.github,store:f.store,repo:f.state.repository}).catch(()=>{});
 assert.equal(patches.length,0,JSON.stringify({reason:'Active hold must block actual issue close PATCH after awaited label operations',patches}));
});
test('a failed actual close must not leave an untrue already-closed completion claim',async()=>{
 const f=deployedFixture();f.github.setIssueStatus=async()=>{throw Error('Synthetic GitHub close HTTP503')};
 await assert.rejects(publishDeploymentCompletion({batch:f.batch,github:f.github,store:f.store,repo:f.state.repository}),/HTTP503/);
 const body=f.calls.find(([type])=>type==='comment')[2];
 assert.doesNotMatch(body,/issue chiusa come completata/,'Do not claim issue is closed before closure succeeds; use resolution/deployment facts only');
});

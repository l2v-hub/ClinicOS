import {fixture,sha,mergeSha} from '../independent-qa-cycle-2/publication-race-fixture.mjs';
import {releaseBatch,recordDeployment,publishDeploymentCompletion} from '../../../../agent-team/src/bug-pipeline/release.mjs';
import {sha256} from '../../../../agent-team/src/bug-pipeline/contracts.mjs';
const repo='l2v-hub/ClinicOS';
const railwayRunUrl='https://github.com/l2v-hub/ClinicOS/actions/runs/123';
export const cases=['premerge-pr','premerge-source-issue','premerge-approval-sha','record-pr','record-source-issue','record-hold','publication-pr','publication-source-issue','publication-approval-sha','publication-live-proof'];
function addIssue(b){
 b.issues.push(6);b.plan.issues.push(6);
 b.plan.acceptance.push({issue:6,criteria:['Unreviewed added issue']});
 b.plan.evidence.push({issue:6,screenshot:'artifacts/task-validation/bug-batch-5/evidence/issue-6.png',trace:'artifacts/task-validation/bug-batch-5/evidence/issue-6.zip',video:''});
}
function mutate(b,kind){
 if(kind==='pr')b.pr={number:10,url:'https://github.com/l2v-hub/ClinicOS/pull/10'};
 else if(kind==='source-issue')addIssue(b);
 else if(kind==='approval-sha')b.approvedSha='c'.repeat(40);
 else if(kind==='hold')b.releaseHold='Synthetic current operator hold';
 else if(kind==='live-proof')b.release.deployment.demo.artifactDigest=`sha256:${'9'.repeat(64)}`;
 else throw Error('Unknown mutation');
}
export async function probe(scenario){
 if(!cases.includes(scenario))throw Error('Unknown scenario');
 const f=fixture(['backend/src/example.ts']);
 const proof={receipt:{mergeSha},reviewedSha:sha,runUrl:railwayRunUrl,artifactDigest:`sha256:${'7'.repeat(64)}`,receiptSha256:'8'.repeat(64)};
 let preflights=0,liveChecks=0,views=0,error,result,changeDone=false;
 const mutateCurrent=(kind)=>{mutate(f.getSaved().batches[0],kind);changeDone=true;};
 f.github.verifyDemoPreflight=async()=>{if(++preflights===2&&scenario.startsWith('premerge-'))mutateCurrent(scenario.slice(9));return {};};
 f.github.verifyDemoRelease=async()=>{liveChecks++;if(liveChecks===1&&scenario.startsWith('record-'))mutateCurrent(scenario.slice(7));return structuredClone(proof);};
 try{
  if(scenario.startsWith('premerge-'))result=await releaseBatch({repo,github:f.github,store:f.store,batchId:f.batch.id,reviewedSha:sha,execute:true,configured:{botToken:true,railway:true,vercel:true}});
  else if(scenario.startsWith('record-')){
   f.batch.release={status:'merged',reviewedSha:sha,mergeSha,prNumber:9};
   result=await recordDeployment({repo,github:f.github,store:f.store,batchId:f.batch.id,mergeSha,railwayRunUrl});
  }else{
   f.batch.release={status:'deployed',reviewedSha:sha,mergeSha,prNumber:9,deployment:{status:'deployed',reviewedSha:sha,mergeSha,railwayRunUrl,demo:structuredClone(proof)}};
   f.github.viewIssue=async(number)=>{views++;mutateCurrent(scenario.slice(12));return {number,state:'open',comments:[]};};
   result=await publishDeploymentCompletion({repo,batch:f.batch,github:f.github,store:f.store});
  }
 }catch(caught){error=caught.message;}
 const merges=f.calls.filter(([kind])=>kind==='merge');
 const closures=f.calls.filter(([kind])=>kind==='status');
 const comments=f.calls.filter(([kind])=>kind==='comment');
 return {scenario,decision:merges.length||closures.length?'DEFECT':'BLOCKED',preflights,liveChecks,views,changeDone,verifiedPr:9,durablePr:f.getSaved().batches[0].pr.number,verifiedSourceIssues:[5],durableSourceIssues:f.getSaved().batches[0].issues,actualMerges:merges,actualClosures:closures,completionComments:comments.length,error,result,implementationRounds:f.getSaved().batches[0].implementation.length,reviewRounds:f.getSaved().batches[0].reviews.length};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const rows=[];for(const c of cases)rows.push(await probe(c));
 console.log(JSON.stringify(rows,null,2));
}

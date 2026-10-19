import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createStandaloneReview,validateStandaloneSubject} from '../../../../agent-team/src/bug-pipeline/standalone-review.mjs';
import {createGitHub} from '../../../../agent-team/src/bug-pipeline/github.mjs';
const out=new URL('./test-results/actual-git-unicode-verification.json',import.meta.url), results=[];
for(const [number,cwd]of[[393,'/workspace/clinicos-voice-393'],[491,'/workspace/clinicos-demo-source-topology']]){
 const m=JSON.parse(await readFile(`/workspace/.clinicos-cloud/standalone-${number}-adopt.json`,'utf8'));
 const git=(a)=>execFileSync('git',a,{cwd,maxBuffer:64*1024*1024});const cache=new Map();let reads=0;
 const object=(oid)=>{if(!cache.has(oid))cache.set(oid,git(['cat-file','blob',oid]));return cache.get(oid)};
 const run=async call=>{assert.equal(call.command,'gh');const e=call.args[1];let r;
 if(e==='user')r={login:'synthetic-authorized-maintainer'};
 else if(e===`repos/l2v-hub/ClinicOS/pulls/${number}`)r={number,state:'open',merged:false,draft:false,head:{sha:m.sha,ref:m.branch,repo:{full_name:m.repository,fork:false}},base:{sha:m.baseSha,ref:'main',repo:{full_name:m.repository}}};
 else if(e.includes('/compare/'))r={base_commit:{sha:m.baseSha},merge_base_commit:{sha:git(['merge-base',m.baseSha,m.sha]).toString().trim()}};
 else if(e.includes('/git/trees/')){const revision=e.split('/').at(-1).split('?')[0];const rows=git(['ls-tree','-r','-z',revision]).toString().split('\0').filter(Boolean);r={truncated:false,tree:rows.map(s=>{const [meta,path]=s.split('\t'),[mode,type,sha]=meta.split(' ');return{path,mode,type,sha}})}}
 else if(e.includes('/contents/')){const p=decodeURIComponent(e.split('/contents/')[1].split('?')[0]);const rev=new URL('https://fixture.invalid/'+e).searchParams.get('ref');const oid=git(['rev-parse',`${rev}:${p}`]).toString().trim();r={type:'file',sha:oid,size:object(oid).length};reads++}
 else if(e.includes('/git/blobs/')){const b=object(e.split('/').at(-1));r={encoding:'base64',size:b.length,content:b.toString('base64')}}
 else if(e.includes('/collaborators/'))r={permission:'admin'};
 else assert.fail('Unexpected read-only endpoint '+e);
 return{ok:true,stdout:JSON.stringify(r)};
 };
 let state={schemaVersion:1,repository:m.repository,batches:[]},writes=0;
 const transport=createGitHub({cwd,repo:m.repository,run});
 const github={...transport,createStateStore:()=>({load:async()=>structuredClone(state),save:async(s,{guard}={})=>{await guard?.();state=structuredClone(s);writes++}}),requiredChecks:async()=>({ok:true,details:['synthetic-required-pass']})};
 const comments=[];
 github.viewIssue=async n=>({number:n,state:'open',pull_request:n===number?{}:undefined,comments:structuredClone(comments),labels:[]});
 github.reviewFeedback=async()=>({number,url:m.pr.url,state:'OPEN',isDraft:false,head:m.sha,headRef:m.branch,headRepo:m.repository,headIsFork:false,baseRef:'main',unresolved:false,changesRequested:false,comments:comments.map(c=>({id:c.id,body:c.body,author:c.user.login}))});
 github.commentPR=async(n,body)=>comments.push({id:comments.length+1,body,user:{login:'synthetic-authorized-maintainer'}});
 github.publishExternalReview=async(n,head,report,round)=>comments.push({id:comments.length+1,body:`<!-- clinicos-claude-cron:${n}:${head}:${round} -->\nSynthetic native review`,user:{login:'synthetic-authorized-maintainer'}});
 const controller=createStandaloneReview({cwd,github,run:async c=>c.args[0]==='pr'?{ok:true,stdout:JSON.stringify([{name:'synthetic-native-check',state:'SUCCESS',bucket:'pass'}])}:run(c)});
 try{const s=await controller.adopt(m);assert.equal(s.implementation.length,3);
 await controller.request(number);await controller.claim(number);
 const report={subject_sha:m.sha,verdict:'approved',summary:'漢'.repeat(50000),findings:[]};
 await controller.submit(number,report);const imported=await controller.reconcilePR(number);assert.equal(imported.externalReview.status,'published');
 const importedChars=JSON.stringify(imported).length;validateStandaloneSubject(imported);
 imported.reviews=[];imported.reviewLedger.rounds=[];imported.reviewReports={};
 for(let round=1;round<=4;round++){const report={subject_sha:m.sha,verdict:'approved',summary:round%2?'漢'.repeat(99000):'😀'.repeat(49000),findings:[]};const content=JSON.stringify(report);imported.reviews.push({round,status:'approved',subjectSha:m.sha});imported.reviewLedger.rounds.push({round,subject_sha:m.sha,verdict:'approved',review_sha256:createHash('sha256').update(content).digest('hex')});imported.reviewReports[`claude-review-${round}.json`]=content;}
 validateStandaloneSubject(imported);
 results.push({pr:number,result:'PASS',sha:m.sha,sourceDelta:s.sourceManifest.length,packetFiles:Object.keys(s.packet.files).length,implementationRounds:s.implementation.length,validModerateReportChars:JSON.stringify(report).length,actualImportedSubjectChars:importedChars,fourCumulativeReportSubjectChars:JSON.stringify(imported).length,gitBlobReads:reads,syntheticStateWrites:writes,actualGitHubWrites:0,nativeIdentityAndChecks:'synthetic fixture, not live readiness'});}catch(e){results.push({pr:number,result:'REPRODUCED_VALID_REPORT_STRANDED',sha:m.sha,error:e.message,durableStatus:state.standaloneReviews?.[0]?.reviews?.at(-1)?.status,reportCompactChars:50106,reportUTF8Bytes:150106,stack:e.stack});}
}
await writeFile(out,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));

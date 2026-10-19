import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createGitHub} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/github.mjs';
import {createStandaloneReview} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/standalone-review.mjs';
import {sha256} from '/workspace/clinicos-standalone-pr-review/agent-team/src/bug-pipeline/contracts.mjs';
export const repo='l2v-hub/ClinicOS', sha='a'.repeat(40), base='b'.repeat(40);
export const oid=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const approved=()=>({subject_sha:sha,verdict:'approved',summary:'Synthetic independent QA source inspection',findings:[]});
export function fixture({large=true, verifier=true, wire='none'}={}) {
 let remote={schemaVersion:1,repository:repo,batches:[],...(large?{retainedHistory:'Q'.repeat(1024*1024+809)}:{})};
 const calls=[], mutations=[], comments=[], labels=[],events=[];
 let permission='admin', actor='qa-operator', corrupt, transportFailure, beforePut, viewHook,grantCount=0;
 const packetPath='artifacts/task-validation/standalone-review-81';
 const implementation=[{round:1,status:'passed',subjectSha:sha,evidence:'attempt1.json'}];
 const content=Object.fromEntries(['task-contract.md','analysis.md','implementation-plan.md','validation-report.md','attempt1.json'].map(n=>[n,`Synthetic QA8 ${n}\n`]));
 const files=Object.fromEntries(Object.entries(content).map(([n,t])=>[n,sha256(t)]));
 const sources=[{path:'src/synthetic.mjs',blob:'c'.repeat(40),mode:'100644',baseBlob:'d'.repeat(40),baseMode:'100644'}];
 content['imported-history.json']=JSON.stringify({implementation,reviews:[],reviewLedger:null,reviewReports:{},sourceManifest:sources,packetFiles:files});
 const manifest={schemaVersion:1,repository:repo,pr:{number:81,url:`https://github.com/${repo}/pull/81`},sha,baseSha:base,baseRef:'main',branch:'feature/synthetic-qa8',issues:[],packet:{path:packetPath,files:{...files,'imported-history.json':sha256(content['imported-history.json'])}},sourceManifest:sources,implementation,reviews:[],reviewLedger:null,reviewReports:{},releaseHold:'Synthetic QA only; await genuine independent reviews'};
 const pr={number:81,state:'open',merged:false,draft:false,head:{sha,ref:manifest.branch,repo:{full_name:repo,fork:false}},base:{sha:base,ref:'main',repo:{full_name:repo}}};
 const feedback={number:81,url:manifest.pr.url,state:'OPEN',isDraft:false,head:sha,headRef:manifest.branch,headRepo:repo,headIsFork:false,baseRef:'main',comments:[],unresolved:false,changesRequested:false};
 const response=value=>({ok:true,code:0,stdout:JSON.stringify(value),stderr:''});
 const wireRecord=()=>{const bytes=Buffer.from(JSON.stringify(remote));return {type:'file',sha:oid(bytes),size:bytes.length,encoding:wire,content:wire==='none'?'':bytes.toString('base64'),download_url:'https://untrusted.invalid/never-read'};};
 const run=async call=>{
  assert.equal(call.command,'gh'); calls.push({endpoint:call.args[1],method:call.args.includes('-X')?call.args[call.args.indexOf('-X')+1]:'GET',maxOutputBytes:call.maxOutputBytes});
  const e=call.args[1],m=calls.at(-1).method;
  if(transportFailure&&e.includes('/contents/'))return transportFailure;
  if(call.args[0]==='pr'&&e==='checks')return response([{name:'Synthetic required check',state:'SUCCESS',bucket:'pass'}]);
  if(e==='user')return response({login:actor});
  if(e.includes('/collaborators/'))return response({permission});
  if(e===`repos/${repo}/git/ref/heads/codex/bug-control`)return response({object:{sha:base}});
  if(e.startsWith(`repos/${repo}/contents/.codex-bug-state.json`)) {
   if(m==='GET'){let r=wireRecord();if(corrupt)r=corrupt(r,'contents');return response(r);}
   if(beforePut)await beforePut();
   const body=JSON.parse(call.input);mutations.push({kind:'state-put',expected:body.sha});
   if(body.sha!==wireRecord().sha)return {ok:false,code:1,stdout:'',stderr:'gh: conflict (HTTP 409)'};
   const bytes=Buffer.from(body.content,'base64');remote=JSON.parse(bytes.toString('utf8'));events.push({event:'state-saved',bytes:bytes.length});return response({content:{sha:oid(bytes)}});
  }
  if(e.startsWith(`repos/${repo}/git/blobs/`)){
   assert.equal(e,`repos/${repo}/git/blobs/${wireRecord().sha}`);assert.equal(call.maxOutputBytes,16*1024*1024);
   const bytes=Buffer.from(JSON.stringify(remote));let r={sha:oid(bytes),size:bytes.length,encoding:'base64',content:bytes.toString('base64').match(/.{1,76}/g).join('\r\n')};if(corrupt)r=corrupt(r,'blob');return response(r);
  }
  if(e===`repos/${repo}/pulls/81`)return response(pr);
  if(e.startsWith(`repos/${repo}/compare/`))return response({base_commit:{sha:base},merge_base_commit:{sha:base}});
  if(e.startsWith(`repos/${repo}/git/trees/`)){
   const revision=e.split('/').at(-1).split('?')[0];return response({truncated:false,tree:[{type:'blob',path:sources[0].path,mode:'100644',sha:revision===base?sources[0].baseBlob:sources[0].blob},...(revision===sha?Object.entries(manifest.packet.files).map(([n,d])=>({type:'blob',path:packetPath+'/'+n,sha:d.slice(0,40),mode:'100644'})):[])]});
  }
  if(e===`repos/${repo}/issues/81/labels`&&m==='POST'){mutations.push({kind:'label-add'});for(const l of JSON.parse(call.input).labels)if(!labels.includes(l))labels.push(l);return response({});}
  if(e.startsWith(`repos/${repo}/issues/81/labels/`)&&m==='DELETE'){mutations.push({kind:'label-remove'});const i=labels.indexOf(decodeURIComponent(e.split('/').at(-1)));if(i>=0)labels.splice(i,1);return response({});}
  assert.fail(`Unrecognized synthetic operation ${m} ${e}`);
 };
 const github=createGitHub({cwd:'/synthetic/qa8',repo,run});
 github.requiredChecks=async()=>({ok:true,details:['synthetic: SUCCESS']});
 github.readFileAtRevision=async file=>{const t=content[file.slice(packetPath.length+1)];assert.equal(typeof t,'string');return {content:t,sha256:sha256(t)};};
 github.viewIssue=async n=>{if(viewHook)await viewHook();return {number:n,state:'open',pull_request:{},comments:structuredClone(comments),labels:[...labels]};};
 github.reviewFeedback=async()=>({...structuredClone(feedback),comments:[...structuredClone(feedback.comments),...comments.map(c=>({id:c.id,body:c.body,author:c.user.login}))]});
 github.commentPR=async(n,body)=>{mutations.push({kind:'comment'});comments.push({id:comments.length+1,body,user:{login:actor,type:'User'}});};
 github.publishExternalReview=async(n,head,report,round)=>{mutations.push({kind:'review-published'});feedback.comments.push({id:900+round,author:actor,body:`<!-- clinicos-claude-cron:${n}:${head}:${round} -->\nSynthetic review`});};
 const verifierDefault=async({binding})=>({binding,provenance:'user-session',grantId:'synthetic-qa8-session',sourceRef:'synthetic:external-session',consumptionNonce:`cap-${++grantCount}`});
 const makeController=authorizationVerifier=>createStandaloneReview({github,run,cwd:'/synthetic/qa8',nonce:randomUUID,authorizationVerifier,now:()=>new Date('2026-10-18T21:30:00.000Z')});
 const controller=makeController(verifier===true?verifierDefault:verifier||undefined);
 return {controller,makeController,github,run,manifest,pr,feedback,calls,mutations,comments,labels,events,remote:()=>remote,setRemote:r=>remote=r,setPermission:p=>permission=p,setActor:a=>actor=a,corrupt:f=>corrupt=f,setTransportFailure:r=>transportFailure=r,beforePut:f=>beforePut=f,onView:f=>viewHook=f,wireRecord};
}

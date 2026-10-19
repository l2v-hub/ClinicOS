import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createStandaloneReview} from '../../../../agent-team/src/bug-pipeline/standalone-review.mjs';
import {createGitHub} from '../../../../agent-team/src/bug-pipeline/github.mjs';
const out=new URL('./test-results/actual-git-verification.json',import.meta.url), results=[];
for(const [number,cwd]of[[393,'/workspace/clinicos-voice-393'],[491,'/workspace/clinicos-demo-source-topology']]){
 const m=JSON.parse(await readFile(`/workspace/.clinicos-cloud/standalone-${number}-adopt.json`,'utf8'));
 const git=(a)=>execFileSync('git',a,{cwd,maxBuffer:64*1024*1024});const cache=new Map();let reads=0;
 const object=(oid)=>{if(!cache.has(oid))cache.set(oid,git(['cat-file','blob',oid]));return cache.get(oid)};
 const run=async call=>{assert.equal(call.command,'gh');const e=call.args[1];let r;
 if(e==='user')r={login:'synthetic-authorized-maintainer'};
 else if(e===`repos/l2v-hub/ClinicOS/pulls/${number}`)r={number,state:'open',merged:false,draft:false,head:{sha:m.sha,ref:m.branch,repo:{full_name:m.repository,fork:false}},base:{sha:m.baseSha,ref:'main',repo:{full_name:m.repository}}};
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
 const controller=createStandaloneReview({cwd,github,run:async c=>c.args[0]==='pr'?{ok:true,stdout:JSON.stringify([{name:'synthetic-native-check',state:'SUCCESS',bucket:'pass'}])}:run(c)});
 try{const s=await controller.adopt(m);assert.equal(s.implementation.length,3);results.push({pr:number,result:'PASS',sha:m.sha,sourceDelta:s.sourceManifest.length,packetFiles:Object.keys(s.packet.files).length,implementationRounds:s.implementation.length,gitBlobReads:reads,syntheticStateWrites:writes,actualGitHubWrites:0,nativeIdentityAndChecks:'synthetic fixture, not live readiness'});}catch(e){results.push({pr:number,result:'FAIL',sha:m.sha,error:e.message,stack:e.stack});}
}
await writeFile(out,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));

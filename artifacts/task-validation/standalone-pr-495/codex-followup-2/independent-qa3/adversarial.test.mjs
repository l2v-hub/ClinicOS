import test from 'node:test';import assert from 'node:assert/strict';import{spawnSync}from'node:child_process';import{mkdtemp,readFile,stat,writeFile}from'node:fs/promises';import{tmpdir}from'node:os';
import {TARGET,ENDPOINT,MAIN_ENDPOINT}from'/workspace/clinicos-demo-bearer-readiness/scripts/automation/configure-demo-source.mjs';
import {QUERIES}from'/workspace/clinicos-demo-bearer-readiness/scripts/automation/inspect-demo-bearer-readiness.mjs';
const root='/workspace/.clinicos-cloud/495-continuation3-independent-qa-20261018',sha='c'.repeat(40),sentinel='QA495_FRESH_SYNTHETIC_ONLY_889f5d9f',poison=sentinel+' https://fake-user:fake-pass@synthetic.invalid/private ghp_FAKE_ONLY';
const trigger=()=>({id:'qa-trigger',provider:'github',projectId:TARGET.projectId,environmentId:TARGET.environmentId,serviceId:TARGET.serviceId,repository:TARGET.repository,branch:'main',checkSuites:true,baseEnvironmentOverrideId:null});
function fixture(){return{IDENTITY:{me:{id:'qa-identity-discard',privateExtra:poison}},ACCESS:{project:{id:TARGET.projectId},environment:{id:TARGET.environmentId,projectId:TARGET.projectId,name:'demo',canAccess:true}},REPOSITORY:{gitHubRepoAccessAvailable:{hasAccess:true,isPublic:true}},INVENTORY:{serviceInstance:{serviceId:TARGET.serviceId,environmentId:TARGET.environmentId,rootDirectory:'/backend',source:{repo:TARGET.repository},domains:{serviceDomains:[{domain:TARGET.domain}],customDomains:[]}},deploymentTriggers:{pageInfo:{hasNextPage:false},edges:[{node:trigger()}]},privateExtra:poison}};}
const cases=[
 ['duplicate-distinct','DUPLICATE_TRIGGERS',d=>d.INVENTORY.deploymentTriggers.edges.push({node:{...trigger(),id:'qa-second'}})],
 ['duplicate-identical','DUPLICATE_TRIGGERS',d=>d.INVENTORY.deploymentTriggers.edges.push({node:trigger()})],
 ['pagination-incomplete','TRIGGERS',d=>d.INVENTORY.deploymentTriggers.pageInfo.hasNextPage=true],
 ['pagination-edges-object','TRIGGERS',d=>d.INVENTORY.deploymentTriggers.edges={}],
 ['pagination-too-many','TRIGGERS',d=>d.INVENTORY.deploymentTriggers.edges=[{node:trigger()},{node:trigger()},{node:trigger()}]],
 ['pagination-flag-malformed','METADATA',d=>d.INVENTORY.deploymentTriggers.pageInfo.hasNextPage='false'],
 ['domain-missing','DOMAINS',d=>d.INVENTORY.serviceInstance.domains.serviceDomains=[]],
 ['domain-duplicate','DOMAINS',d=>d.INVENTORY.serviceInstance.domains.customDomains=[{domain:TARGET.domain}]],
 ['domain-poison','METADATA',d=>d.INVENTORY.serviceInstance.domains.serviceDomains=[{domain:poison}]],
 ['domain-shape','METADATA',d=>d.INVENTORY.serviceInstance.domains.customDomains=null],
 ['environment-poison','TARGET',d=>d.ACCESS.environment.name=poison],
 ['project-mismatch','TARGET',d=>d.ACCESS.project.id=poison],
 ['service-mismatch','TARGET',d=>d.INVENTORY.serviceInstance.serviceId=poison],
 ['trigger-target','TARGET',d=>d.INVENTORY.deploymentTriggers.edges[0].node.environmentId=poison],
 ['missing-me','IDENTITY_RESPONSE_INVALID',d=>delete d.IDENTITY.me],
 ['null-me','IDENTITY_RESPONSE_INVALID',d=>d.IDENTITY.me=null],
 ['missing-id','METADATA',d=>delete d.IDENTITY.me.id],
 ['malformed-node','INVENTORY_RESPONSE_INVALID',d=>d.INVENTORY.deploymentTriggers.edges=[null]],
 ['foreign-projection-poison','IDENTITY_RESPONSE_INVALID',()=>{},'getter'],
 ['foreign-lookalike-safe-code','IDENTITY_RESPONSE_INVALID',()=>{},'lookalike'],
 ['foreign-provider-poison','IDENTITY_NETWORK',()=>{},'network'],
 ['graphql-provider-poison','IDENTITY_GRAPHQL_REJECTED',()=>{},'graphql'],
];
const results=[];
async function cli(label,data,mode='normal'){
 const cwd=await mkdtemp(tmpdir()+'/qa495-fresh-');
 const preload=`const data=${JSON.stringify(data)},queries=${JSON.stringify(QUERIES)},poison=${JSON.stringify(poison)},mode=${JSON.stringify(mode)};
 const original=JSON.parse;JSON.parse=function(...a){const b=original(...a);if(b?.data&&Object.hasOwn(b.data,'me')&&['getter','lookalike'].includes(mode)){Object.defineProperty(b.data,'me',{get(){throw new Error(mode==='lookalike'?'DEMO_BEARER_TARGET':poison)}});}return b;};
 globalThis.fetch=async(url,opts)=>{let body;if(url===${JSON.stringify(MAIN_ENDPOINT)})body={ref:'refs/heads/main',object:{type:'commit',sha:${JSON.stringify(sha)}}};else{const phase=Object.keys(queries).find(k=>queries[k]===original(opts.body).query);if(phase==='IDENTITY'&&mode==='network')throw new Error(poison);body=phase==='IDENTITY'&&mode==='graphql'?{errors:[{message:poison,extensions:{code:poison}}]}:{data:data[phase]};}const r=new Response(JSON.stringify(body));Object.defineProperty(r,'url',{value:url});return r;};`;
 const child=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(preload),'/workspace/clinicos-demo-bearer-readiness/scripts/automation/inspect-demo-bearer-readiness.mjs'],{cwd,env:{PATH:process.env.PATH,RAILWAY_TOKEN:'qa-fake-bearer-only',GITHUB_TOKEN:'qa-fake-main-only',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REPOSITORY:TARGET.repository,GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,CONFIGURE_DEMO_REVIEWED_SHA:sha,GITHUB_RUN_ID:'8895',GITHUB_RUN_ATTEMPT:'1'},encoding:'utf8',timeout:15000});
 let receipt=null;try{receipt=await readFile(cwd+'/demo-bearer-readiness-receipt.json','utf8');}catch(e){assert.equal(e.code,'ENOENT');}return{child,receipt,cwd};
}
for(const[label,code,mutate,mode]of cases)test('actual CLI: '+label,async()=>{const d=fixture();mutate(d);const{child,receipt}=await cli(label,d,mode);assert.equal(child.error,undefined);assert.equal(child.status,1);assert.equal(child.stdout,'');assert.equal(child.stderr,`::error::DEMO_BEARER_${code}\nDEMO_BEARER_${code}\n`);assert.equal(receipt,null);assert(!child.stderr.includes(sentinel));results.push({case:label,status:child.status,stdoutBytes:0,stderrCode:'DEMO_BEARER_'+code,receiptWritten:false});});
test('success exact projection, identity discarded, flags false and exclusive file',async()=>{const{child,receipt,cwd}=await cli('success',fixture());assert.equal(child.status,0);assert.equal(child.stderr,'');const r=JSON.parse(receipt);assert.equal(child.stdout,'DEMO_BEARER_READINESS_RECEIPT '+JSON.stringify(r)+'\n');for(const forbidden of[sentinel,'qa-identity-discard','privateExtra','qa-fake-bearer-only','qa-fake-main-only'])assert(!receipt.includes(forbidden));assert.deepEqual(Object.keys(r.observations).sort(),['environment','inventory','repositoryAccess']);for(const k of['mutationAllowed','serviceConnectAllowed','deployVerified'])assert.equal(r[k],false);assert.equal(r.projectWideVisibility,'unproven');assert.equal((await stat(cwd+'/demo-bearer-readiness-receipt.json')).mode&0o777,0o600);results.push({case:'success',status:0,receiptWritten:true,identityDiscarded:true,authorizationFlagsFalse:true});});
test('false environment access skips inventory, remains non-authorizing',async()=>{const d=fixture();d.ACCESS.environment.canAccess=false;d.INVENTORY={malformed:poison};const{child,receipt}=await cli('false-access',d);assert.equal(child.status,0);const r=JSON.parse(receipt);assert.equal(r.observations.inventory,null);assert.equal(r.outcome,'observed-access-false');assert.equal(r.mutationAllowed,false);results.push({case:'false-access',status:0,receiptWritten:true,inventory:null});});
test.after(async()=>await writeFile(root+'/public/cli-observations.json',JSON.stringify({scope:'Fresh synthetic actual CLI only; not clinical/provider/deploy proof',sentinel,results},null,2)+'\n'));

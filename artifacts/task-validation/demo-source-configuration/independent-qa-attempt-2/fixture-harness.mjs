import assert from 'node:assert/strict';
import {TARGET,ENDPOINT,MAIN_ENDPOINT,INVENTORY_QUERY,CREATE_MAIN,UPDATE_BRANCH,configure,createClient,createMainVerifier,projectInventory,inventoryDigest,serializeReceipt,ConfigurationError} from '../../../../scripts/automation/configure-demo-source.mjs';
export const SHA='c'.repeat(40), RAIL='qa-fixture-provider-credential', GIT='qa-fixture-github-credential';
export const context={repository:TARGET.repository,reviewedSha:SHA,runId:'9001',runAttempt:'1'};
export const node=()=>({id:'qa-new-trigger-002',provider:'GitHub',projectId:TARGET.projectId,environmentId:TARGET.environmentId,serviceId:TARGET.serviceId,repository:TARGET.repository,branch:'main',checkSuites:true,baseEnvironmentOverrideId:null});
export const fixture=()=>({projectToken:{project:{id:TARGET.projectId},environment:{id:TARGET.environmentId,name:'demo'}},serviceInstance:{serviceId:TARGET.serviceId,environmentId:TARGET.environmentId,rootDirectory:'/backend',source:{repo:TARGET.repository},domains:{serviceDomains:[{domain:TARGET.domain}],customDomains:[{domain:'qa.example.test'}]}},deploymentTriggers:{pageInfo:{hasNextPage:false},edges:[]}});
export const cases={
 'create':{outcome:'trigger-created',writes:1},'null-root':{outcome:'trigger-created',writes:1},'existing-compliant':{outcome:'unchanged',writes:0},'branch-update':{outcome:'branch-updated',writes:1},
 'stale-digest':{outcome:'DEMO_SOURCE_INVENTORY_DRIFT',writes:0},'double-read-drift':{outcome:'DEMO_SOURCE_INVENTORY_DRIFT',writes:0},'concurrent-trigger':{outcome:'DEMO_SOURCE_INVENTORY_DRIFT',writes:0},'existing-wrong-policy':{outcome:'DEMO_SOURCE_CREATE_CONFLICT',writes:0},'duplicate':{outcome:'DEMO_SOURCE_DUPLICATE_TRIGGERS',writes:0},'foreign-repository':{outcome:'DEMO_SOURCE_FOREIGN_REPOSITORY',writes:0},'truncated':{outcome:'DEMO_SOURCE_DUPLICATE_TRIGGERS',writes:0},'main-before-write':{outcome:'DEMO_SOURCE_CURRENT_MAIN_DRIFT',writes:0},'main-after-write':{outcome:'DEMO_SOURCE_CURRENT_MAIN_DRIFT',writes:1},'reply-wrong-id':{outcome:'DEMO_SOURCE_POST_CREATE_DRIFT',writes:1},'reply-wrong-policy':{outcome:'DEMO_SOURCE_CREATE_UNCONFIRMED',writes:1},'post-domain-drift':{outcome:'DEMO_SOURCE_POST_CREATE_DRIFT',writes:1},'provider-rejects':{outcome:'DEMO_SOURCE_API_REJECTED',writes:1},'post-read-fails':{outcome:'DEMO_SOURCE_API_REJECTED',writes:1},'receipt-reflection':{outcome:'DEMO_SOURCE_INVALID_RECEIPT',writes:1},
};
export function harness(name='create'){
 assert.ok(cases[name]);let state=fixture(),reads=0,writes=0,mainReads=0;const calls=[];
 if(name==='null-root')state.serviceInstance.rootDirectory=null;
 if(name.startsWith('existing-')||name==='branch-update'||name==='duplicate'||name==='foreign-repository'){state.deploymentTriggers.edges=[{node:node()}];}
 if(name==='branch-update'){state.deploymentTriggers.edges[0].node.branch='prior-branch';state.deploymentTriggers.edges[0].node.checkSuites=false;state.deploymentTriggers.edges[0].node.baseEnvironmentOverrideId='qa-keep-inheritance';}
 if(name==='existing-wrong-policy')state.deploymentTriggers.edges[0].node.checkSuites=false;
 if(name==='duplicate'){let second=node();second.id='qa-second-trigger';state.deploymentTriggers.edges.push({node:second});}
 if(name==='truncated')state.deploymentTriggers.pageInfo.hasNextPage=true;
 let expected=name==='foreign-repository'?'0'.repeat(64):inventoryDigest(projectInventory(state));
 if(name==='foreign-repository')state.deploymentTriggers.edges[0].node.repository='qa/foreign';
 if(name==='stale-digest')expected='0'.repeat(64);
 const dispatch=async(url,options)=>{
   assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);
   if(url===MAIN_ENDPOINT){mainReads++;calls.push({kind:'main'});assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,`Bearer ${GIT}`);assert.equal(options.headers['Project-Access-Token'],undefined);assert.equal(options.cache,'no-store');return{ref:'refs/heads/main',object:{type:'commit',sha:(name==='main-before-write'&&mainReads===2)||(name==='main-after-write'&&mainReads===3)?'d'.repeat(40):SHA}};}
   assert.equal(url,ENDPOINT);assert.equal(options.method,'POST');assert.equal(options.headers['Project-Access-Token'],RAIL);assert.equal(options.headers.Authorization,undefined);
   const {query,variables}=JSON.parse(options.body);calls.push({kind:query===INVENTORY_QUERY?'inventory':query===CREATE_MAIN?'create':'update',variables});
   if(query===INVENTORY_QUERY){reads++;assert.deepEqual(variables,{projectId:TARGET.projectId,environmentId:TARGET.environmentId,serviceId:TARGET.serviceId});if(reads===2&&name==='double-read-drift')state.serviceInstance.rootDirectory='/concurrent';if(reads===2&&name==='concurrent-trigger')state.deploymentTriggers.edges=[{node:node()}];if(reads===3&&name==='post-read-fails')return{errors:[{message:'qa-private-provider-marker'}]};return{data:structuredClone(state)};}
   writes++;
   if(query===CREATE_MAIN){assert.deepEqual(variables,{input:{projectId:TARGET.projectId,environmentId:TARGET.environmentId,serviceId:TARGET.serviceId,repository:TARGET.repository,branch:'main',provider:'github',checkSuites:true,rootDirectory:state.serviceInstance.rootDirectory}});if(name==='provider-rejects')return{errors:[{message:'qa-private-provider-marker'}]};state.deploymentTriggers.edges=[{node:node()}];const reply=node();if(name==='reply-wrong-id')reply.id='qa-wrong-created-id';if(name==='reply-wrong-policy')reply.checkSuites=false;if(name==='post-domain-drift')state.serviceInstance.domains.customDomains.push({domain:'changed.example.test'});if(name==='receipt-reflection'){state.deploymentTriggers.edges[0].node.id=RAIL;reply.id=RAIL;}return{data:{deploymentTriggerCreate:reply,privateResponse:'qa-private-provider-marker'}};}
   assert.equal(query,UPDATE_BRANCH);assert.deepEqual(variables,{id:node().id,input:{branch:'main'}});state.deploymentTriggers.edges[0].node.branch='main';return{data:{deploymentTriggerUpdate:{id:node().id,branch:'main'}}};
 };
 const snapshot=()=>({scenario:name,reads,writes,mainReads,branch:state.deploymentTriggers.edges[0]?.node.branch??'absent',rootDirectory:state.serviceInstance.rootDirectory,checkSuites:state.deploymentTriggers.edges[0]?.node.checkSuites??null,override:state.deploymentTriggers.edges[0]?.node.baseEnvironmentOverrideId??null,domainCount:state.serviceInstance.domains.customDomains.length});
 const run=async(fetchImpl=async(url,options)=>Response.json(await dispatch(url,options)))=>{
   try{const result=await configure({client:createClient({token:RAIL,fetchImpl}),operation:name==='branch-update'?'set-main':'create-main',expectedDigest:expected,assertFreshContext:createMainVerifier({token:GIT,reviewedSha:SHA,fetchImpl})});const receipt=JSON.parse(serializeReceipt(context,result,{forbiddenValues:[RAIL,GIT]}));return{outcome:result.outcome,...snapshot(),receipt};}
   catch(e){assert.ok(e instanceof ConfigurationError);return{outcome:e.code,...snapshot()};}
 };
 return{dispatch,snapshot,run,calls};
}

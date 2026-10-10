import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/428-operator-role',source=JSON.parse(readFileSync(root+'/frozen-source.json')).applicationCommit;
const env=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const gh=args=>{const r=spawnSync('gh',args,{encoding:'utf8',maxBuffer:40e6,windowsHide:true,env:{...process.env,GH_TOKEN:env.GITHUB_TOKEN||env.GH_TOKEN}});assert.equal(r.status,0,'Release metadata retrieval failed safely');return r.stdout;};
const sha=b=>createHash('sha256').update(b).digest('hex');
try {
 const runs=JSON.parse(gh(['run','list','--repo','l2v-hub/ClinicOS','--commit',source,'--limit','20','--json','databaseId,workflowName,status,conclusion,headSha,url']));
 const railwayRun=runs.find(r=>r.workflowName==='Deploy Backend to Railway');
 if(!railwayRun||railwayRun.status!=='completed'){console.log('Backend deployment workflow pending');process.exit(2);}
 assert.equal(railwayRun.conclusion,'success');assert.equal(railwayRun.headSha,source);
 const workflowLog=gh(['run','view',String(railwayRun.databaseId),'--repo','l2v-hub/ClinicOS','--log']);
 const checkout=workflowLog.match(/git log -1 --format=%H[^\n]*\n[^\n]*?([a-f0-9]{40})/);assert.ok(checkout);assert.equal(checkout[1],source);
 const railwayId=workflowLog.match(/Deployment: https:\/\/railway.com\/[^\s]*[?&]id=([a-f0-9-]{36})/);assert.ok(railwayId);
 const provider=await fetch('https://backboard.railway.com/graphql/v2',{method:'POST',headers:{Authorization:`Bearer ${env.RAILWAY_API_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:`query { deployment(id:"${railwayId[1]}") { id status createdAt meta } }`})});assert.equal(provider.status,200);const payload=await provider.json();assert.equal(payload.errors,undefined);const railway=payload.data.deployment;
 if(railway.status!=='SUCCESS'){console.log(JSON.stringify({backendState:railway.status}));process.exit(2);}assert.ok(railway.meta.imageDigest);
 const vh={Authorization:`Bearer ${env.VERCEL_TOKEN}`};
 const listResponse=await fetch('https://api.vercel.com/v6/deployments?projectId=prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6&teamId=team_P8yHboFntuOI9pT0zdgbJAqU&target=production&limit=15',{headers:vh});assert.equal(listResponse.status,200);const list=await listResponse.json(),match=list.deployments.find(d=>d.meta.githubCommitSha===source);if(!match){console.log('Frontend deployment pending');process.exit(2);}
 const detailResponse=await fetch(`https://api.vercel.com/v13/deployments/${match.uid}?teamId=team_P8yHboFntuOI9pT0zdgbJAqU`,{headers:vh});assert.equal(detailResponse.status,200);const d=await detailResponse.json();if(d.readyState!=='READY'){console.log(JSON.stringify({frontendState:d.readyState}));process.exit(2);}assert.equal(d.meta.githubCommitSha,source);assert.equal(d.gitSource.sha,source);assert.ok(d.alias.includes('clinicos-eosin.vercel.app'));
 const front=await fetch('https://clinicos-eosin.vercel.app/');assert.equal(front.status,200);const html=await front.text(),entry=html.match(/src="([^" ]*\/assets\/[^" ]+\.js)"/);assert.ok(entry);const url=new URL(entry[1],'https://clinicos-eosin.vercel.app/').href,bundle=await fetch(url);assert.equal(bundle.status,200);const bytes=Buffer.from(await bundle.arrayBuffer());
 const styleAssets=[];for(const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)){const styleUrl=new URL(m[1],'https://clinicos-eosin.vercel.app/').href;assert.ok(styleUrl.startsWith('https://clinicos-eosin.vercel.app/assets/'));const response=await fetch(styleUrl);assert.equal(response.status,200);styleAssets.push({url:styleUrl,sha256:sha(Buffer.from(await response.arrayBuffer()))});}assert.ok(styleAssets.length>0);
 const health=await fetch('https://clinicos-backend-production-df88.up.railway.app/health');assert.equal(health.status,200);
 const receipt={applicationCommit:source,checkedAt:new Date().toISOString(),decision:'VERIFIED RELEASE',vercel:{id:d.id,state:d.readyState,githubCommitSha:d.meta.githubCommitSha,gitSourceSha:d.gitSource.sha,productionAlias:'https://clinicos-eosin.vercel.app/',http:front.status,bundleUrl:url,bundleHttp:bundle.status,bundleSha256:sha(bytes),styleAssets,htmlSha256:sha(html)},backend:{changed:true,runId:railwayRun.databaseId,runUrl:railwayRun.url,eventHeadSha:railwayRun.headSha,actualCheckoutSha:checkout[1],workflowConclusion:railwayRun.conclusion,railwayDeploymentId:railway.id,railwayStatus:railway.status,imageDigest:railway.meta.imageDigest,healthHttp:health.status,newMigrations:false,provenance:'Actions exact checkout plus deployment upload ID, provider SUCCESS/image digest and health200; no production patient test mutation'},productionPatientTestMutations:0,compiledSemanticAcceptance:'Separate guarded compiled proof still required'};
 writeFileSync(root+'/deployment-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}catch{console.log('Release inspection failed safely; no raw provider exception');process.exitCode=1;}

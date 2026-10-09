import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/419-calendar-create',source='fa028c11ffe5dbfe514df8110e6ccf7f6b977602';
const settings=JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
const vercelHeaders={Authorization:`Bearer ${settings.VERCEL_TOKEN}`};
try {
 const listResponse=await fetch('https://api.vercel.com/v6/deployments?projectId=prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6&teamId=team_P8yHboFntuOI9pT0zdgbJAqU&target=production&limit=15',{headers:vercelHeaders});assert.equal(listResponse.status,200);
 const list=await listResponse.json(),match=list.deployments.find(d=>d.meta.githubCommitSha===source);
 if(!match){console.log('Candidate deployment not yet present');process.exit(2);}
 const detailResponse=await fetch(`https://api.vercel.com/v13/deployments/${match.uid}?teamId=team_P8yHboFntuOI9pT0zdgbJAqU`,{headers:vercelHeaders});assert.equal(detailResponse.status,200);
 const deployment=await detailResponse.json();
 if(deployment.readyState!=='READY'){console.log(JSON.stringify({id:deployment.id,state:deployment.readyState}));process.exit(2);}
 assert.equal(deployment.meta.githubCommitSha,source);assert.equal(deployment.gitSource.sha,source);assert.ok(deployment.alias.includes('clinicos-eosin.vercel.app'));
 const front=await fetch('https://clinicos-eosin.vercel.app/');assert.equal(front.status,200);const html=await front.text();
 const entry=html.match(/src="([^" ]*\/assets\/[^" ]+\.js)"/);assert.ok(entry);const url=new URL(entry[1],'https://clinicos-eosin.vercel.app/').href;
 const bundleResponse=await fetch(url);assert.equal(bundleResponse.status,200);const bytes=Buffer.from(await bundleResponse.arrayBuffer());
 const health=await fetch('https://clinicos-backend-production-df88.up.railway.app/health');assert.equal(health.status,200);
 const receipt={applicationCommit:source,checkedAt:new Date().toISOString(),decision:'VERIFIED RELEASE',vercel:{id:deployment.id,state:deployment.readyState,githubCommitSha:deployment.meta.githubCommitSha,gitSourceSha:deployment.gitSource.sha,productionAlias:'https://clinicos-eosin.vercel.app/',http:front.status,bundleUrl:url,bundleHttp:bundleResponse.status,bundleSha256:createHash('sha256').update(bytes).digest('hex')},backend:{changed:false,retainedApplication:'47a4b16c111d9b9bfd0b138991958a8ca8f6c351',retainedDeployment:'ed539cb2-224c-4221-8e7a-0f0901039987',healthHttp:health.status},productionPatientTestMutations:0,compiledSemanticAcceptance:'Separate guarded online browser evidence required before closure'};
 writeFileSync(root+'/deployment-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
} catch {console.log('Release inspection failed safely; no raw credential/provider exception');process.exitCode=1;}

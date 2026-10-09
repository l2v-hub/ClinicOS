import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const own=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const phase=process.argv[2]||'before',target=path.join(own,'deployment-'+phase+'.json');
assert.equal(fs.existsSync(target),false);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source='b7ae14d120c1e70ccf72784206a505f8c48f975e';
const expected=JSON.parse(fs.readFileSync('C:/w-424/artifacts/task-validation/424-reading-action/release-resume-20261010/deployment-receipt.json','utf8'));
assert.equal(expected.applicationCommit,source);
try{
 const env=JSON.parse(fs.readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json','utf8')).env;
 const response=await fetch('https://api.vercel.com/v13/deployments/dpl_2am1AHqBzDcCYtctXYmCqJvKXEYW?teamId=team_P8yHboFntuOI9pT0zdgbJAqU',{headers:{Authorization:`Bearer ${env.VERCEL_TOKEN}`}});
 assert.equal(response.status,200);const d=await response.json();assert.equal(d.readyState,'READY');assert.equal(d.meta.githubCommitSha,source);assert.equal(d.gitSource.sha,source);assert.ok(d.alias.includes('clinicos-eosin.vercel.app'));
 const front=await fetch('https://clinicos-eosin.vercel.app/');assert.equal(front.status,200);const html=await front.text();assert.equal(sha(Buffer.from(html)),expected.vercel.htmlSha256);
 const js=html.match(/src="([^" ]*\/assets\/[^" ]+\.js)"/);assert.ok(js);const url=new URL(js[1],'https://clinicos-eosin.vercel.app/').href;assert.equal(url,expected.vercel.bundleUrl);
 const bundle=await fetch(url);assert.equal(bundle.status,200);const bundleSha256=sha(Buffer.from(await bundle.arrayBuffer()));assert.equal(bundleSha256,expected.vercel.bundleSha256);
 const styles=[];for(const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)){const u=new URL(m[1],'https://clinicos-eosin.vercel.app/').href;assert.ok(u.startsWith('https://clinicos-eosin.vercel.app/assets/'));const r=await fetch(u);assert.equal(r.status,200);styles.push({url:u,sha256:sha(Buffer.from(await r.arrayBuffer()))});}assert.deepEqual(styles,expected.vercel.styleAssets);
 const receipt={at:new Date().toISOString(),phase,applicationCommit:source,vercel:{id:d.id,state:d.readyState,githubCommitSha:d.meta.githubCommitSha,gitSourceSha:d.gitSource.sha,alias:'https://clinicos-eosin.vercel.app/',htmlSha256:sha(Buffer.from(html)),bundleUrl:url,bundleSha256,styles},realRequests:'Read-only Vercel metadata and static GET only',clinicalApiRequests:0,productionPatientMutations:0};
 fs.writeFileSync(target,JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}catch{console.error('Independent deployment binding failed safely. No provider exception or credential emitted.');process.exitCode=1;}

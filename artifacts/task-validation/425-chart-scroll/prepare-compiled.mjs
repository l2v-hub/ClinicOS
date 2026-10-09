import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='artifacts/task-validation/425-chart-scroll',out=root+'/compiled-online';
const receipt=JSON.parse(readFileSync(root+'/deployment-receipt.json'));assert.equal(receipt.applicationCommit,'b7ae14d120c1e70ccf72784206a505f8c48f975e');assert.equal(receipt.decision,'VERIFIED RELEASE');mkdirSync(out+'/recipes',{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),records=[];
const oldTransport="  if(!['localhost','127.0.0.1'].includes(url.hostname)){state.external.push(url.origin);return route.abort();}\n  if(url.port!== '3001')return route.continue();";
const transport="  const api=['clinicos-backend-demo.up.railway.app','clinicos-backend-production-df88.up.railway.app'].includes(url.hostname);\n  if(!api){if(url.hostname==='clinicos-eosin.vercel.app'&&req.method()==='GET'&&(path==='/'||path.startsWith('/assets/')||path==='/favicon.ico'))return route.continue();state.external.push(url.origin);return route.abort();}";
for(const name of ['browser01.mjs','browser02-denied.mjs','browser03-clip.mjs']){
 const bytes=readFileSync(root+'/root-rerun2/recipes/'+name),source=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replaceAll('\r\n','\n');assert.equal(source.split(oldTransport).length,2);
 const oldUrl='`http://127.0.0.1:${process.env.QA_PORT||7513}/#/dettaglio-paziente/${patient.id}/terapia-farmacologica`';assert.equal(source.split(oldUrl).length,2);
 const compiled=source.replace(oldTransport,transport).replace(oldUrl,'`https://clinicos-eosin.vercel.app/#/dettaglio-paziente/${patient.id}/terapia-farmacologica`');
 writeFileSync(out+'/recipes/'+name,compiled);records.push({name,localFrozenRecipeSha256:hash(bytes),compiledRecipeSha256:hash(Buffer.from(compiled)),changed:'Only guarded origin transport and production static URL; assertions, fixtures and role/viewports unchanged'});
}
writeFileSync(out+'/pre-run.json',JSON.stringify({applicationCommit:receipt.applicationCommit,bundleUrl:receipt.vercel.bundleUrl,bundleSha256Before:receipt.vercel.bundleSha256,styleAssets:receipt.vercel.styleAssets,htmlSha256Before:receipt.vercel.htmlSha256,records,decision:'RECIPES FROZEN BEFORE COMPILED ONLINE READONLY TESTS',productionPatientTestMutations:0,at:new Date().toISOString()},null,2));console.log('Compiled recipes frozen; all clinical/auth APIs intercepted before wire');

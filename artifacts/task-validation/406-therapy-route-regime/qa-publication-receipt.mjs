import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { resolve,relative } from 'node:path';
const out=resolve(process.env.QA406_OUTPUT || 'artifacts/task-validation/406-therapy-route-regime/independent');
const root=resolve('artifacts/task-validation/406-therapy-route-regime');
const browser=JSON.parse(readFileSync(resolve(out,'test-results/browser-results.json'),'utf8'));
assert.equal(browser.outcomes.length,9);assert.ok(browser.outcomes.every(x=>x.status==='PASS'));
const source=JSON.parse(readFileSync(resolve(out,'source-receipt.json'),'utf8'));assert.equal(source.applicationCommit,'c11c0990f6313a53a8bcde467046eecef69e012a');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
 if(entry.name==='debug-attempts'||entry.name==='publication-manifest.json')return [];
 const path=resolve(directory,entry.name);return entry.isDirectory()?walk(path):[path];
});
const helperNames=['qa-commands.mjs','qa-db.mjs','qa-db-regression.mjs','qa-browser.mjs','qa-server.mjs','qa-source-receipt.mjs','qa-publication-receipt.mjs','task-contract.md','issue-source.json','implementation-receipt.md'];
const files=[...walk(out),...helperNames.map(name=>resolve(root,name))].sort().map(path=>({path:relative(process.cwd(),path).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(resolve(out,'publication-manifest.json'),JSON.stringify({applicationCommit:source.applicationCommit,applicationSourceSha256:source.sourceSha256,verdict:'READY FOR CODEX QA',passingBrowserAssertions:9,excluded:['debug-attempts/**','unrelated launcher changes','generated coordination metadata'],files},null,2));
console.log(JSON.stringify({manifestFiles:files.length,browserPass:9,applicationCommit:source.applicationCommit,sourceSha256:source.sourceSha256}));

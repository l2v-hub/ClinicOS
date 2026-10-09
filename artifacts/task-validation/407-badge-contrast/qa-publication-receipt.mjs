import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { resolve,relative } from 'node:path';
const out=resolve(process.env.QA407_OUTPUT||'artifacts/task-validation/407-badge-contrast/independent');
const root=resolve('artifacts/task-validation/407-badge-contrast');
const browser=JSON.parse(readFileSync(resolve(out,'test-results/browser-results.json'),'utf8'));
assert.equal(browser.outcomes.length,6);assert.ok(browser.outcomes.every(x=>x.status==='PASS'));
const source=JSON.parse(readFileSync(resolve(out,'source-receipt.json'),'utf8'));assert.equal(source.applicationCommit,'973d78e5e109032a36cf89cf80fd8eb2a848a649');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
 if(entry.name==='debug-attempts'||entry.name==='publication-manifest.json')return [];
 const path=resolve(directory,entry.name);return entry.isDirectory()?walk(path):[path];
});
writeFileSync(resolve(out,'contract-snapshot.md'),readFileSync(resolve(root,'task-contract.md')));
writeFileSync(resolve(out,'implementation-receipt-snapshot.md'),readFileSync(resolve(root,'implementation-receipt.md')));
const helpers=['qa-commands.mjs','qa-browser.mjs','qa-server.mjs','qa-source-receipt.mjs','qa-publication-receipt.mjs'];
const files=[...walk(out),...helpers.map(name=>resolve(root,name))].sort().map(path=>({path:relative(process.cwd(),path).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
writeFileSync(resolve(out,'publication-manifest.json'),JSON.stringify({applicationCommit:source.applicationCommit,applicationSourceSha256:source.sourceSha256,verdict:'BLOCKED',blocker:'Original AC2 device visual check not yet performed in this independent headless run; a genuine visible Windows Chrome desktop-browser check remains for root under the explicitly reconciled contract. No mobile physical-device/sunlight certification.',passingBrowserAssertions:6,excluded:['debug-attempts/**','unrelated launcher changes','generated coordination metadata'],files},null,2));
console.log(JSON.stringify({manifestFiles:files.length,browserPass:6,applicationCommit:source.applicationCommit,sourceSha256:source.sourceSha256}));

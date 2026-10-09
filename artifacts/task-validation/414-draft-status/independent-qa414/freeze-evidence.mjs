import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = dirname(fileURLToPath(import.meta.url));
const pre = JSON.parse(readFileSync(resolve(root,'pre/source-receipt.json'),'utf8'));
const post = JSON.parse(readFileSync(resolve(root,'post/source-receipt.json'),'utf8'));
assert.equal(pre.applicationCommit, post.applicationCommit);
assert.equal(pre.sourceSha256, post.sourceSha256);
const files = [];
function walk(directory) {
  for (const name of readdirSync(directory).sort()) {
    const path = resolve(directory,name);
    if (statSync(path).isDirectory()) walk(path);
    else if (!['evidence-manifest.json','immutable-manifest.json'].includes(name)) files.push({path:relative(root,path).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});
  }
}
walk(root);
writeFileSync(resolve(root,'immutable-manifest.json'),JSON.stringify({verdict:'READY FOR CODEX QA',applicationCommit:pre.applicationCommit,sourceSha256:pre.sourceSha256,files},null,2));
console.log(JSON.stringify({applicationCommit:pre.applicationCommit,sourceSha256:pre.sourceSha256,artifacts:files.length}));

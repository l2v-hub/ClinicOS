import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const out = resolve(process.argv[2]);
assert.ok(process.argv[2]);
assert.equal(existsSync(out + '/recipes.json'), false);
mkdirSync(out + '/recipes', {recursive:true});
const files = ['browser.mjs','qa-server.mjs','commands.mjs','db-regression.mjs','prisma-validation.mjs','source-receipt.mjs','task-contract.md','execution-policy.md','prepare-attempt.mjs'];
const records = files.map(name => {
  const bytes = readFileSync(new URL(name, import.meta.url));
  writeFileSync(out + '/recipes/' + name, bytes);
  return {name, sha256:createHash('sha256').update(bytes).digest('hex')};
});
writeFileSync(out + '/recipes.json',JSON.stringify({ frozenBeforeExecution:process.env.RETROSPECTIVE !== '1', note:process.env.RETROSPECTIVE === '1' ? 'First baseline harness URL failure preserved retrospectively before any recipe correction; never accepted as QA' : 'Recipes frozen before execution', files:records },null,2));

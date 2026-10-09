import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='artifacts/task-validation/419-calendar-create';
const qa=process.argv[2]||'C:/w-419-qa/artifacts/task-validation/419-calendar-create/independent-qa419';
const bytes=readFileSync(`${qa}/immutable-manifest.json`),manifest=JSON.parse(bytes);
for(const file of manifest.files)assert.equal(createHash('sha256').update(readFileSync(`${qa}/${file.path}`)).digest('hex'),file.sha256,`QA artifact mismatch ${file.path}`);
const candidate=JSON.parse(readFileSync(`${root}/root-final/pre-run/source/source-receipt.json`,'utf8'));
const local=JSON.parse(readFileSync(`${qa}/source-before/source-receipt.json`,'utf8'));
assert.equal(local.applicationCommit,candidate.applicationCommit);assert.equal(local.fileCount,candidate.fileCount);
const byPath=new Map(candidate.files.map(f=>[f.path,f.sha256]));
for(const file of local.files){if(byPath.get(file.path)!==file.sha256){const a=readFileSync(file.path,'utf8').replace(/\r\n/g,'\n');const b=readFileSync(`C:/w-419-qa/${file.path}`,'utf8').replace(/\r\n/g,'\n');assert.equal(a,b,`QA source substantive mismatch ${file.path}`);}}
const receipt={applicationCommit:candidate.applicationCommit,sourceSha256:candidate.sourceSha256,qaManifestSha256:createHash('sha256').update(bytes).digest('hex'),immutableFilesVerified:manifest.files.length,sourceFilesVerified:local.fileCount,physicalDifferencesAllowed:'CRLF/LF only after individual content equality',checkedAt:new Date().toISOString(),decision:'ARTIFACT INTEGRITY VERIFIED; root still must review report/recipes/images and rerun, not a release gate alone'};
writeFileSync(`${root}/independent-integrity-receipt.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));

import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const source='C:/w-425-qa/artifacts/task-validation/425-chart-scroll/independent-qa';
const target='artifacts/task-validation/425-chart-scroll/failed-independent-qa-796';
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(existsSync(target),false);
const bytes=readFileSync(source+'/artifact-manifest.json');
assert.equal(hash(bytes),'a69b2123ffa5765005099a494ed66aa030561836b748fdec15ad93798885e22f');
const manifest=JSON.parse(bytes);assert.equal(manifest.files.length,142);
for(const f of manifest.files){assert.ok(!f.path.includes('..'));assert.equal(hash(readFileSync(source+'/'+f.path)),f.sha256);mkdirSync(dirname(target+'/'+f.path),{recursive:true});copyFileSync(source+'/'+f.path,target+'/'+f.path);assert.equal(hash(readFileSync(target+'/'+f.path)),f.sha256);}
writeFileSync(target+'/artifact-manifest.json',bytes);
console.log('142 failed QA artifacts copied and raw SHA-verified; original immutable bundle unchanged');

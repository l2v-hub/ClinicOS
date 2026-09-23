import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {renderAssessmentPdf,assessmentRendererVersion} from '../../../backend/dist/assessments/pdf-renderer.js';
const folder=resolve('artifacts/task-validation/po-16-giro');
const state=JSON.parse(await readFile(resolve(folder,'preview/synthetic-state.json'),'utf8'));
const assessment=state.assessments.find(a=>a.id===state.seed.presentationDraft.id);
assert.equal(assessment.status,'final');
assert.equal(assessment.finalSnapshot.result.total.score,27.5);
assert.equal(assessmentRendererVersion(assessment.finalSnapshot),'mna-a4-v2');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=[];
for(const name of ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','OFL.txt']){
 const source=await readFile(resolve('backend/src/assessments/fonts',name)),built=await readFile(resolve('backend/dist/assessments/fonts',name));
 assert.ok(source.equals(built),`Built font mismatch: ${name}`);
 assets.push({name,bytes:built.length,sha256:sha(built)});
}
const output=resolve(folder,'qa-evidence/compiled-pdfs');await mkdir(output,{recursive:true});
const bytes=await renderAssessmentPdf(assessment.finalSnapshot);
assert.equal(bytes.subarray(0,4).toString(),'%PDF');
const path=resolve(output,`${assessment.id}.pdf`);await writeFile(path,bytes);
await writeFile(resolve(folder,'compiled-pdf-receipt.json'),JSON.stringify({at:new Date().toISOString(),assets,rendered:[{assessmentId:assessment.id,type:assessment.type,rendererVersion:assessmentRendererVersion(assessment.finalSnapshot),snapshotSha256:assessment.snapshotSha256,bytes:bytes.length,pdfSha256:sha(bytes)}]},null,2));
console.log(JSON.stringify({verifiedAssets:assets.length,rendered:1,path}));

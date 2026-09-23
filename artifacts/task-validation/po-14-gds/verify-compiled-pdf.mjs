import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {renderAssessmentPdf,assessmentRendererVersion} from '../../../backend/dist/assessments/pdf-renderer.js';
const folder=resolve('artifacts/task-validation/po-14-gds');
const state=JSON.parse(await readFile(resolve(folder,'preview/synthetic-state.json'),'utf8'));
const finals=state.assessments.filter(a=>a.status==='final'&&a.finalSnapshot);
if(!finals.some(a=>a.type==='gds15'))throw new Error('No synthetic final GDS15 snapshot');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=[];
for(const name of ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','OFL.txt']){
 const source=await readFile(resolve('backend/src/assessments/fonts',name)),built=await readFile(resolve('backend/dist/assessments/fonts',name));
 if(!source.equals(built))throw new Error(`Built font mismatch: ${name}`);
 assets.push({name,bytes:built.length,sha256:sha(built)});
}
const output=resolve(folder,'qa-evidence/compiled-pdfs');await mkdir(output,{recursive:true});
const rendered=[];
for(const assessment of finals){
 const bytes=await renderAssessmentPdf(assessment.finalSnapshot);
 if(bytes.subarray(0,4).toString()!=='%PDF')throw new Error('Compiled renderer did not emit PDF');
 await writeFile(resolve(output,`${assessment.id}.pdf`),bytes);
 rendered.push({assessmentId:assessment.id,type:assessment.type,rendererVersion:assessmentRendererVersion(assessment.finalSnapshot),snapshotSha256:assessment.snapshotSha256,bytes:bytes.length,pdfSha256:sha(bytes)});
}
await writeFile(resolve(folder,'compiled-pdf-receipt.json'),JSON.stringify({at:new Date().toISOString(),assets,rendered},null,2));
console.log(JSON.stringify({verifiedAssets:assets.length,rendered:rendered.length}));

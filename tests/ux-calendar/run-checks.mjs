import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/task-validation/calendari-terapia-compatti-con-popup-e-ritorno/test-results');
const tests=['src/lib/__tests__/therapyCalendarState.test.ts','src/lib/__tests__/wardNavPatientSection.test.ts','src/components/operator/__tests__/therapyGiro.test.ts','src/lib/__tests__/therapyView.test.ts','src/lib/__tests__/therapyW2InPlace.test.ts','src/lib/__tests__/therapyPages.test.ts','src/lib/__tests__/patientTherapyCalendar.test.ts','src/lib/__tests__/navHistory.test.ts','src/lib/__tests__/patientTargetHash.test.ts','src/lib/__tests__/navigationStaleWhileRevalidate.test.ts'];
for(const [name,args] of [['focused',['--import','tsx','--import','../scripts/stub-css-loader.mjs','--test',...tests]],['types',['../node_modules/typescript/bin/tsc','-b']],['build',['../node_modules/vite/bin/vite.js','build']]]){
 const result=spawnSync(process.execPath,args,{cwd:path.resolve('frontend'),encoding:'utf8',maxBuffer:20*1024*1024});
 writeFileSync(path.join(out,name+'.txt'),result.stdout+result.stderr);
 console.log(name+': '+(result.status===0?'PASS':'FAIL'));if(result.status!==0){console.log((result.stdout+result.stderr).slice(-3500));process.exitCode=1;break;}
}

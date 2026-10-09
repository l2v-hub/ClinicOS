import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {writeFileSync,readFileSync,readdirSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve('artifacts/task-validation/424-reading-action/independent-qa');
const r=spawnSync('powershell.exe',['-NoProfile','-Command',`ruflo security scan --target '${resolve('frontend/src').replaceAll('\\','/')}' --depth deep --type code --output json`],{cwd:root,encoding:'utf8',maxBuffer:20e6,windowsHide:true});
writeFileSync(root+'/security-cli.log',(r.stdout||'')+(r.stderr||''));
const files=[];function walk(d){for(const n of readdirSync(d)){const p=d+'/'+n;if(statSync(p).isDirectory())walk(p);else if(n.endsWith('.json'))files.push(p);}}
walk(root+'/.claude/security-scans');
const scan=JSON.parse(readFileSync(files.find(p=>p.includes('code')))),baseline=JSON.parse(readFileSync('C:/w-422/artifacts/task-validation/422-drug-results/security/scan-code-deep.json'));
writeFileSync(root+'/security-source-scan.json',JSON.stringify(scan,null,2));
assert.deepEqual(scan.summary,baseline.summary);assert.deepEqual(scan.findings,baseline.findings);
writeFileSync(root+'/security-comparison.json',JSON.stringify({candidate:'67d21c3e9257a5acb8c9b25130c9417fb92185fb',baseline:'b5f471cd2cd56839e7ebbd0d3daf0bbf04791468',summary:scan.summary,newFindings:[],changedPathFindings:[],scope:'Unchanged inherited three MEDIUM heuristic findings outside five changed paths. No global vulnerability, CVE or human PHI certification.'},null,2));
console.log('Independent scoped security: zero new findings');

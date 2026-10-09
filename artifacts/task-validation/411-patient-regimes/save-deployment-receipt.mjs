import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const root = 'artifacts/task-validation/411-patient-regimes';
const r = spawnSync('pwsh', ['-NoProfile', '-File', `${root}/release-inspection.ps1`], { encoding: 'utf8', maxBuffer: 2*1024*1024, windowsHide: true });
if (r.status !== 0) { console.log(r.stdout.trim()); process.exit(r.status ?? 1); }
const receipt = JSON.parse(r.stdout);
if (receipt.decision !== 'VERIFIED RELEASE') throw new Error('Release not verified');
writeFileSync(`${root}/deployment-receipt.json`, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));

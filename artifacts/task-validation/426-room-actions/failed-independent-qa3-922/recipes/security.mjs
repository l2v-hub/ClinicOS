import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {writeFileSync,readFileSync,readdirSync,statSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=resolve(process.argv[2]);assert.ok(process.argv[2]);assert.equal(existsSync(root),false);mkdirSync(root,{recursive:true});
const baseline='b7ae14d120c1e70ccf72784206a505f8c48f975e';
const changed=['frontend/src/components/admin/RoomsManagement.tsx','frontend/src/components/admin/RoomManagementModel.ts','frontend/src/components/admin/RoomFormPanel.tsx','frontend/src/components/admin/BedEditDialog.tsx','frontend/src/components/admin/RoomActions.css','frontend/src/lib/__tests__/roomActionIdentity.test.ts','frontend/src/lib/__tests__/roomAssignmentScope.test.ts','frontend/src/lib/__tests__/roomBedDialogAccessibility.test.ts'];
const records=[];
for(const kind of ['baseline','candidate']){
 const dir=root+'/'+kind;mkdirSync(dir,{recursive:true});const absent=[];
 for(const p of changed){const target=dir+'/'+p;mkdirSync(dirname(target),{recursive:true});if(kind==='candidate')copyFileSync(p,target);else{const r=spawnSync('git',['show',baseline+':'+p],{maxBuffer:20e6});if(r.status===0)writeFileSync(target,r.stdout);else absent.push(p);}}
 const r=spawnSync(process.execPath,['C:/Users/Claudio/AppData/Roaming/npm/node_modules/ruflo/bin/ruflo.js','security','scan','--target',dir,'--depth','deep','--type','code','--output','json'],{cwd:dir,encoding:'utf8',maxBuffer:20e6,windowsHide:true});
 writeFileSync(root+'/'+kind+'-cli.log',(r.stdout||'')+(r.stderr||''));assert.equal(r.status,0);
 const files=[];function walk(d){for(const n of readdirSync(d)){const p=d+'/'+n;if(statSync(p).isDirectory())walk(p);else if(n.endsWith('.json'))files.push(p);}}
 walk(dir+'/.claude/security-scans');const scan=JSON.parse(readFileSync(files.find(p=>p.includes('code'))));records.push({kind,absent,summary:scan.summary,findings:scan.findings});
}
assert.deepEqual(records[0].summary,records[1].summary);assert.deepEqual(records[0].findings,records[1].findings);
writeFileSync(root+'/comparison.json',JSON.stringify({baseline,changed,records,newFindings:[],scope:'Changed source files only; files absent at baseline honestly omitted. Native scanner samples/coordination sideeffects isolated to owned artifact scratch. Not global CVE certification.'},null,2));console.log('Scoped native scanner: zero new findings');

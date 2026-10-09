import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const root='artifacts/task-validation/418-reading-recency/root-rerun/device';
const response=await fetch('http://127.0.0.1:7482/api/__qa418/receipt');assert.equal(response.status,200);
const receipt=await response.json();assert.equal(receipt.applicationCommit,'ae2a94f3dc66a6f1c2eb693d1d9faf6c3924c01c');
assert.deepEqual(receipt.unexpected,[]);assert.deepEqual(receipt.deniedWrites,[]);assert.equal(receipt.clinicalWrites,0);
for(const name of ['overview-final-ax.txt','ward-final-ax.txt']) {
 const ax=readFileSync(root+'/'+name,'utf8');assert.match(ax,/\d+ minuti fa/);assert.match(ax,/3 giorni fa/);assert.match(ax,/2 settimane fa/);
 assert.match(ax,/Misurato il/);assert.match(ax,/09\/10\/2026/);assert.match(ax,/06\/10\/2026/);assert.match(ax,/25\/09\/2026/);
}
const metrics=JSON.parse(readFileSync(root+'/overview-metrics.json'));
assert.equal(metrics.visibility,'visible');assert.equal(metrics.width,2133);assert.equal(metrics.height,1145);
assert.ok(metrics.captions.every(c=>c.font==='14px'&&c.scroll<=c.client&&c.color==='rgb(22, 32, 46)'));
writeFileSync(root+'/guard-receipt.json',JSON.stringify({...receipt,checkedAt:new Date().toISOString(),actualBrowser:{provider:'Chrome extension ID3',tab:'1809686341',viewportCss:{width:metrics.width,height:metrics.height},viewportOverride:false,mobileEmulation:false},evidence:'Genuine visible desktop AX and read-only rendered DOM metrics, not headless. Actual pixel screenshot UNAVAILABLE: all three documented capture attempts timed out; no substituted image.',verdict:'AC4 independent assessment pending; no production release or issue closure authorized by this receipt'},null,2));
console.log('Actual desktop AX/runtime and synthetic API guard recorded; no actual-device screenshot claim');

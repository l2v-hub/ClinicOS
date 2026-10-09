import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='artifacts/task-validation/418-reading-recency/root-final/device';
const response=await fetch('http://127.0.0.1:7482/api/__qa418/receipt');assert.equal(response.status,200);
const receipt=await response.json();assert.equal(receipt.applicationCommit,'d028e1ee4c5c44d96b5005362b28f54e5c05fee1');
assert.deepEqual(receipt.unexpected,[]);assert.deepEqual(receipt.deniedWrites,[]);assert.equal(receipt.clinicalWrites,0);
for(const name of ['overview-final-ax.txt','ward-final-ax.txt']) {
 const ax=readFileSync(root+'/'+name,'utf8');assert.match(ax,/\d+ minuti fa/);assert.match(ax,/3 giorni fa/);assert.match(ax,/2 settimane fa/);
 assert.match(ax,/Misurato il/);assert.match(ax,/09\/10\/2026/);assert.match(ax,/06\/10\/2026/);assert.match(ax,/25\/09\/2026/);
}
const metrics=JSON.parse(readFileSync(root+'/overview-metrics.json'));
assert.equal(metrics.visibility,'visible');assert.equal(metrics.width,2133);assert.equal(metrics.height,1145);
assert.ok(metrics.captions.every(c=>c.font==='14px'&&c.scroll<=c.client&&c.color==='rgb(22, 32, 46)'));
const ward=JSON.parse(readFileSync(root+'/ward-metrics.json'));
assert.equal(metrics.scale,1);assert.equal(ward.scale,1);
assert.ok(ward.captions.every(c=>c.font==='14px'&&c.scroll<=c.client&&c.right<=ward.width));
assert.deepEqual(JSON.parse(readFileSync(root+'/browser-error-logs.json')),[]);
const image=readFileSync(root+'/overview-actual-desktop.png');assert.ok(image.length>10000);
writeFileSync(root+'/guard-receipt.json',JSON.stringify({...receipt,checkedAt:new Date().toISOString(),actualBrowser:{provider:'Chrome extension ID3',tab:'1809686345',viewportCss:{width:metrics.width,height:metrics.height},scale:1,viewportOverride:false,mobileEmulation:false},evidence:'Genuine visible desktop overview and ward AX/read-only rendered DOM metrics. Original overview desktop pixels captured by documented cua getScreenshot; ward pixel attempt timed out, original failure retained, no substituted image.',screenshot:{path:'overview-actual-desktop.png',sha256:createHash('sha256').update(image).digest('hex')},verdict:'Actual desktop comparison recorded, independent AC assessment required; no production release or closure authorized by this receipt'},null,2));
console.log('Actual desktop overview pixels and overview/ward runtime comparison verified; synthetic API guard no writes');

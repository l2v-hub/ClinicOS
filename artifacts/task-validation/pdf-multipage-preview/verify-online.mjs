import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = 'artifacts/task-validation/pdf-multipage-preview', read = p => JSON.parse(readFileSync(root + '/' + p, 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex'), deployment = read('deployment-receipt.json');
assert.equal(deployment.vercel.state, 'READY'); assert.equal(deployment.resources.length, 11);
const paths = new Set(); let scenarios = 0;
for (const folder of ['browser-legacy-fidelity', 'browser-v2-fidelity']) {
  const records = read('compiled-online/' + folder + '/results.json'); assert.equal(records.length, 2);
  for (const record of records) {
    assert.equal(record.online, true); assert.equal(record.pass, true); assert.deepEqual(record.errors, []); assert.deepEqual(record.httpErrors, []); assert.deepEqual(record.state.forbidden, []);
    assert.ok(record.requests.some(r => r.path.endsWith('jbig2_nowasm_fallback.js')));
    assert.ok(record.requests.filter(r => r.path.startsWith('/assets/')).every(r => r.method === 'GET'));
    for (const request of record.requests.filter(r => r.path.startsWith('/assets/'))) paths.add(request.path);
    scenarios++;
  }
}
assert.equal(read('compiled-online/fidelity-measurements.json').length, 24);
const html = await fetch(deployment.vercel.alias + '/'); assert.equal(html.status, 200);
assert.equal(sha(Buffer.from(await html.arrayBuffer())), deployment.vercel.htmlSha256);
assert.equal(html.headers.get('content-security-policy'), deployment.vercel.csp);
const assets = [];
for (const path of [...paths].sort()) {
  const response = await fetch(deployment.vercel.alias + path); assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer()); assets.push({ path, http: response.status, sha256: sha(bytes), mime: response.headers.get('content-type') });
}
assert.equal(assets.find(a => a.path === deployment.vercel.bundlePath).sha256, deployment.vercel.bundleSha256);
assert.ok(assets.some(a => /DischargeImportModal/.test(a.path))); assert.ok(assets.some(a => /PdfCanvasPreview/.test(a.path)));
const receipt = { applicationCommit: deployment.applicationCommit, deploymentId: deployment.vercel.id, decision: 'ACTUAL DEPLOYED SPA ACCEPTANCE VERIFIED', scenarios, rasterComparisons: 24, htmlAndEntryShaUnchanged: true, cspUnchanged: true, assets, productionPatientTestMutations: 0, realPersistence: false, realAuthenticationTested: false, mobileHardware: false, routeGuard: 'All authentication/roster/import API intercepted before wire; only production static GET reached network; synthetic session/reorder only', at: new Date().toISOString() };
writeFileSync(root + '/compiled-online/online-receipt.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ scenarios, rasterComparisons: 24, staticAssetsVerified: assets.length, decision: receipt.decision }));

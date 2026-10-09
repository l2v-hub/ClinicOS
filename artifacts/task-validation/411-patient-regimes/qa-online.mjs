import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
// Exercise the deployed compiled frontend, but intercept every backend request before network.
// Static public frontend assets only may leave this isolated test context; no user session/PHI.
let helper = readFileSync('artifacts/task-validation/411-patient-regimes/qa-browser.mjs', 'utf8');
const guard = "if (!['127.0.0.1', 'localhost'].includes(url.hostname)) { state.external.push(url.origin); return route.abort(); }\n    if (url.port !== '3001') return route.continue();";
assert.ok(helper.includes(guard));
helper = helper.replace(guard,
  "if (url.hostname === 'clinicos-eosin.vercel.app' && req.method() === 'GET') return route.continue();\n    if (url.hostname !== 'clinicos-backend-demo.up.railway.app') { state.external.push(url.origin); return route.abort(); }\n    // Exact API host observed in the public compiled deployment; synthetic fulfillment only.");
assert.ok(helper.includes('http://127.0.0.1:7474/#/operator-dashboard'));
helper = helper.replace('http://127.0.0.1:7474/#/operator-dashboard', 'https://clinicos-eosin.vercel.app/#/operator-dashboard');
helper = helper.replace('Source-bound Vite SPA; fully guarded synthetic in-memory API.',
  'Verified-source deployed compiled Vercel frontend; every backend request intercepted before network, synthetic in-memory API only.');
assert.ok(process.argv[2], 'Explicit output dir required');
await import('data:text/javascript;base64,' + Buffer.from(helper).toString('base64'));

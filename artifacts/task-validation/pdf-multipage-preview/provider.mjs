import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'artifacts/task-validation/pdf-multipage-preview', app = '30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6';
const configured = JSON.parse(readFileSync('C:/Workspace/ClinicOSHouse/.claude/settings.local.json', 'utf8')).env;
const team = 'team_P8yHboFntuOI9pT0zdgbJAqU', project = 'prj_6eDFTx8o4IoZhCXr4Sd7LX6dteo6';
const api = async (path, options = {}) => {
  const response = await fetch('https://api.vercel.com/' + path + (path.includes('?') ? '&' : '?') + 'teamId=' + team, { ...options, headers: { Authorization: 'Bearer ' + configured.VERCEL_TOKEN, 'Content-Type': 'application/json' } });
  assert.equal(response.status < 300, true, 'Provider HTTP ' + response.status);
  return response.json();
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  const p = await api('v9/projects/' + project);
  assert.equal(p.id, project); assert.equal(p.rootDirectory, 'frontend'); assert.equal(p.link.repoId, 1256069551);
  if (process.argv[2] === 'deploy') {
    const gate = JSON.parse(readFileSync(root + '/release-gate.json', 'utf8'));
    assert.equal(gate.applicationCommit, app); assert.equal(gate.decision, 'AUTHORIZED SCOPED PROMOTION');
    assert.match(execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], { encoding: 'utf8' }), new RegExp('^' + app + '\\s'));
    assert.equal(execFileSync('git', ['diff', 'HEAD', '--name-only', '--', 'frontend'], { encoding: 'utf8' }).trim(), '');
    assert.equal(execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'frontend'], { encoding: 'utf8' }).trim(), '');
    const current = await api('v6/deployments?projectId=' + project + '&target=production&limit=10');
    const existing = current.deployments.find(d => d.meta?.githubCommitSha === app);
    if (existing) {
      const receipt = { applicationCommit: app, id: existing.uid, url: existing.url, state: existing.readyState, method: 'Existing exact Git-source production build triggered by authorized main push; no duplicate CLI deployment', at: new Date().toISOString() };
      writeFileSync(root + '/deployment-request.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt)); process.exit(0);
    }
    const cli = 'C:/Users/Claudio/AppData/Local/pnpm/global/v11/8100-19faccf7ef4-42b82a10a2f6323e/node_modules/vercel/dist/vc.js';
    const run = spawnSync(process.execPath, [cli, 'deploy', '--prod', '--archive=tgz', '--yes', '--token', configured.VERCEL_TOKEN], { encoding: 'utf8', windowsHide: true, maxBuffer: 20e6, env: { ...process.env, VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: project } });
    const safeLog = (run.stdout + run.stderr).replaceAll(configured.VERCEL_TOKEN, '[REDACTED]');
    writeFileSync(root + '/deploy-cli.log', safeLog); assert.equal(run.status, 0, 'Global Vercel CLI deployment failed');
    const url = run.stdout.match(/https:\/\/[^\s]+\.vercel\.app/)[0];
    const d = await api('v13/deployments/' + new URL(url).hostname);
    const receipt = { applicationCommit: app, id: d.id, url: d.url, state: d.readyState, method: 'Global Vercel CLI from isolated root, archive=tgz; .vercelignore excludes artifacts/private files', at: new Date().toISOString() };
    writeFileSync(root + '/deployment-request.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt));
  } else {
    const request = JSON.parse(readFileSync(root + '/deployment-request.json', 'utf8'));
    const d = await api('v13/deployments/' + request.id);
    assert.equal(d.gitSource.sha, app); assert.equal(d.meta.githubCommitSha, app);
    if (d.readyState !== 'READY') { console.log(JSON.stringify({ id: d.id, state: d.readyState })); process.exit(['ERROR', 'CANCELED'].includes(d.readyState) ? 1 : 2); }
    assert.ok(d.alias.includes('clinicos-eosin.vercel.app'));
    const origin = 'https://clinicos-eosin.vercel.app', htmlResponse = await fetch(origin + '/'); assert.equal(htmlResponse.status, 200);
    const html = await htmlResponse.text(), bundlePath = html.match(/src="([^" ]*\/assets\/[^" ]+\.js)"/)[1];
    const bundle = await fetch(new URL(bundlePath, origin)); assert.equal(bundle.status, 200);
    const resources = [];
    for (const name of readdirSync('node_modules/pdfjs-dist/wasm').filter(n => /^(?:jbig2|openjpeg)(?:_nowasm_fallback\.js|\.wasm)$|^qcms_bg\.wasm$|^LICENSE_/.test(n))) {
      const path = '/assets/pdfjs-6.2.108/' + name, response = await fetch(origin + path); assert.equal(response.status, 200);
      if (name.endsWith('.wasm') || name.endsWith('.js')) assert.match(response.headers.get('content-type'), name.endsWith('.wasm') ? /application\/wasm/ : /javascript/);
      const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(sha(bytes), sha(readFileSync('node_modules/pdfjs-dist/wasm/' + name)));
      resources.push({ path, http: response.status, contentType: response.headers.get('content-type'), sha256: sha(bytes) });
    }
    assert.equal(execFileSync('git', ['diff', '--name-only', '3f911cbd281d7c93c4796e97d5940258ceb331f0', app, '--', 'backend', 'prisma', 'railway.json', 'package.json', '.github/workflows'], { encoding: 'utf8' }).trim(), '');
    const health = await fetch('https://clinicos-backend-production-df88.up.railway.app/health'); assert.equal(health.status, 200);
    const receipt = { applicationCommit: app, decision: 'VERIFIED EXACT DEPLOYMENT', vercel: { id: d.id, state: d.readyState, gitSourceSha: d.gitSource.sha, githubCommitSha: d.meta.githubCommitSha, alias: origin, htmlSha256: sha(html), bundlePath, bundleSha256: sha(Buffer.from(await bundle.arrayBuffer())), csp: htmlResponse.headers.get('content-security-policy') }, resources, backend: { changed: false, healthHttp: 200, redeployed: false }, productionPatientTestMutations: 0, at: new Date().toISOString() };
    writeFileSync(root + '/deployment-receipt.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ id: d.id, state: d.readyState, resourcesVerified: resources.length }));
  }
} catch (error) { console.log('Deployment gate failed safely: ' + (error instanceof assert.AssertionError ? error.message : 'Provider unavailable')); process.exitCode = 1; }

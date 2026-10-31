// QA-only synthetic report. Never imported by production entry points.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import {
  fixture,
  claim,
  selector,
  report,
} from '../../agent-team/tests/bug-pipeline/cloud-recovery-fixture.mjs';

const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function evidenceServer(output, cwd) {
  await mkdir(output, { recursive: true });
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
  const f = fixture();
  const before = digest(f.preserved);
  const held = await claim(f);
  await f.core.retain(held, report, { tracked: ['src/feature.ts'] });
  await f.core.publish(held);
  f.assertPreserved();
  await assert.rejects(f.controller().prepare(selector));
  await writeFile(path.join(output, 'synthetic-state.json'), JSON.stringify(f.state(), null, 2));
  // Actual disk roundtrip: the UI is derived from the persisted result, not constants.
  const reloaded = JSON.parse(await readFile(path.join(output, 'synthetic-state.json'), 'utf8'));
  const batch = reloaded.batches[0];
  const followup = batch.postMergeFollowups[0];
  const request = followup.technicalRecoveryRequests[0];
  assert.equal(digest(request.preservedAccounting), before);
  assert.equal(digest(request.execution.report), digest(report));
  const result = {
    sourceSha,
    syntheticOnly: true,
    actualClaudeCalls: 0,
    originalConsumedRounds: batch.reviews.length + followup.reviews.length,
    reviewLimit: request.preservedAccounting.reviewLimit,
    originalFailure: followup.reviews[0].status,
    executionStatus: request.execution.status,
    technicalExecutions: followup.technicalRecoveryRequests.filter((x) => x.execution).length,
    mockReviewPosts: f.calls.filter((x) => x.kind === 'post').length,
    accountingPreserved: before === digest(request.preservedAccounting),
    reportPreserved: digest(request.execution.report) === digest(report),
    replayRejected: true,
    realMergeOrDeploy: false,
  };
  await writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Synthetic same-round recovery QA</title>
<style>body{font:18px system-ui;background:#eef3f9;color:#18324d;max-width:1020px;margin:40px auto}main{background:white;padding:32px;border:1px solid #ccd8e7;border-radius:16px}h1{font-size:28px}p{color:#52697e}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:11px;border-bottom:1px solid #e0e8f1}code{font-size:14px;word-break:break-all}.notice{background:#edf8f5;padding:15px;border-radius:8px}strong{color:#075c73}</style>
<main><h1>Same-round recovery · synthetic QA</h1><p class="notice">Mock authorizer, GitHub and provider only. <strong>No actual Claude call, merge or deployment.</strong></p>
<p>Verified code commit: <code id="source">${sourceSha}</code></p><table><tr><th>Invariant / result</th><th>Persisted value</th></tr>
${Object.entries(result)
  .filter(([key]) => key !== 'sourceSha')
  .map(([key, value]) => `<tr><td>${key}</td><td id="${key}">${value}</td></tr>`)
  .join('')}
</table><p>The consumed fifth-round failure remains intact. This is infrastructure qualification, not a real PR review.</p></main></html>`;
  await writeFile(path.join(output, 'result.html'), html);
  const server = createServer(async (req, res) => {
    const file =
      req.url === '/' ? 'result.html' : req.url === '/result.json' ? 'result.json' : null;
    if (!file) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const body = await readFile(path.join(output, file));
      res.writeHead(200, {
        'Content-Type': file.endsWith('json') ? 'application/json' : 'text/html',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    result,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

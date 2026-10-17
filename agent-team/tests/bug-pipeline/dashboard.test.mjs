import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { dashboardSnapshot, loadDashboard } from '../../src/bug-pipeline/dashboard.mjs';
import { createDashboardServer } from '../../src/bug-pipeline/dashboard-server.mjs';

const repo = 'l2v-hub/ClinicOS';
const empty = { schemaVersion: 1, repository: repo, batches: [] };

test('collection window is visible as queued aggregation, without claiming or exposing issue data', () => {
  const snapshot = dashboardSnapshot({
    repo,
    state: { ...empty, triageQueue: { issues: [17, 18], openedAt: 1000, changedAt: 2000 } },
    issues: [{ number: 17 }, { number: 18 }, { number: 19 }],
    queue: [17, 18, 19],
  });
  assert.equal(snapshot.counts.processing, 0);
  assert.equal(snapshot.counts.queued, 3);
  assert.equal(snapshot.rows[0].phase, 'Raccolta issue per accorpamento');
  assert.equal(snapshot.rows[1].phase, 'Raccolta issue per accorpamento');
  assert.equal(snapshot.rows[2].phase, 'In attesa del controller');
});

test('snapshot distinguishes the authorized queue, triage, external QA and waiting issues without exposing source payloads', () => {
  const snapshot = dashboardSnapshot({
    repo,
    state: { ...empty, pendingTriage: { issues: [3] } },
    issues: [
      { number: 1, body: 'private-patient-data', title: '<img onerror=alert(1)>', labels: [] },
      { number: 2, labels: ['codex-run'] },
      { number: 3 },
      { number: 4, labels: ['ready-for-qa'] },
    ],
    queue: [2],
    setup: { merged: false },
  });
  assert.deepEqual(
    snapshot.rows.map((row) => row.status),
    ['In attesa di avvio', 'In coda', 'In progress', 'Gestita da altro flusso'],
  );
  assert.equal(snapshot.rows[2].phase, 'Triage e accorpamento');
  assert.deepEqual(snapshot.counts, { queued: 1, processing: 1, blocked: 0, resolved: 0 });
  assert.doesNotMatch(JSON.stringify(snapshot), /private-patient-data|onerror|body|title/);
});

test('dashboard loader is read-only and propagates a source failure instead of returning an empty queue', async () => {
  const github = {
    readDashboardState: async () => empty,
    listBugIssues: async () => [],
    discoverQueue: async () => {
      throw new Error('HTTP 403 private-provider-detail');
    },
    dashboardSetup: async () => ({ merged: false }),
  };
  await assert.rejects(loadDashboard(github, repo), /HTTP 403/);
});

function request(port, { path = '/api/status', method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const call = http.request(
      { hostname: '127.0.0.1', port, path, method, headers },
      (response) => {
        let body = '';
        response.on('data', (data) => {
          body += data;
        });
        response.on('end', () =>
          resolve({ status: response.statusCode, body, headers: response.headers }),
        );
      },
    );
    call.once('error', reject);
    call.end();
  });
}

test('local dashboard blocks foreign Host/Origin, cross-site reads, mutations and path traversal', async (t) => {
  let loads = 0;
  const server = createDashboardServer({
    load: async () => {
      loads++;
      return { safe: true };
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  for (const options of [
    { headers: { Host: 'attacker.example' } },
    { headers: { Origin: 'https://attacker.example' } },
    { headers: { 'Sec-Fetch-Site': 'cross-site' } },
  ])
    assert.equal((await request(port, options)).status, 403);
  assert.equal((await request(port, { method: 'POST' })).status, 405);
  assert.equal((await request(port, { path: '/../../.env' })).status, 404);
  assert.equal(loads, 0);
  const valid = await request(port);
  assert.equal(valid.status, 200);
  assert.deepEqual(JSON.parse(valid.body), { ok: true, snapshot: { safe: true } });
  assert.equal(valid.headers['cache-control'], 'no-store');
  assert.match(valid.headers['content-security-policy'], /frame-ancestors 'none'/);
});

test('refresh failure preserves the previous snapshot, reports staleness and never leaks provider diagnostics', async (t) => {
  let calls = 0;
  const server = createDashboardServer({
    refreshMs: 0,
    load: async () => {
      if (calls++) throw new Error('sk-private-token');
      return { rows: [{ number: 17 }] };
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  const first = JSON.parse((await request(port)).body);
  const failed = JSON.parse((await request(port)).body);
  assert.equal(first.ok, true);
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.snapshot, first.snapshot);
  assert.match(failed.error, /non confermato/);
  assert.doesNotMatch(JSON.stringify(failed), /sk-private-token/);
});

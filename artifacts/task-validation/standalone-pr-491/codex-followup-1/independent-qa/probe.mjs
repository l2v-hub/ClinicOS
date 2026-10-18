import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '/workspace/ClinicOS/node_modules/playwright/index.mjs';
import { expect } from '/workspace/ClinicOS/node_modules/playwright/test.mjs';
import { TARGET, INVENTORY_QUERY, createClient } from '/workspace/clinicos-demo-source-topology/scripts/automation/configure-demo-source.mjs';
import {
  ENVIRONMENTS_QUERY, SERVICES_QUERY, INSTANCES_QUERY, TRIGGERS_QUERY,
  inspectTopology, serializeTopologyReceipt,
} from '/workspace/clinicos-demo-source-topology/scripts/automation/inspect-demo-source-topology.mjs';

// Loopback-only test surface. Production inspector/client consume synthetic fixtures;
// the client transport is intercepted and redirected to this process before any network I/O.
const out = path.dirname(new URL(import.meta.url).pathname);
const scenarios = ['singleton', 'multipage', 'inaccessible', 'repeat-cursor', 'drift', 'private-error', 'unsafe-metadata', 'foreign-owner', 'mutation-denied'];
const results = [];
const observations = [];
const counters = new Map();
const safeContext = { repository: TARGET.repository, reviewedSha: 'b'.repeat(40), runId: '987654321', runAttempt: '1' };
const errors = [];
let server, browser, context;

function page(nodes, after, size = 50) {
  const offset = after === null ? 0 : Number(after.slice(2));
  const chunk = nodes.slice(offset, offset + size);
  const more = offset + chunk.length < nodes.length;
  return { edges: chunk.map((node) => ({ node })), pageInfo: { hasNextPage: more, endCursor: more ? `c-${offset + chunk.length}` : null } };
}
function fixture(scenario, query, variables) {
  const key = `${scenario}:${query}`;
  counters.set(key, (counters.get(key) || 0) + 1);
  const count = counters.get(key);
  const demo = { id: TARGET.environmentId, projectId: TARGET.projectId, name: 'demo', canAccess: true, isEphemeral: false, sourceEnvironment: null };
  const extra = { id: 'qa-visible-second', projectId: TARGET.projectId, name: 'qa preview', canAccess: scenario !== 'inaccessible', isEphemeral: true, sourceEnvironment: { id: demo.id, projectId: TARGET.projectId } };
  const environments = scenario === 'multipage' || scenario === 'inaccessible' ? [demo, extra] : [demo];
  const services = [
    { id: TARGET.serviceId, name: scenario === 'drift' && count === 2 ? 'changed' : 'backend', projectId: TARGET.projectId },
    ...(scenario === 'multipage' ? [{ id: 'qa-extra-service', name: 'aux', projectId: TARGET.projectId }] : []),
  ];
  if (query === ENVIRONMENTS_QUERY) {
    if (scenario === 'unsafe-metadata') demo.name = 'qa/bad-name';
    if (scenario === 'foreign-owner') demo.projectId = 'qa-foreign';
    const connection = page(environments, variables.after ?? null, scenario === 'multipage' ? 1 : 50);
    if (scenario === 'repeat-cursor') connection.pageInfo = { hasNextPage: true, endCursor: 'same' };
    return { project: { id: TARGET.projectId, environments: connection, unrequestedPrivate: 'MUST_NOT_APPEAR' } };
  }
  if (query === SERVICES_QUERY) return { project: { id: TARGET.projectId, services: page(services, variables.after ?? null, scenario === 'multipage' ? 1 : 50) } };
  if (query === INSTANCES_QUERY) return { environment: { id: variables.environmentId, projectId: TARGET.projectId, serviceInstances: page([{ id: `instance-${variables.environmentId}`, serviceId: TARGET.serviceId, environmentId: variables.environmentId, rootDirectory: '/', source: { repo: TARGET.repository } }], variables.after ?? null) } };
  if (query === TRIGGERS_QUERY) return { environment: { id: variables.environmentId, projectId: TARGET.projectId, deploymentTriggers: page([], variables.after ?? null) } };
  if (query === INVENTORY_QUERY) return {
    projectToken: { project: { id: TARGET.projectId }, environment: { id: TARGET.environmentId, name: 'demo' } },
    serviceInstance: { serviceId: TARGET.serviceId, environmentId: TARGET.environmentId, rootDirectory: '/', source: { repo: TARGET.repository }, domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] } },
    deploymentTriggers: { edges: [], pageInfo: { hasNextPage: false } },
    unrequestedPrivate: 'MUST_NOT_APPEAR',
  };
  throw new Error('QA_UNEXPECTED_QUERY');
}

try {
  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/graphql') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const { query, variables } = JSON.parse(Buffer.concat(chunks));
        const scenario = url.searchParams.get('scenario');
        assert.ok(scenarios.includes(scenario));
        assert.ok([ENVIRONMENTS_QUERY, SERVICES_QUERY, INSTANCES_QUERY, TRIGGERS_QUERY, INVENTORY_QUERY].includes(query));
        assert.equal(variables.projectId, TARGET.projectId);
        assert.doesNotMatch(query, /mutation|serviceConnect/i);
        observations.push({ scenario, queryType: query === ENVIRONMENTS_QUERY ? 'environments' : query === SERVICES_QUERY ? 'services' : query === INSTANCES_QUERY ? 'instances' : query === TRIGGERS_QUERY ? 'triggers' : 'scoped', environmentId: variables.environmentId ?? null, after: variables.after ?? null });
        res.setHeader('Content-Type', 'application/json');
        if (scenario === 'private-error') {
          res.end(JSON.stringify({ errors: [{ message: 'SYNTHETIC_PROVIDER_PRIVATE' }] }));
          return;
        }
        res.end(JSON.stringify({ data: fixture(scenario, query, variables) }));
        return;
      }
      if (url.pathname === '/run') {
        const scenario = url.searchParams.get('scenario');
        assert.ok(scenarios.includes(scenario));
        const before = observations.length;
        let record;
        try {
          const client = createClient({ token: 'synthetic-local-fixture', fetchImpl: async (_endpoint, options) => {
            const response = await fetch(`http://127.0.0.1:${server.address().port}/graphql?scenario=${scenario}`, options);
            return new Response(response.body, { status: response.status, headers: response.headers });
          } });
          let freshnessChecks = 0;
          const result = await inspectTopology({ operation: scenario === 'mutation-denied' ? 'connect' : 'inspect', client, assertFreshContext: async () => { freshnessChecks += 1; } });
          const receipt = JSON.parse(serializeTopologyReceipt(safeContext, result, { forbiddenValues: ['synthetic-local-fixture', 'MUST_NOT_APPEAR'] }));
          assert.equal(receipt.inventory.serviceConnectAllowed, false);
          assert.equal(receipt.inventory.projectWideVisibility, 'unproven');
          assert.equal(freshnessChecks, 3);
          assert.equal(Object.isFrozen(result.inventory.environments), true);
          assert.throws(() => serializeTopologyReceipt(safeContext, structuredClone(result)), (error) => error.code === 'DEMO_TOPOLOGY_INVALID_RECEIPT');
          record = {
            scenario, status: 'inspected',
            paginationComplete: receipt.inventory.paginationComplete,
            allVisibleEnvironmentsAccessible: receipt.inventory.allVisibleEnvironmentsAccessible,
            projectWideVisibility: receipt.inventory.projectWideVisibility,
            serviceConnectAllowed: receipt.inventory.serviceConnectAllowed,
            refusalReason: receipt.inventory.refusalReason,
            reads: observations.length - before,
            environments: receipt.inventory.environments.length,
            receipt,
          };
        } catch (error) {
          record = { scenario, status: 'rejected', code: error.code, reads: observations.length - before };
          assert.match(record.code, /^DEMO_TOPOLOGY_[A-Z_]+$/);
        }
        results.push(record);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(record));
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><meta charset="utf-8"><title>Topology QA</title><style>body{font:20px system-ui;margin:42px;max-width:1250px;color:#10223f}h1{color:#2f6bed}button{font-size:18px;margin:5px;padding:10px}pre{padding:25px;background:#edf3ff;white-space:pre-wrap;overflow-wrap:anywhere}#warning{background:#fff0cc;padding:18px}.status{display:flex;gap:24px;flex-wrap:wrap}.status p{background:#f4f6fa;padding:12px 18px}</style><h1>ClinicOS · topology inspector · independent QA</h1><p id="warning">LOCAL SYNTHETIC HTTP FIXTURE — no live provider, credentials, connection or deployment.</p><p>Production inspectTopology + createClient. Project-wide visibility remains unproven.</p><div>${scenarios.map((scenario) => `<button data-scenario="${scenario}">${scenario}</button>`).join('')}</div><button id="refresh" disabled>Refresh by reloading this operation</button><h2 id="scenario">Choose scenario</h2><div class="status"><p id="pagination">paginationComplete: pending</p><p id="access">allVisibleEnvironmentsAccessible: pending</p><p id="scope">projectWideVisibility: pending</p><p id="connect">serviceConnectAllowed: pending</p></div><pre id="result">Pending</pre><script>
      const result = document.querySelector('#result');
      async function run(scenario) {
        document.querySelector('#scenario').textContent = scenario;
        history.replaceState(null, '', '?scenario=' + encodeURIComponent(scenario));
        document.querySelector('#refresh').disabled = false;
        const response = await fetch('/run?scenario=' + encodeURIComponent(scenario));
        const data = await response.json();
        document.querySelector('#pagination').textContent = 'paginationComplete: ' + (data.paginationComplete ?? 'unavailable');
        document.querySelector('#access').textContent = 'allVisibleEnvironmentsAccessible: ' + (data.allVisibleEnvironmentsAccessible ?? 'unavailable');
        document.querySelector('#scope').textContent = 'projectWideVisibility: ' + (data.projectWideVisibility ?? 'unproven');
        document.querySelector('#connect').textContent = 'serviceConnectAllowed: ' + (data.serviceConnectAllowed ?? false);
        result.textContent = JSON.stringify({...data, receipt: data.receipt ? { inventorySha256: data.receipt.inventorySha256, refusalReason: data.receipt.inventory.refusalReason, observedConstraints: data.receipt.inventory.observedConstraints } : undefined}, null, 2);
      }
      for (const button of document.querySelectorAll('[data-scenario]')) button.onclick = () => run(button.dataset.scenario);
      document.querySelector('#refresh').onclick = () => location.reload();
      const initial = new URLSearchParams(location.search).get('scenario');
      if (initial && ${JSON.stringify(scenarios)}.includes(initial)) run(initial);
    </script></html>`);
    } catch (error) {
      errors.push(`QA_SERVER_ASSERTION ${error.message}`);
      res.writeHead(500);
      res.end('QA_SERVER_ASSERTION');
    }
  });
  await fs.mkdir(path.join(out, 'screenshots'), { recursive: true });
  await fs.mkdir(path.join(out, 'video'), { recursive: true });
  await fs.mkdir(path.join(out, 'trace'), { recursive: true });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, recordVideo: { dir: path.join(out, 'video'), size: { width: 1440, height: 1080 } } });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const browserPage = await context.newPage();
  browserPage.on('console', (message) => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  browserPage.on('pageerror', (error) => errors.push(`page ${error.message}`));
  browserPage.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}`); });
  await browserPage.goto(`http://127.0.0.1:${server.address().port}`);
  const failureCodes = {
    'repeat-cursor': 'DEMO_TOPOLOGY_PAGINATION_STALLED',
    drift: 'DEMO_TOPOLOGY_INVENTORY_DRIFT',
    'private-error': 'DEMO_TOPOLOGY_ENVIRONMENTS_QUERY_REJECTED',
    'unsafe-metadata': 'DEMO_TOPOLOGY_INVALID_METADATA',
    'foreign-owner': 'DEMO_TOPOLOGY_OWNERSHIP_MISMATCH',
    'mutation-denied': 'DEMO_TOPOLOGY_READ_ONLY_OPERATION_REQUIRED',
  };
  for (const scenario of scenarios) {
    await browserPage.locator(`[data-scenario="${scenario}"]`).click();
    await expect(browserPage.locator('#scenario')).toHaveText(scenario);
    await expect(browserPage.locator('#result')).toBeVisible();
    const success = ['singleton', 'multipage', 'inaccessible'].includes(scenario);
    await expect(browserPage.locator('#result')).toContainText(`"status": "${success ? 'inspected' : 'rejected'}"`);
    const record = results.at(-1);
    assert.equal(record.scenario, scenario);
    if (success) {
      assert.equal(record.paginationComplete, true);
      assert.equal(record.projectWideVisibility, 'unproven');
      assert.equal(record.serviceConnectAllowed, false);
      await expect(browserPage.locator('#pagination')).toHaveText('paginationComplete: true');
      await expect(browserPage.locator('#scope')).toHaveText('projectWideVisibility: unproven');
      await expect(browserPage.locator('#connect')).toHaveText('serviceConnectAllowed: false');
      if (scenario === 'inaccessible') {
        assert.equal(record.allVisibleEnvironmentsAccessible, false);
        assert.equal(record.environments, 2);
        await expect(browserPage.locator('#access')).toHaveText('allVisibleEnvironmentsAccessible: false');
        await expect(browserPage.locator('#result')).toContainText('"paginationComplete": true');
        await expect(browserPage.locator('#result')).toContainText('"allVisibleEnvironmentsAccessible": false');
        assert.equal(observations.some((item) => item.scenario === scenario && item.environmentId === 'qa-visible-second'), false);
      } else {
        assert.equal(record.allVisibleEnvironmentsAccessible, true);
      }
    } else {
      assert.equal(record.code, failureCodes[scenario]);
      await expect(browserPage.locator('#result')).toContainText(record.code);
    }
    if (scenario === 'private-error') assert.equal(record.reads, 1);
    if (scenario === 'mutation-denied') assert.equal(record.reads, 0);
    if (scenario === 'multipage') {
      assert.equal(record.reads, 18);
      assert.equal(record.environments, 2);
      const requests = observations.filter((item) => item.scenario === scenario);
      assert.equal(requests.filter((item) => item.after === 'c-1').length, 4);
    }
    assert.doesNotMatch(await browserPage.locator('#result').innerText(), /SYNTHETIC_PROVIDER_PRIVATE|MUST_NOT_APPEAR|synthetic-local-fixture/);
    await browserPage.screenshot({ path: path.join(out, 'screenshots', `${scenario}.png`), fullPage: true });
  }
  // The actual accessibility result survives a browser reload and another fresh inspection.
  const beforeRefresh = results.length;
  await browserPage.goto(`http://127.0.0.1:${server.address().port}?scenario=inaccessible`);
  await expect(browserPage.locator('#scenario')).toHaveText('inaccessible');
  await expect(browserPage.locator('#pagination')).toHaveText('paginationComplete: true');
  await expect(browserPage.locator('#access')).toHaveText('allVisibleEnvironmentsAccessible: false');
  await expect(browserPage.locator('#scope')).toHaveText('projectWideVisibility: unproven');
  await expect(browserPage.locator('#connect')).toHaveText('serviceConnectAllowed: false');
  assert.equal(results.length, beforeRefresh + 1);
  assert.equal(results.at(-1).paginationComplete, true);
  assert.equal(results.at(-1).allVisibleEnvironmentsAccessible, false);
  await browserPage.locator('#refresh').click();
  await expect(browserPage.locator('#scenario')).toHaveText('inaccessible');
  await expect(browserPage.locator('#access')).toHaveText('allVisibleEnvironmentsAccessible: false');
  assert.equal(results.at(-1).paginationComplete, true);
  assert.equal(results.at(-1).allVisibleEnvironmentsAccessible, false);
  await browserPage.screenshot({ path: path.join(out, 'screenshots', 'result.png'), fullPage: true });
  assert.deepEqual(errors, []);
  await context.tracing.stop({ path: path.join(out, 'trace', 'trace.zip') });
  await fs.mkdir(path.join(out, 'playwright-report'), { recursive: true });
  await fs.writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ outcome: 'PASS', browserScenarios: scenarios.length, reloadAssertions: 1, actualLoopbackRequests: observations.length, unexpectedErrors: errors, results: results.map(({ receipt, ...record }) => record), observations }, null, 2));
  await fs.writeFile(path.join(out, 'playwright-report', 'index.html'), `<!doctype html><meta charset="utf-8"><title>Independent topology QA</title><h1>Independent topology QA: PASS</h1><p>9 browser scenarios plus reload assertion; actual production inspector/client with loopback-only synthetic fixture.</p><pre>${JSON.stringify(results.map(({ receipt, ...record }) => record), null, 2)}</pre>`);
  console.log(JSON.stringify({ outcome: 'PASS', browserScenarios: scenarios.length, reloadAssertions: 1, actualLoopbackRequests: observations.length, unexpectedErrors: errors.length }));
} finally {
  await context?.close();
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}

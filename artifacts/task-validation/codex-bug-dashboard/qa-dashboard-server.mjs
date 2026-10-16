// Explicitly enabled QA fixture adapter around the actual production dashboard server.
import { readFile, writeFile } from 'node:fs/promises';
import { createDashboardServer } from '../../../agent-team/src/bug-pipeline/dashboard-server.mjs';
import { dashboardSnapshot } from '../../../agent-team/src/bug-pipeline/dashboard.mjs';
if (process.env.CLINICOS_DASHBOARD_QA !== '1') throw new Error('Explicit QA flag required');
const file = '/tmp/clinicos-dashboard-qa-followup-fixture.json';
await writeFile(file, JSON.stringify({ state: { schemaVersion: 1, repository: 'l2v-hub/ClinicOS', batches: [] }, issues: [], queue: [], setup: { merged: false } }));
const server = createDashboardServer({
  refreshMs: 0, // Test-only upstream transitions; production uses15seconds.
  load: async () => {
    const value = JSON.parse(await readFile(file, 'utf8'));
    if (value.fail) throw new Error('Synthetic upstream denied; token-like fixture not for UI');
    return dashboardSnapshot({ repo: 'l2v-hub/ClinicOS', ...value });
  },
});
server.listen(4399, '127.0.0.1');

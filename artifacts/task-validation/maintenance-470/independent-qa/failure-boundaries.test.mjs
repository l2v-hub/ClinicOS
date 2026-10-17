import test from 'node:test';
import assert from 'node:assert/strict';
import { runInventory, TARGET } from '../../../../scripts/maintenance/demo-patient-inventory.mjs';

const ownId = '50000000-0000-4000-8000-000000000471';
const fixture = ({ existing = [], createdId = ownId, failUpsert = false, deletion = true } = {}) => {
  const mutations = [];
  const options = {
    env: { RAILWAY_TOKEN: 'synthetic-only-not-a-token', GITHUB_REF_NAME: 'codex/demo-470-completion', GITHUB_RUN_ID: '471' },
    call(args) {
      if (args[0] === 'variables') return { RAILWAY_PROJECT_ID: TARGET.projectId, RAILWAY_ENVIRONMENT_ID: TARGET.environmentId, RAILWAY_ENVIRONMENT_NAME: 'demo', RAILWAY_SERVICE_ID: TARGET.backendServiceId, RAILWAY_SERVICE_NAME: TARGET.backendServiceName, DATABASE_URL: 'postgresql://synthetic:local-only@postgres.railway.internal/railway' };
      if (args[0] === 'service') { assert.deepEqual(args.slice(2), ['--environment', TARGET.environmentId, '--project', TARGET.projectId, '--json']); return existing; }
      throw new Error('Unexpected CLI call');
    },
    async api(query, variables) {
      if (query.startsWith('query')) return { serviceInstance: { domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] } } };
      mutations.push({ query, variables });
      if (query.includes('serviceCreate')) return { serviceCreate: { id: createdId, name: 'clinicos-demo-readonly-471' } };
      if (query.includes('variableCollectionUpsert')) { if (failUpsert) throw new Error('synthetic variable failure'); return {}; }
      if (query.includes('serviceDelete')) { assert.deepEqual(variables, { id: ownId, environmentId: TARGET.environmentId }); return { serviceDelete: deletion }; }
      throw new Error('Unexpected mutation');
    },
    async deploy() { throw new Error('synthetic deployment failure'); },
    wait: async () => {},
    maxPolls: 0,
  };
  return { options, mutations };
};

test('variable configuration failure still cleans up only the verified new service', async () => {
  const f = fixture({ failUpsert: true });
  await assert.rejects(runInventory(f.options), /synthetic variable failure/);
  assert.equal(f.mutations.filter(m => m.query.includes('serviceDelete')).length, 1);
});
test('a colliding service name is never claimed, mutated or removed', async () => {
  const f = fixture({ existing: [{ id: ownId, name: 'clinicos-demo-readonly-471' }] });
  await assert.rejects(runInventory(f.options), /TEMPORARY_SERVICE_ALREADY_EXISTS/);
  assert.deepEqual(f.mutations, []);
});
test('a returned backend or previously existing ID is never removed', async () => {
  for (const [createdId, existing] of [[TARGET.backendServiceId, []], [ownId, [{ id: ownId, name: 'other-existing-service' }]]]) {
    const f = fixture({ createdId, existing });
    await assert.rejects(runInventory(f.options), /NEW_SERVICE_IDENTITY_UNVERIFIED/);
    assert.equal(f.mutations.filter(m => m.query.includes('serviceDelete')).length, 0);
    assert.equal(f.mutations.filter(m => m.query.includes('variableCollectionUpsert')).length, 0);
  }
});
test('cleanup demands literal affirmative true, rejecting false, null, number or string', async () => {
  for (const deletion of [false, null, 1, 'true', undefined]) {
    const f = fixture({ deletion });
    if (deletion === undefined) {
      const original = f.options.api;
      f.options.api = async (query, variables) => query.includes('serviceDelete') ? { serviceDelete: undefined } : original(query, variables);
    }
    await assert.rejects(runInventory(f.options), /TEMPORARY_SERVICE_CLEANUP_REJECTED/);
  }
});

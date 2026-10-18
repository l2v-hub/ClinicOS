import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  TARGET,
  INVENTORY_QUERY,
  ConfigurationError,
  createClient,
} from './configure-demo-source.mjs';
import {
  ENVIRONMENTS_QUERY,
  SERVICES_QUERY,
  INSTANCES_QUERY,
  TRIGGERS_QUERY,
  inspectTopology,
  serializeTopologyReceipt,
} from './inspect-demo-source-topology.mjs';

const ids = {
  environment: TARGET.environmentId,
  extraEnvironment: 'env-extra',
  forkEnvironment: 'env-fork',
  inaccessibleEnvironment: 'env-inaccessible',
  service: TARGET.serviceId,
  trigger: 'trigger-demo',
};
const context = {
  repository: TARGET.repository,
  reviewedSha: 'a'.repeat(40),
  runId: '123456',
  runAttempt: '1',
};
const clone = (value) => structuredClone(value);
const rejectCode = (code) => (error) => {
  assert.ok(error instanceof ConfigurationError, String(error));
  assert.equal(error.code, code);
  assert.equal(error.message, code);
  return true;
};

function fixture({ extraEnvironments = [], extraServices = [], inaccessible = false } = {}) {
  const environments = [
    {
      id: ids.environment,
      projectId: TARGET.projectId,
      name: 'demo',
      canAccess: true,
      isEphemeral: false,
      sourceEnvironment: null,
    },
    ...extraEnvironments,
  ];
  if (inaccessible) {
    environments.push({
      id: ids.inaccessibleEnvironment,
      projectId: TARGET.projectId,
      name: 'locked',
      canAccess: false,
      isEphemeral: false,
      sourceEnvironment: null,
    });
  }
  const services = [
    { id: ids.service, name: 'clinicos-backend', projectId: TARGET.projectId },
    ...extraServices,
  ];
  const scopedInventory = {
    projectToken: {
      project: { id: TARGET.projectId },
      environment: { id: TARGET.environmentId, name: 'demo' },
    },
    serviceInstance: {
      serviceId: TARGET.serviceId,
      environmentId: TARGET.environmentId,
      rootDirectory: '/',
      source: { repo: TARGET.repository },
      domains: { serviceDomains: [{ domain: TARGET.domain }], customDomains: [] },
    },
    deploymentTriggers: { pageInfo: { hasNextPage: false }, edges: [] },
  };
  return { environments, services, scopedInventory };
}

function connection(values, after, pageSize = 50, malformedPageInfo = false) {
  const start = after === null ? 0 : Number(after);
  const page = values.slice(start, start + pageSize);
  const more = start + page.length < values.length;
  return {
    edges: page.map((node) => ({ node: clone(node) })),
    pageInfo: malformedPageInfo
      ? { hasNextPage: 'maybe', endCursor: more ? String(start + page.length) : null }
      : { hasNextPage: more, endCursor: more ? String(start + page.length) : null },
  };
}

function responsesFor(data, { cursorMode = 'normal' } = {}) {
  return async (query, variables) => {
    const after = variables.after ?? null;
    if (query === ENVIRONMENTS_QUERY) {
      const result = connection(data.environments, after);
      if (cursorMode === 'repeat' && result.pageInfo.hasNextPage)
        result.pageInfo.endCursor = 'repeat';
      return { project: { id: TARGET.projectId, environments: result } };
    }
    if (query === SERVICES_QUERY) {
      const result = connection(data.services, after);
      if (cursorMode === 'repeat' && result.pageInfo.hasNextPage)
        result.pageInfo.endCursor = 'repeat';
      return { project: { id: TARGET.projectId, services: result } };
    }
    if (query === INSTANCES_QUERY) {
      const environment = data.environments.find(({ id }) => id === variables.environmentId);
      const targetEnvironment = variables.environmentId === TARGET.environmentId;
      const serviceId = TARGET.serviceId;
      return {
        environment: {
          id: variables.environmentId,
          projectId: TARGET.projectId,
          serviceInstances: connection(
            [
              {
                id: `instance-${variables.environmentId}`,
                environmentId: variables.environmentId,
                serviceId,
                rootDirectory: targetEnvironment ? '/' : null,
                source: targetEnvironment ? { repo: TARGET.repository } : null,
              },
            ],
            after,
          ),
        },
      };
    }
    if (query === TRIGGERS_QUERY) {
      const matching =
        variables.environmentId === TARGET.environmentId
          ? data.scopedInventory.deploymentTriggers.edges
          : [];
      return {
        environment: {
          id: variables.environmentId,
          projectId: TARGET.projectId,
          deploymentTriggers: connection(
            matching.map(({ node }) => node),
            after,
          ),
        },
      };
    }
    if (query === INVENTORY_QUERY) return clone(data.scopedInventory);
    throw new Error('UNEXPECTED_QUERY');
  };
}

async function inspect(data = fixture(), options = {}) {
  const queries = [];
  const freshnessChecks = [];
  const client = responsesFor(data, options);
  const result = await inspectTopology({
    client: async (query, variables) => {
      queries.push({ query, variables: clone(variables) });
      return client(query, variables);
    },
    assertFreshContext: async () => freshnessChecks.push(true),
  });
  return { result, queries, freshnessChecks };
}

test('reads fixed full inventory twice and checks trusted context three times', async () => {
  const { result, queries, freshnessChecks } = await inspect();
  assert.equal(result.operation, 'inspect');
  assert.equal(result.outcome, 'inspected-visibility-unproven');
  assert.equal(result.inventory.projectId, TARGET.projectId);
  assert.equal(result.inventory.scopedInventory.repository, TARGET.repository);
  assert.equal(result.inventory.scopedInventory.domains[0].domain, TARGET.domain);
  assert.equal(result.inventory.paginationComplete, true);
  assert.equal(result.inventory.allVisibleEnvironmentsAccessible, true);
  assert.equal('visiblePaginationComplete' in result.inventory, false);
  assert.equal(result.inventory.projectWideVisibility, 'unproven');
  assert.equal(result.inventory.serviceConnectAllowed, false);
  assert.equal(result.inventory.refusalReason, 'PROJECT_WIDE_VISIBILITY_UNPROVEN');
  assert.equal(freshnessChecks.length, 3);
  assert.deepEqual(
    queries.map(({ query }) => query),
    [
      ENVIRONMENTS_QUERY,
      SERVICES_QUERY,
      INSTANCES_QUERY,
      TRIGGERS_QUERY,
      INVENTORY_QUERY,
      ENVIRONMENTS_QUERY,
      SERVICES_QUERY,
      INSTANCES_QUERY,
      TRIGGERS_QUERY,
      INVENTORY_QUERY,
    ],
  );
  assert.ok(queries.every(({ variables }) => variables.projectId === TARGET.projectId));
  assert.ok(
    queries
      .filter(({ query }) => query === INVENTORY_QUERY)
      .every(
        ({ variables }) =>
          variables.environmentId === TARGET.environmentId &&
          variables.serviceId === TARGET.serviceId,
      ),
  );
});

test('follows service and environment pages using the returned opaque cursor', async () => {
  const data = fixture({
    extraServices: Array.from({ length: 50 }, (_, i) => ({
      id: `service-${String(i).padStart(2, '0')}`,
      name: `service ${i}`,
      projectId: TARGET.projectId,
    })),
  });
  const calls = [];
  const client = async (query, variables) => {
    calls.push({ query, variables: clone(variables) });
    if (query === SERVICES_QUERY)
      return {
        project: {
          id: TARGET.projectId,
          services: connection(data.services, variables.after ?? null),
        },
      };
    return responsesFor(data)(query, variables);
  };
  await inspectTopology({ client, assertFreshContext: async () => {} });
  const servicePages = calls.filter(({ query }) => query === SERVICES_QUERY);
  assert.equal(servicePages.length, 4);
  assert.equal(servicePages[0].variables.after, null);
  assert.equal(servicePages[1].variables.after, '50');
  assert.equal(servicePages[2].variables.after, null);
  assert.equal(servicePages[3].variables.after, '50');
});

test('singleton demo and additional, forked, or inaccessible environments never permit service connect', async () => {
  for (const data of [
    fixture(),
    fixture({
      extraEnvironments: [
        {
          id: ids.extraEnvironment,
          projectId: TARGET.projectId,
          name: 'preview',
          canAccess: true,
          isEphemeral: true,
          sourceEnvironment: null,
        },
      ],
    }),
    fixture({
      extraEnvironments: [
        {
          id: ids.forkEnvironment,
          projectId: TARGET.projectId,
          name: 'fork',
          canAccess: true,
          isEphemeral: false,
          sourceEnvironment: { id: TARGET.environmentId, projectId: TARGET.projectId },
        },
      ],
    }),
    fixture({ inaccessible: true }),
  ]) {
    const { result } = await inspect(data);
    assert.equal(result.inventory.projectWideVisibility, 'unproven');
    assert.equal(result.inventory.serviceConnectAllowed, false);
    assert.equal(result.inventory.refusalReason, 'PROJECT_WIDE_VISIBILITY_UNPROVEN');
    assert.equal(result.inventory.paginationComplete, true);
    assert.equal(
      result.inventory.allVisibleEnvironmentsAccessible,
      data.environments.every(({ canAccess }) => canAccess),
    );
  }
});

for (const [name, mutate, code] of [
  [
    'foreign environment project',
    (data) => {
      data.environments[1].projectId = 'foreign';
    },
    'DEMO_TOPOLOGY_OWNERSHIP_MISMATCH',
  ],
  [
    'foreign environment source parent',
    (data) => {
      data.environments[1].sourceEnvironment = { id: TARGET.environmentId, projectId: 'foreign' };
    },
    'DEMO_TOPOLOGY_OWNERSHIP_MISMATCH',
  ],
  [
    'foreign service project',
    (data) => {
      data.services[1].projectId = 'foreign';
    },
    'DEMO_TOPOLOGY_OWNERSHIP_MISMATCH',
  ],
  [
    'foreign instance service',
    (data) => {
      data.instanceServiceId = 'foreign';
    },
    'DEMO_TOPOLOGY_FOREIGN_SERVICE',
  ],
  [
    'unknown malformed environment metadata',
    (data) => {
      data.environments[0].name = 'demo\n';
    },
    'DEMO_TOPOLOGY_INVALID_METADATA',
  ],
  [
    'unknown unsafe trigger metadata',
    (data) => {
      data.scopedInventory.variables = { token: 'private' };
    },
    undefined,
  ],
]) {
  test(`rejects ${name} without exposing provider data`, async () => {
    const data = fixture({
      extraEnvironments: [
        {
          id: ids.extraEnvironment,
          projectId: TARGET.projectId,
          name: 'preview',
          canAccess: true,
          isEphemeral: true,
          sourceEnvironment: null,
        },
      ],
      extraServices: [{ id: 'service-extra', name: 'extra', projectId: TARGET.projectId }],
    });
    if (name === 'foreign instance service') {
      const client = responsesFor(data);
      await assert.rejects(
        inspectTopology({
          client: async (query, variables) => {
            const response = await client(query, variables);
            if (query === INSTANCES_QUERY && variables.environmentId === TARGET.environmentId)
              response.environment.serviceInstances.edges[0].node.serviceId = 'unknown-service';
            return response;
          },
          assertFreshContext: async () => {},
        }),
        rejectCode(code),
      );
      return;
    }
    mutate(data);
    if (code) {
      await assert.rejects(
        inspectTopology({ client: responsesFor(data), assertFreshContext: async () => {} }),
        rejectCode(code),
      );
    } else {
      const { result } = await inspect(data);
      assert.doesNotMatch(JSON.stringify(result), /variables|private/);
    }
  });
}

test('rejects malformed connection pages, repeated cursors, and duplicate entities', async () => {
  const data = fixture({
    extraServices: Array.from({ length: 50 }, (_, i) => ({
      id: `service-${i}`,
      name: `service ${i}`,
      projectId: TARGET.projectId,
    })),
  });
  const client = responsesFor(data);
  await assert.rejects(
    inspectTopology({
      client: async (query, variables) => {
        const response = await client(query, variables);
        if (query === SERVICES_QUERY) {
          const page = response.project.services;
          if ((variables.after ?? null) === null && data.services.length > 50)
            page.pageInfo.endCursor = 'fixed-cursor';
          else if (variables.after === 'fixed-cursor') {
            page.pageInfo = { hasNextPage: true, endCursor: 'fixed-cursor' };
          }
        }
        return response;
      },
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_PAGINATION_STALLED'),
  );

  const malformed = responsesFor(fixture());
  await assert.rejects(
    inspectTopology({
      client: async (query, variables) => {
        const response = await malformed(query, variables);
        if (query === ENVIRONMENTS_QUERY)
          response.project.environments.pageInfo.hasNextPage = 'yes';
        return response;
      },
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_INCOMPLETE_INVENTORY'),
  );

  const missing = responsesFor(fixture());
  await assert.rejects(
    inspectTopology({
      client: async (query, variables) => {
        const response = await missing(query, variables);
        if (query === ENVIRONMENTS_QUERY) delete response.project.environments;
        return response;
      },
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_INCOMPLETE_INVENTORY'),
  );

  const duplicate = fixture({
    extraServices: [{ id: 'duplicate', name: 'same', projectId: TARGET.projectId }],
  });
  const duplicateClient = responsesFor(duplicate);
  await assert.rejects(
    inspectTopology({
      client: async (query, variables) => {
        const response = await duplicateClient(query, variables);
        if (query === SERVICES_QUERY)
          response.project.services.edges.push(clone(response.project.services.edges[0]));
        return response;
      },
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_DUPLICATE_ENTITY'),
  );
});

test('rejects source or trigger disagreement with the exact scoped legacy inventory', async () => {
  const data = fixture();
  const client = responsesFor(data);
  await assert.rejects(
    inspectTopology({
      client: async (query, variables) => {
        const response = await client(query, variables);
        if (query === INSTANCES_QUERY)
          response.environment.serviceInstances.edges[0].node.source.repo = 'elsewhere/other';
        return response;
      },
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_TARGET_SOURCE_MISMATCH'),
  );
});

test('accepts matching nonempty scoped and topology triggers independent of provider ordering', async () => {
  const data = fixture();
  const trigger = {
    id: ids.trigger,
    provider: 'github',
    projectId: TARGET.projectId,
    environmentId: TARGET.environmentId,
    serviceId: TARGET.serviceId,
    repository: TARGET.repository,
    branch: 'main',
    checkSuites: true,
    baseEnvironmentOverrideId: null,
  };
  data.scopedInventory.deploymentTriggers.edges = [{ node: trigger }];
  const { result } = await inspect(data);
  assert.deepEqual(result.inventory.environments[0].triggers, [
    {
      id: ids.trigger,
      projectId: TARGET.projectId,
      environmentId: TARGET.environmentId,
      serviceId: TARGET.serviceId,
      repository: TARGET.repository,
      provider: 'github',
      branch: 'main',
      checkSuites: true,
      baseEnvironmentOverrideId: null,
    },
  ]);
});

test('enforces per-page and total inventory bounds', async () => {
  const tooManyEnvironments = fixture({
    extraEnvironments: Array.from({ length: 32 }, (_, i) => ({
      id: `env-${i}`,
      projectId: TARGET.projectId,
      name: `env ${i}`,
      canAccess: false,
      isEphemeral: true,
      sourceEnvironment: null,
    })),
  });
  await assert.rejects(
    inspectTopology({
      client: responsesFor(tooManyEnvironments),
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_INVENTORY_LIMIT'),
  );

  const tooManyServices = fixture({
    extraServices: Array.from({ length: 100 }, (_, i) => ({
      id: `service-${i}`,
      name: `service ${i}`,
      projectId: TARGET.projectId,
    })),
  });
  await assert.rejects(
    inspectTopology({
      client: responsesFor(tooManyServices),
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_INVENTORY_LIMIT'),
  );

  const ordinary = responsesFor(fixture());
  await assert.rejects(
    inspectTopology({
      client: async (query, variables) => {
        const response = await ordinary(query, variables);
        if (query === ENVIRONMENTS_QUERY) {
          response.project.environments.edges = Array.from({ length: 51 }, (_, i) => ({
            node: {
              id: `env-${i}`,
              projectId: TARGET.projectId,
              name: `env ${i}`,
              canAccess: false,
              isEphemeral: true,
              sourceEnvironment: null,
            },
          }));
        }
        return response;
      },
      assertFreshContext: async () => {},
    }),
    rejectCode('DEMO_TOPOLOGY_INCOMPLETE_INVENTORY'),
  );
});

test('detects drift between complete snapshots and stale trusted context', async () => {
  const data = fixture();
  let scopedReads = 0;
  let instanceReads = 0;
  const client = async (query, variables) => {
    if (query === INVENTORY_QUERY && ++scopedReads === 2) {
      const changed = clone(data.scopedInventory);
      changed.serviceInstance.rootDirectory = '/backend';
      return changed;
    }
    const response = await responsesFor(data)(query, variables);
    if (query === INSTANCES_QUERY && ++instanceReads === 2)
      response.environment.serviceInstances.edges[0].node.rootDirectory = '/backend';
    return response;
  };
  await assert.rejects(
    inspectTopology({ client, assertFreshContext: async () => {} }),
    rejectCode('DEMO_TOPOLOGY_INVENTORY_DRIFT'),
  );

  let checks = 0;
  await assert.rejects(
    inspectTopology({
      client: responsesFor(data),
      assertFreshContext: async () => {
        if (++checks === 2) throw new ConfigurationError('STALE_CONTEXT');
      },
    }),
    (error) => error.code === 'STALE_CONTEXT',
  );
});

test('mutation-like operation is rejected before invoking the client', async () => {
  for (const operation of ['connect', 'serviceConnect', 'create', 'deploy', 'inspect\n']) {
    let calls = 0;
    await assert.rejects(
      inspectTopology({
        operation,
        client: async () => {
          calls++;
        },
        assertFreshContext: async () => {},
      }),
      rejectCode('DEMO_TOPOLOGY_READ_ONLY_OPERATION_REQUIRED'),
    );
    assert.equal(calls, 0);
  }
});

test('transport failures are sanitized and never retried', async () => {
  let calls = 0;
  const server = createServer((request, response) => {
    calls++;
    response.writeHead(503, { 'Content-Type': 'application/json' });
    response.end('PRIVATE_PROVIDER_ERROR ghp_secret');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    const client = createClient({
      token: 'synthetic-project-token',
      fetchImpl: async (_endpoint, options) => {
        const response = await fetch(`http://127.0.0.1:${address.port}/graphql`, options);
        return new Response(response.body, { status: response.status, headers: response.headers });
      },
    });
    await assert.rejects(
      inspectTopology({
        client,
        assertFreshContext: async () => {},
      }),
      (error) => {
        assert.ok(error instanceof ConfigurationError);
        assert.match(error.code, /ENVIRONMENTS_(QUERY_REJECTED|REQUEST_FAILED)/);
        assert.doesNotMatch(error.message, /PRIVATE_PROVIDER_ERROR|ghp_secret/);
        return true;
      },
    );
    assert.equal(calls, 1);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('receipt serializes an actual inspection result, redacts forbidden values, and excludes unknown provider fields', async () => {
  const data = fixture();
  data.scopedInventory.variables = { PRIVATE: 'DO_NOT_ECHO' };
  data.scopedInventory.serviceInstance.privateKey = 'DO_NOT_ECHO';
  const { result } = await inspect(data);
  const json = serializeTopologyReceipt(context, result, {
    forbiddenValues: ['synthetic-secret', 'DO_NOT_ECHO'],
  });
  assert.doesNotMatch(json, /DO_NOT_ECHO|privateKey|variables/);
  const receipt = JSON.parse(json);
  assert.equal(receipt.operation, 'inspect');
  assert.equal(receipt.inventorySha256, result.inventorySha256);
  assert.equal(receipt.serviceConnectAllowed, undefined);
  assert.equal(receipt.inventory.serviceConnectAllowed, false);
  assert.equal(receipt.repository, TARGET.repository);
});

test('receipt rejects altered or fabricated inspection results', async () => {
  const { result } = await inspect();
  assert.throws(
    () => serializeTopologyReceipt(context, { ...result, inventorySha256: '0'.repeat(64) }),
    rejectCode('DEMO_TOPOLOGY_INVALID_RECEIPT'),
  );
  const fabricated = clone(result);
  assert.throws(
    () => serializeTopologyReceipt(context, fabricated),
    rejectCode('DEMO_TOPOLOGY_INVALID_RECEIPT'),
  );
  assert.throws(
    () => serializeTopologyReceipt({ ...context, reviewedSha: 'bad' }, result),
    rejectCode('DEMO_SOURCE_TRUSTED_MAIN_REQUIRED'),
  );
});

test('createClient sends real HTTP requests to a local fixture with no mutation or retry', async (t) => {
  const data = fixture();
  const state = { requestCount: 0, observed: [] };
  const server = createServer(async (request, response) => {
    state.requestCount++;
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const { query, variables } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    state.observed.push({
      method: request.method,
      query,
      variables,
      token: request.headers['project-access-token'],
    });
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: await responsesFor(data)(query, variables) }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = server.address();
  const client = createClient({
    token: 'synthetic-project-token',
    fetchImpl: async (_endpoint, options) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/graphql`, options);
      return new Response(response.body, { status: response.status, headers: response.headers });
    },
  });
  const inspected = await inspectTopology({ client, assertFreshContext: async () => {} });
  assert.equal(state.requestCount, inspected.readRequests);
  assert.equal(state.requestCount, 10);
  assert.ok(
    state.observed.every(
      ({ method, token }) => method === 'POST' && token === 'synthetic-project-token',
    ),
  );
  assert.ok(state.observed.every(({ query }) => !/mutation|serviceConnect/i.test(query)));
});

test('workflow is exact-main, inspect-only, credential-scoped, and independently serialized', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/inspect-demo-source-topology.yml', import.meta.url),
    'utf8',
  );
  const deployWorkflow = await readFile(
    new URL('../../.github/workflows/deploy-backend.yml', import.meta.url),
    'utf8',
  );
  const concurrencyGroup = (yaml) => yaml.match(/^  group: ([A-Za-z0-9-]+)$/m)?.[1];
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /inputs\.reviewed_sha == github\.sha/);
  assert.match(workflow, /github\.repository == 'l2v-hub\/ClinicOS'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.equal(concurrencyGroup(workflow), 'demo-source-topology');
  assert.equal(concurrencyGroup(deployWorkflow), 'railway-backend');
  assert.notEqual(concurrencyGroup(workflow), concurrencyGroup(deployWorkflow));
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /DEMO_TOPOLOGY_OPERATION: inspect/);
  assert.match(workflow, /RAILWAY_TOKEN: \$\{\{ secrets\.RAILWAY_DEMO_TOKEN \}\}/);
  assert.equal((workflow.match(/secrets\./g) ?? []).length, 1);
  assert.match(workflow, /persist-credentials: false/);
});

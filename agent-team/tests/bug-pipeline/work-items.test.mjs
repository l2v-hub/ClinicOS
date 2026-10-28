import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkItemsEnvelope,
  validateWorkItems,
  validateAdaptivePlanning,
  adaptivePlanningSchema,
  readyFrontier,
  runWorkItems,
} from '../../src/bug-pipeline/work-items.mjs';
import { planSchema } from '../../src/bug-pipeline/contracts.mjs';

const hash = 'a'.repeat(40);
function fixture(deps = { a: [], b: [], c: ['a'] }) {
  const names = Object.keys(deps);
  const plan = {
    title: 'Precise ticket fix',
    feature: 'Synthetic fixture',
    rationale: 'Independent exact-file edits',
    analysis: 'Ticket source and affected code inspected',
    execution: { difficulty: 'low', mode: 'delegate', reason: 'Bounded isolated tasks' },
    issues: [17],
    scope: names.map((n) => `${n}.txt`),
    fileMap: [{ issue: 17, files: names.map((n) => `${n}.txt`) }],
    separationReason: '',
    acceptance: [{ issue: 17, criteria: names.map((n) => `Change ${n}`) }],
    tasks: names.map((n) => ({
      title: `Change ${n}`,
      files: [`${n}.txt`],
      steps: ['Apply precise criterion'],
    })),
    verification: [
      { command: 'node', args: ['--test', 'fixture.test.mjs'] },
      { command: 'npm', args: ['--prefix', 'frontend', 'run', 'build'] },
    ],
    evidence: [
      {
        issue: 17,
        screenshot: 'artifacts/task-validation/bug-batch-17/evidence/17.png',
        trace: 'artifacts/task-validation/bug-batch-17/evidence/17.zip',
        video: '',
      },
    ],
  };
  const graph = {
    issues: [17],
    nodes: names.map((id, i) => ({
      id,
      title: `Change ${id}`,
      issues: [17],
      taskIndexes: [i],
      criteriaRefs: [{ issue: 17, index: i }],
      dependsOn: deps[id],
      scope: [`${id}.txt`],
      readFiles: [],
      difficulty: 'low',
      risk: { level: 'low', reason: 'Synthetic bounded edit' },
      coupling: { level: 'isolated', reason: 'Different files' },
      conflictKeys: [],
      routePreference: 'auto',
      verificationIndexes: [0],
      summary: `Apply criterion ${i}`,
    })),
  };
  const issues = [{ number: 17, title: 'Precise ticket', body: 'Authorized task', comments: [] }];
  const batch = {
    id: 'bug-batch-17',
    branch: 'codex/bug-batch-17',
    plan,
    implementation: [{ round: 1, status: 'running' }],
  };
  batch.workItems = createWorkItemsEnvelope(graph, { plan, issues });
  return { batch, graph, plan, issues };
}
const profile = {
  id: 'senior',
  provider: 'codex',
  model: 'configured-senior',
  tier: 'senior',
  ready: true,
  limit: 2,
  availability: 'cli-preflight-not-inference-verified',
};
const context = { phase: 'implementation', round: 1, implementationRound: 1 };
function harness(batch, { failSave = 0, own = () => true } = {}) {
  const events = [];
  let head = hash,
    count = 0,
    saves = 0,
    durable = structuredClone(batch),
    tail = Promise.resolve(),
    poisoned;
  const effects = {
    getBatch: () => batch,
    assertOwnership: async () => {
      if (!own()) throw new Error('ownership changed');
    },
    mutate(fn) {
      const next = tail.then(async () => {
        if (poisoned) throw poisoned;
        await effects.assertOwnership();
        await fn(batch);
        if (++saves === failSave) throw new Error('uncertain CAS save');
        durable = structuredClone(batch);
      });
      tail = next.catch((error) => {
        poisoned ??= error;
      });
      return next;
    },
  };
  const workspace = {
    integrationHead: async () => head,
    coordinates: (b, item, r) => ({
      cwd: `/owned/${item.id}-${r.nonce}`,
      packet: 'artifacts/task-validation/bug-batch-17',
      branch: `codex/${item.id}-${r.nonce}`,
    }),
    prepareChild: async ({ item }) => {
      events.push(`prepare:${item.id}`);
      return { checkpoint: { packetHashes: {} } };
    },
    captureChildCheckpoint: async () => ({ head: hash, output: {} }),
    checkpointChild: async ({ item }) => {
      events.push(`commit:${item.id}`);
      return { sha: (++count).toString(16).padStart(40, '0'), manifest: { id: item.id } };
    },
    integrateChild: async ({ item, childSha, beforeSha }) => {
      assert.equal(beforeSha, head);
      head = childSha;
      events.push(`integrate:${item.id}`);
      return { sha: head };
    },
    inspectIntegration: async ({ item }) => events.push(`inspect:${item.id}`),
  };
  return { effects, workspace, events, durable: () => durable };
}
const defer = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

test('separate adaptive planning schema preserves closed legacy schema and validates real packet production', () => {
  const f = fixture();
  assert.equal(adaptivePlanningSchema.properties.plan, planSchema);
  assert.equal(planSchema.additionalProperties, false);
  assert.equal(planSchema.properties.groups.items.properties.workItems, undefined);
  assert.equal(
    validateAdaptivePlanning(
      { plan: { groups: [f.plan], blocked: [] }, workGraphs: [f.graph] },
      f.issues,
    ).workGraphs[0],
    f.graph,
  );
  assert.equal(validateWorkItems(f.batch), f.batch.workItems);
  assert.equal(validateWorkItems({}), null);
});

test('explicit source issue blockers cannot disappear or become unauthorized completed work', () => {
  const f = fixture();
  f.issues[0].body = '**Blocked by:** #99';
  assert.throws(
    () =>
      validateAdaptivePlanning(
        { plan: { groups: [f.plan], blocked: [] }, workGraphs: [f.graph] },
        f.issues,
      ),
    /blocker must be authorized/,
  );
});

test('packet validation rejects cycles, missing coverage, scope widening, unsafe context and altered frozen state', () => {
  for (const change of [
    (f) => {
      f.graph.nodes[0].dependsOn = ['c'];
    },
    (f) => {
      f.graph.nodes[0].dependsOn = ['missing'];
    },
    (f) => {
      f.graph.nodes[1].taskIndexes = [0];
    },
    (f) => {
      f.graph.nodes[0].scope = ['outside.txt'];
    },
    (f) => {
      f.graph.nodes[0].criteriaRefs = [{ issue: 18, index: 0 }];
    },
    (f) => {
      f.graph.nodes[0].readFiles = ['../escape'];
    },
    (f) => {
      f.graph.nodes[0].scope = ['.github/workflows/pwn.yml'];
    },
    (f) => {
      f.graph.nodes[0].risk.reason = '';
    },
    (f) => {
      f.graph.nodes.push(structuredClone(f.graph.nodes[0]));
    },
  ]) {
    const f = fixture();
    change(f);
    assert.throws(() => createWorkItemsEnvelope(f.graph, { plan: f.plan, issues: f.issues }));
  }
  const f = fixture();
  f.batch.workItems.policy.sessionLimit = 100;
  assert.throws(() => validateWorkItems(f.batch), /finite policy/);
  const other = fixture();
  other.batch.plan.title = 'Changed frozen plan';
  assert.throws(() => validateWorkItems(other.batch), /digest changed/);
});

test('shared writes need ordering and resource conflicts remove a frontier candidate', () => {
  const f = fixture({ a: [], b: [] });
  f.graph.nodes[1].scope.push('a.txt');
  assert.throws(
    () => createWorkItemsEnvelope(f.graph, { plan: f.plan, issues: f.issues }),
    /shared writes/,
  );
  f.graph.nodes[1].dependsOn = ['a'];
  assert.doesNotThrow(() => createWorkItemsEnvelope(f.graph, { plan: f.plan, issues: f.issues }));
  const g = fixture({ a: [], b: [] });
  g.graph.nodes.forEach((n) => n.conflictKeys.push('database:fixture'));
  assert.deepEqual(
    readyFrontier(g.graph, { nodes: [{ id: 'a', status: 'running' }] }, [g.graph.nodes[0]]),
    [],
  );
});

test('actual incremental frontier starts C after A integrates while independent B still runs', async () => {
  const f = fixture();
  const h = harness(f.batch);
  const bStarted = defer(),
    bRelease = defer(),
    cStarted = defer();
  const calls = [];
  const models = {
    executionPool: async () => [profile],
    executeWorkItem: async ({ item, reservation }) => {
      calls.push(item.id);
      h.events.push(`model:${item.id}`);
      assert.equal(
        h.durable().workItems.runs[0].nodes.find((n) => n.id === item.id).status,
        'running',
      );
      assert.equal(reservation.provider, 'codex');
      if (item.id === 'a') await bStarted.promise;
      if (item.id === 'b') {
        bStarted.resolve();
        await bRelease.promise;
      }
      if (item.id === 'c') {
        cStarted.resolve();
        bRelease.resolve();
      }
      return { status: 'implemented', summary: `Changed ${item.id}` };
    },
  };
  const result = await runWorkItems({
    batch: f.batch,
    workspace: h.workspace,
    effects: h.effects,
    models,
    context,
  });
  assert.equal(result.status, 'implemented');
  assert.deepEqual(calls, ['a', 'b', 'c']);
  assert(h.events.indexOf('integrate:a') < h.events.indexOf('model:c'));
  assert(h.events.indexOf('model:c') < h.events.indexOf('integrate:b'));
  assert.equal(f.batch.workItems.runs[0].nodes.length, 3);
  assert.equal(f.batch.workItems.runs[0].status, 'completed');
  assert.equal(
    (
      await runWorkItems({
        batch: f.batch,
        workspace: h.workspace,
        effects: h.effects,
        models,
        context,
      })
    ).status,
    'implemented',
  );
  assert.equal(calls.length, 3, 'durable completion inspection never replays a model');
});

test('declared resource conflict serializes independent packets', async () => {
  const f = fixture({ a: [], b: [] });
  f.graph.nodes.forEach((n) => n.conflictKeys.push('db:one'));
  f.batch.workItems = createWorkItemsEnvelope(f.graph, { plan: f.plan, issues: f.issues });
  const h = harness(f.batch);
  let active = 0;
  await runWorkItems({
    batch: f.batch,
    workspace: h.workspace,
    effects: h.effects,
    context,
    models: {
      executionPool: async () => [profile],
      executeWorkItem: async () => {
        assert.equal(++active, 1);
        await Promise.resolve();
        active--;
        return { status: 'implemented', summary: 'Applied bounded work' };
      },
    },
  });
  assert.deepEqual(
    h.events.filter((e) => e.startsWith('model:')),
    [],
  );
  assert(h.events.indexOf('integrate:a') < h.events.indexOf('prepare:b'));
});

test('definite blocked result closes graph without hidden retry or parent counter reset', async () => {
  const f = fixture({ a: [] });
  const h = harness(f.batch);
  let calls = 0;
  const models = {
    executionPool: async () => [profile],
    executeWorkItem: async () => {
      calls++;
      return { status: 'blocked', summary: 'Missing precise information' };
    },
  };
  assert.equal(
    (
      await runWorkItems({
        batch: f.batch,
        workspace: h.workspace,
        effects: h.effects,
        context,
        models,
      })
    ).status,
    'blocked',
  );
  assert.equal(calls, 1);
  assert.equal(f.batch.implementation.length, 1);
  await assert.rejects(
    () =>
      runWorkItems({ batch: f.batch, workspace: h.workspace, effects: h.effects, context, models }),
    /no model replay/,
  );
  assert.equal(calls, 1);
});

test('unknown inference, invalid output and save uncertainty preserve tombstones and never replay', async () => {
  for (const kind of ['timeout', 'invalid', 'save']) {
    const f = fixture({ a: [] });
    const h = harness(f.batch, { failSave: kind === 'save' ? 3 : 0 });
    let calls = 0;
    const models = {
      executionPool: async () => [profile],
      executeWorkItem: async () => {
        calls++;
        if (kind === 'timeout') throw new Error('timeout');
        return { status: 'maybe', summary: 'Unknown' };
      },
    };
    await assert.rejects(() =>
      runWorkItems({ batch: f.batch, workspace: h.workspace, effects: h.effects, context, models }),
    );
    const first = calls;
    await assert.rejects(() =>
      runWorkItems({ batch: f.batch, workspace: h.workspace, effects: h.effects, context, models }),
    );
    assert.equal(calls, first);
    assert(h.durable().workItems.runs[0].nodes.length <= 1);
    assert.equal(calls, kind === 'save' ? 0 : 1);
  }
});

test('takeover after model return prevents child commit and integration', async () => {
  const f = fixture({ a: [] });
  let owns = true;
  const h = harness(f.batch, { own: () => owns });
  const models = {
    executionPool: async () => [profile],
    executeWorkItem: async () => {
      owns = false;
      return { status: 'implemented', summary: 'Applied' };
    },
  };
  await assert.rejects(
    () =>
      runWorkItems({ batch: f.batch, workspace: h.workspace, effects: h.effects, context, models }),
    /ownership changed/,
  );
  assert(!h.events.some((e) => e.startsWith('commit:') || e.startsWith('integrate:')));
});

test('risk cannot be routed to a delegate, and graph cannot enter a correction or second round', async () => {
  const f = fixture({ a: [] });
  f.graph.nodes[0].risk.level = 'high';
  f.batch.workItems = createWorkItemsEnvelope(f.graph, { plan: f.plan, issues: f.issues });
  const h = harness(f.batch);
  let calls = 0;
  const delegate = { ...profile, id: 'delegate', tier: 'delegate' };
  const models = {
    executeWorkItem: async () => {
      calls++;
    },
  };
  await assert.rejects(
    () =>
      runWorkItems({
        batch: f.batch,
        workspace: h.workspace,
        effects: h.effects,
        context,
        models,
        pool: [delegate],
        selectExecutor: () => ({ profile: delegate }),
      }),
    /risk requires senior/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    () =>
      runWorkItems({
        batch: f.batch,
        workspace: h.workspace,
        effects: h.effects,
        context: { ...context, round: 2 },
        models,
        pool: [profile],
      }),
    /first initial/,
  );
});

test('trusted retained continuation skips durable integrated nodes and rejects untrusted continuation', async () => {
  const f = fixture({ a: [], b: ['a'] });
  const h = harness(f.batch);
  const models = {
    executionPool: async () => [profile],
    executeWorkItem: async () => ({ status: 'implemented', summary: 'Applied' }),
  };
  await runWorkItems({
    batch: f.batch,
    workspace: h.workspace,
    effects: h.effects,
    context,
    models,
  });
  // Construct the exact earlier durable point after A integrated and before B
  // acquired any reservation. No inference was unfinished at that point.
  const retained = f.batch.workItems.runs[0];
  retained.nodes.pop();
  retained.status = 'running';
  retained.integrationHeadSha = retained.nodes[0].integration.afterSha;
  h.workspace.integrationHead = async () => retained.integrationHeadSha;
  h.workspace.integrateChild = async ({ childSha }) => {
    retained.integrationHeadSha = childSha;
    return { sha: childSha };
  };
  let calls = 0;
  const resumedModels = {
    ...models,
    executeWorkItem: async ({ item }) => {
      calls++;
      assert.equal(item.id, 'b');
      return { status: 'implemented', summary: 'Resumed never-admitted B' };
    },
  };
  await assert.rejects(
    () =>
      runWorkItems({
        batch: f.batch,
        workspace: h.workspace,
        effects: h.effects,
        context,
        models: resumedModels,
      }),
    /no model replay/,
  );
  assert.equal(
    (
      await runWorkItems({
        batch: f.batch,
        workspace: h.workspace,
        effects: h.effects,
        context: { ...context, resumeAuthorized: true },
        models: resumedModels,
      })
    ).status,
    'implemented',
  );
  assert.equal(calls, 1);
});

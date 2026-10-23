import { randomUUID } from 'node:crypto';
import { validateAgainstSchema } from '../core/json-schema.mjs';
import {
  planSchema,
  validatePlan,
  editableFile,
  relativeFile,
  safeText,
  sha256,
} from './contracts.mjs';

export const MAX_WORK_ITEMS = 8;
const text = { type: 'string' };
const integer = { type: 'integer' };
const array = (items, minItems = 0) => ({ type: 'array', items, minItems });
const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const assessment = (levels) => object({ level: { type: 'string', enum: levels }, reason: text });
export const workGraphSchema = object({
  issues: array(integer, 1),
  nodes: array(
    object({
      id: text,
      title: text,
      issues: array(integer, 1),
      taskIndexes: array(integer, 1),
      criteriaRefs: array(object({ issue: integer, index: integer }), 1),
      dependsOn: array(text),
      scope: array(text, 1),
      readFiles: array(text),
      difficulty: { type: 'string', enum: ['low', 'medium', 'high'] },
      risk: assessment(['low', 'medium', 'high']),
      coupling: assessment(['isolated', 'ordered', 'shared']),
      conflictKeys: array(text),
      routePreference: { type: 'string', enum: ['auto', 'senior'] },
      verificationIndexes: array(integer, 1),
      summary: text,
    }),
    1,
  ),
});
export const adaptivePlanningSchema = object({
  plan: planSchema,
  workGraphs: array(workGraphSchema),
});
const copy = (value) => structuredClone(value);
const digest = /^[a-f0-9]{64}$/;
const sha = /^[a-f0-9]{40}$/;
const unique = (values) => new Set(values).size === values.length;
const sameSet = (a, b) =>
  a.length === b.length && unique(a) && unique(b) && a.every((x) => b.includes(x));
function assert(value, message) {
  if (!value) throw new Error(`Invalid work items: ${message}`);
}
function bounded(value, limit = 4000) {
  safeText(value);
  assert(value.trim() && value.length <= limit, 'empty or oversized text');
}
function ancestors(spec, id, seen = new Set()) {
  for (const dep of spec.nodes.find((n) => n.id === id).dependsOn) {
    assert(!seen.has(dep), 'dependency cycle');
    ancestors(spec, dep, new Set([...seen, id]));
  }
}
function dependsOn(spec, id, target) {
  return spec.nodes
    .find((n) => n.id === id)
    .dependsOn.some((dep) => dep === target || dependsOn(spec, dep, target));
}
function validateGraph(spec, plan) {
  validateAgainstSchema(spec, workGraphSchema);
  safeText(JSON.stringify(spec));
  assert(Buffer.byteLength(JSON.stringify(spec)) <= 128 * 1024, 'graph size limit');
  assert(sameSet(spec.issues, plan.issues), 'graph issues differ from accepted group');
  assert(
    spec.nodes.length <= MAX_WORK_ITEMS && unique(spec.nodes.map((n) => n.id)),
    'node count or duplicate IDs',
  );
  const assigned = [];
  const criteria = new Set();
  for (const n of spec.nodes) {
    assert(/^[a-z][a-z0-9-]{0,39}$/.test(n.id), 'node ID');
    bounded(n.title, 200);
    bounded(n.summary);
    bounded(n.risk.reason);
    bounded(n.coupling.reason);
    assert(
      unique(n.issues) && n.issues.every((i) => plan.issues.includes(i)),
      'node issue outside group',
    );
    for (const values of [
      n.scope,
      n.readFiles,
      n.dependsOn,
      n.taskIndexes,
      n.conflictKeys,
      n.verificationIndexes,
    ])
      assert(unique(values), 'duplicate packet entries');
    assert(
      n.dependsOn.every((id) => id !== n.id && spec.nodes.some((other) => other.id === id)),
      'unknown/self dependency',
    );
    assert(
      n.scope.every((f) => {
        editableFile(f);
        return plan.scope.includes(f);
      }),
      'node write scope outside accepted scope',
    );
    n.readFiles.forEach(editableFile);
    assert(n.readFiles.length <= 40 && n.conflictKeys.length <= 20, 'packet context limit');
    assert(
      n.conflictKeys.every((k) => /^[a-zA-Z0-9][a-zA-Z0-9:./_-]{0,99}$/.test(k)),
      'invalid conflict key',
    );
    for (const index of n.taskIndexes) {
      assert(Number.isSafeInteger(index) && index >= 0 && index < plan.tasks.length, 'task index');
      assert(
        plan.tasks[index].files.every((f) => n.scope.includes(f)),
        'task files missing from node scope',
      );
      assigned.push(index);
    }
    for (const ref of n.criteriaRefs) {
      const accepted = plan.acceptance.find((a) => a.issue === ref.issue);
      assert(
        n.issues.includes(ref.issue) &&
          accepted &&
          Number.isSafeInteger(ref.index) &&
          ref.index >= 0 &&
          ref.index < accepted.criteria.length,
        'criterion reference',
      );
      const key = `${ref.issue}:${ref.index}`;
      assert(!criteria.has(`${n.id}:${key}`), 'duplicate criterion');
      criteria.add(`${n.id}:${key}`);
      criteria.add(key);
    }
    assert(
      n.verificationIndexes.every(
        (index) => Number.isSafeInteger(index) && index >= 0 && index < plan.verification.length,
      ),
      'verification index',
    );
  }
  assert(
    sameSet(
      assigned,
      plan.tasks.map((_, i) => i),
    ),
    'every accepted task must be assigned exactly once',
  );
  assert(
    plan.scope.every((f) => spec.nodes.some((n) => n.scope.includes(f))),
    'unowned parent scope file',
  );
  assert(
    plan.issues.every((i) => spec.nodes.some((n) => n.issues.includes(i))),
    'unowned source issue',
  );
  assert(
    plan.acceptance.every((a) => a.criteria.every((_, i) => criteria.has(`${a.issue}:${i}`))),
    'unassigned acceptance criterion',
  );
  for (const n of spec.nodes) ancestors(spec, n.id);
  for (const [i, n] of spec.nodes.entries())
    for (const other of spec.nodes.slice(i + 1))
      if (n.scope.some((f) => other.scope.includes(f)))
        assert(
          dependsOn(spec, n.id, other.id) || dependsOn(spec, other.id, n.id),
          'shared writes require dependency ordering',
        );
  return spec;
}

export function validateAdaptivePlanning(response, selectedIssues) {
  validateAgainstSchema(response, adaptivePlanningSchema);
  validatePlan(response.plan, selectedIssues);
  assert(
    response.workGraphs.length === response.plan.groups.length,
    'one graph required per accepted group',
  );
  for (const group of response.plan.groups) {
    const matching = response.workGraphs.filter((g) => sameSet(g.issues, group.issues));
    assert(matching.length === 1, 'missing or ambiguous group graph');
    validateGraph(matching[0], group);
  }
  for (const issue of selectedIssues) {
    const blockers = explicitBlockers(issue);
    const graph = response.workGraphs.find((g) => g.issues.includes(issue.number));
    if (!graph) continue; // An explicitly blocked source issue has no executable group.
    for (const blocker of blockers) {
      assert(
        graph.issues.includes(blocker),
        'source ticket blocker must be authorized in the same group',
      );
      for (const node of graph.nodes.filter((n) => n.issues.includes(issue.number)))
        if (!node.issues.includes(blocker))
          assert(
            graph.nodes
              .filter((n) => n.issues.includes(blocker))
              .every((n) => dependsOn(graph, node.id, n.id)),
            'source ticket blocker omitted from DAG',
          );
    }
  }
  return response;
}

function explicitBlockers(issue) {
  const ids = [];
  for (const source of [issue.body ?? '', ...(issue.comments ?? []).map((c) => c.body ?? '')]) {
    let section = false;
    for (const line of source.split(/\r?\n/)) {
      if (
        /^\s*(?:#{1,6}\s*)?(?:\*\*)?Blocked by(?:\*\*)?\s*:/i.test(line) ||
        /^\s*#{1,6}\s+Blocked by\s*$/i.test(line)
      )
        section = true;
      else if (section && (!line.trim() || /^\s*#/.test(line))) section = false;
      if (section)
        for (const match of line.matchAll(/(?:^|[\s(])#([1-9][0-9]*)\b/g))
          ids.push(Number(match[1]));
    }
  }
  return [...new Set(ids)];
}

export function createWorkItemsEnvelope(spec, { plan, issues, maxParallel = 2 }) {
  validateGraph(spec, plan);
  assert(
    Number.isSafeInteger(maxParallel) && maxParallel >= 1 && maxParallel <= 2,
    'local parallel limit',
  );
  assert(Array.isArray(issues), 'source issue snapshots required');
  const sourceIssues = spec.issues.map((number) => {
    const issue = issues.find((i) => i.number === number);
    assert(issue, 'missing source issue snapshot');
    return {
      number,
      bodyAndCommentsSha256: sha256(
        JSON.stringify({
          number,
          title: issue.title ?? '',
          body: issue.body ?? '',
          comments: issue.comments ?? [],
        }),
      ),
    };
  });
  const envelope = {
    schemaVersion: 1,
    spec: copy(spec),
    specSha256: sha256(JSON.stringify(spec)),
    planSha256: sha256(JSON.stringify(plan)),
    sourceIssues,
    policy: {
      maxNodes: MAX_WORK_ITEMS,
      maxParallel,
      sessionLimit: spec.nodes.length,
      allowGraphRounds: [1],
    },
    runs: [],
  };
  envelope.bindingSha256 = envelopeBinding(envelope);
  return envelope;
}
function envelopeBinding(e) {
  return sha256(
    JSON.stringify({
      specSha256: e.specSha256,
      planSha256: e.planSha256,
      sourceIssues: e.sourceIssues,
      policy: e.policy,
    }),
  );
}

export function validateWorkItems(batch) {
  const e = batch.workItems;
  if (e === undefined) return null;
  assert(e && e.schemaVersion === 1, 'envelope version');
  validateGraph(e.spec, batch.plan);
  assert(
    e.specSha256 === sha256(JSON.stringify(e.spec)) &&
      e.planSha256 === sha256(JSON.stringify(batch.plan)),
    'frozen graph/plan digest changed',
  );
  assert(
    Array.isArray(e.sourceIssues) &&
      sameSet(
        e.sourceIssues.map((i) => i.number),
        batch.plan.issues,
      ) &&
      e.sourceIssues.every((i) => digest.test(i.bodyAndCommentsSha256)),
    'source issue binding',
  );
  assert(
    e.policy?.maxNodes === MAX_WORK_ITEMS &&
      [1, 2].includes(e.policy.maxParallel) &&
      e.policy.sessionLimit === e.spec.nodes.length &&
      JSON.stringify(e.policy.allowGraphRounds) === '[1]',
    'finite policy changed',
  );
  assert(e.bindingSha256 === envelopeBinding(e), 'source/policy binding changed');
  assert(Array.isArray(e.runs) && e.runs.length <= 1, 'graph run limit');
  for (const run of e.runs) {
    assert(
      run.parentImplementationRound === 1 &&
        run.flow === 'implementation' &&
        ['running', 'completed', 'failed', 'unknown'].includes(run.status),
      'run identity/status',
    );
    assert(
      run.planSha256 === e.planSha256 &&
        run.specSha256 === e.specSha256 &&
        sha.test(run.integrationStartSha) &&
        digest.test(run.feedbackSha256),
      'run frozen binding',
    );
    assert(
      Array.isArray(run.nodes) &&
        run.nodes.length <= e.policy.sessionLimit &&
        unique(run.nodes.map((n) => n.id)) &&
        unique(run.nodes.map((n) => n.nonce)),
      'session budget/replayed nonce',
    );
    validatePool(run.poolSnapshot);
    for (const n of run.nodes) {
      assert(
        e.spec.nodes.some((item) => item.id === n.id) && /^[a-zA-Z0-9-]{8,80}$/.test(n.nonce),
        'node reservation identity',
      );
      assert(
        ['reserved', 'running', 'implemented', 'blocked', 'unknown'].includes(n.status),
        'node reservation status',
      );
      assert(
        ['codex', 'claude'].includes(n.provider) &&
          typeof n.model === 'string' &&
          n.model.trim() &&
          typeof n.profileId === 'string',
        'node provider binding',
      );
      assert(
        run.poolSnapshot.some(
          (p) =>
            p.id === n.profileId && p.provider === n.provider && p.model === n.model && p.ready,
        ),
        'reservation outside frozen pool',
      );
      assert(
        sha.test(n.sourceIntegrationSha) &&
          typeof n.cwd === 'string' &&
          typeof n.branch === 'string',
        'node workspace binding',
      );
      if (n.integration)
        assert(
          ['running', 'integrated', 'conflict', 'unknown'].includes(n.integration.status) &&
            sha.test(n.integration.beforeSha) &&
            sha.test(n.integration.childSha),
          'integration journal',
        );
      if (n.integration?.status === 'integrated')
        assert(
          n.status === 'implemented' && sha.test(n.integration.afterSha),
          'integrated revision',
        );
      if (n.status === 'running' || n.status === 'implemented')
        assert(
          n.checkpoint?.packetHashes &&
            n.packetSha256 === sha256(JSON.stringify(n.checkpoint.packetHashes)),
          'missing/tampered pre-inference checkpoint',
        );
      if (n.status === 'implemented')
        assert(sha.test(n.childSha) && n.outputManifest, 'missing implemented output manifest');
      if (n.commit)
        assert(
          ['running', 'committed'].includes(n.commit.status) &&
            sha.test(n.commit.beforeSha) &&
            n.result?.status === 'implemented' &&
            n.outputCheckpoint,
          'invalid child commit reservation',
        );
      if (n.status === 'implemented')
        assert(
          n.commit?.status === 'committed' && n.commit.afterSha === n.childSha,
          'missing confirmed child commit',
        );
    }
    if (run.status === 'completed')
      assert(
        e.spec.nodes.every((item) =>
          run.nodes.some((n) => n.id === item.id && n.integration?.status === 'integrated'),
        ),
        'false graph completion',
      );
  }
  return e;
}

const conflict = (a, b) =>
  a.scope.some((f) => b.scope.includes(f)) ||
  a.conflictKeys.some((k) => b.conflictKeys.includes(k));
export function readyFrontier(spec, run, activeClaims = []) {
  const records = new Map(run.nodes.map((n) => [n.id, n]));
  const active = activeClaims
    .map((c) => (typeof c === 'string' ? spec.nodes.find((n) => n.id === c) : c))
    .filter(Boolean);
  return spec.nodes.filter(
    (n) =>
      !records.has(n.id) &&
      n.dependsOn.every((id) => records.get(id)?.integration?.status === 'integrated') &&
      !active.some((c) => conflict(n, c)),
  );
}

function validatePool(pool) {
  assert(
    Array.isArray(pool) && pool.length > 0 && pool.length <= 16 && unique(pool.map((p) => p.id)),
    'explicit execution pool required',
  );
  for (const p of pool)
    assert(
      typeof p.id === 'string' &&
        p.id.trim() &&
        ['codex', 'claude'].includes(p.provider) &&
        typeof p.model === 'string' &&
        p.model.trim() &&
        ['senior', 'delegate'].includes(p.tier) &&
        typeof p.ready === 'boolean' &&
        Number.isSafeInteger(p.limit) &&
        p.limit > 0 &&
        p.limit <= 2 &&
        p.availability === 'cli-preflight-not-inference-verified',
      'invalid configured profile',
    );
}
function conservativeSelection({ profiles, localClaims }) {
  const profile = profiles.find(
    (p) =>
      p.ready &&
      p.tier === 'senior' &&
      localClaims.filter((c) => c.profileId === p.id).length < p.limit,
  );
  return profile
    ? {
        profile,
        reason: 'explicit-senior-default',
        localActive: localClaims.filter((c) => c.profileId === profile.id).length,
      }
    : null;
}

// The host owns the single serialized mutation/save queue. Only model promises run
// concurrently; this function never calls the state store or grants recovery.
export async function runWorkItems({
  batch,
  workspace,
  models,
  effects,
  context,
  pool,
  selectExecutor = conservativeSelection,
  now = Date.now,
  nonce = randomUUID,
}) {
  assert(
    effects &&
      ['getBatch', 'assertOwnership', 'mutate'].every((key) => typeof effects[key] === 'function'),
    'trusted serialized host effects required',
  );
  const get = () => effects.getBatch();
  const envelope = validateWorkItems(get());
  assert(batch.id === get().id && envelope, 'canonical batch binding');
  assert(
    context.phase === 'implementation' && context.round === 1 && context.implementationRound === 1,
    'graph is restricted to first initial parent attempt',
  );
  assert(
    get().implementation.some((a) => a.round === 1 && a.status === 'running'),
    'parent implementation reservation missing',
  );
  const profiles = copy(pool ?? (await models.executionPool()));
  validatePool(profiles);
  const spec = copy(envelope.spec);
  const record = () => get().workItems.runs[0];
  const mutate = (fn) =>
    effects.mutate(async (canonical) => {
      validateWorkItems(canonical);
      return fn(canonical);
    });
  if (envelope.runs.length) {
    const retained = record();
    assert(
      retained.feedbackSha256 === sha256(JSON.stringify(context.feedback ?? null)),
      'retained feedback changed',
    );
    const safe = retained.nodes.every(
      (n) => n.status === 'implemented' && n.integration?.status === 'integrated',
    );
    assert(
      safe &&
        (retained.status === 'completed' ||
          (retained.status === 'running' && context.resumeAuthorized === true)),
      'unknown previous outcome; no model replay',
    );
    assert(
      (await workspace.integrationHead(get())) === retained.integrationHeadSha,
      'retained integration tip changed',
    );
    for (const reservation of retained.nodes)
      await workspace.inspectIntegration({
        batch: get(),
        item: spec.nodes.find((n) => n.id === reservation.id),
        reservation,
      });
    if (retained.status === 'completed')
      return {
        status: 'implemented',
        summary: 'Exact durable integrated graph inspected; no model session replayed.',
      };
  } else {
    const integrationStartSha = await workspace.integrationHead(get());
    await mutate((canonical) =>
      canonical.workItems.runs.push({
        parentImplementationRound: 1,
        flow: 'implementation',
        sourceSha: canonical.sha ?? null,
        integrationStartSha,
        integrationHeadSha: integrationStartSha,
        planSha256: envelope.planSha256,
        specSha256: envelope.specSha256,
        feedbackSha256: sha256(JSON.stringify(context.feedback ?? null)),
        poolSnapshot: profiles,
        status: 'running',
        nodes: [],
      }),
    );
  }
  const active = new Map();
  let halt = false;
  let unknown = null;
  let integrationTail = Promise.resolve();
  const integrateSerially = (fn) => {
    const next = integrationTail.then(fn);
    integrationTail = next.catch(() => {});
    return next;
  };
  const claims = () => [...active.values()].map((entry) => entry.claim);
  async function execute(item, route) {
    const profile = route.profile;
    let reservation;
    try {
      const n = nonce();
      const coordinates = workspace.coordinates(get(), item, { nonce: n });
      await mutate(async (canonical) => {
        const sourceIntegrationSha = await workspace.integrationHead(canonical);
        assert(
          !record().nodes.some((r) => r.id === item.id || r.nonce === n),
          'duplicate child reservation',
        );
        canonical.workItems.runs[0].nodes.push({
          id: item.id,
          nonce: n,
          profileId: profile.id,
          provider: profile.provider,
          model: profile.model,
          routeReason: route.reason,
          localActive: route.localActive ?? 0,
          startedAt: new Date(now()).toISOString(),
          sourceIntegrationSha,
          ...coordinates,
          status: 'reserved',
        });
      });
      reservation = () => copy(record().nodes.find((r) => r.id === item.id));
      await mutate(async (canonical) => {
        const prepared = await workspace.prepareChild({
          batch: canonical,
          item,
          reservation: reservation(),
          assertOwnership: effects.assertOwnership,
        });
        Object.assign(
          canonical.workItems.runs[0].nodes.find((r) => r.id === item.id),
          {
            checkpoint: prepared.checkpoint,
            packetSha256: sha256(JSON.stringify(prepared.checkpoint.packetHashes)),
            status: 'running',
          },
        );
      });
      await effects.assertOwnership();
      const r = reservation();
      const result = await models.executeWorkItem({
        cwd: r.cwd,
        packet: r.packet,
        parentPlan: get().plan,
        item: copy(item),
        route: copy(route),
        reservation: r,
      });
      assert(
        result?.status === 'implemented' || result?.status === 'blocked',
        'model outcome unconfirmed',
      );
      safeText(result.summary);
      assert(result.summary.length <= 4000, 'model summary limit');
      if (result.status === 'blocked') {
        halt = true;
        await mutate((canonical) =>
          Object.assign(
            canonical.workItems.runs[0].nodes.find((n) => n.id === item.id),
            { status: 'blocked', resultSummary: result.summary },
          ),
        );
        return { id: item.id, definite: true };
      }
      let rejectedOutput = false;
      await mutate(async (canonical) => {
        let output;
        try {
          output = await workspace.captureChildCheckpoint({
            batch: canonical,
            item,
            reservation: reservation(),
            assertOwnership: effects.assertOwnership,
          });
        } catch (error) {
          if (error?.code !== 'workspace-scope-invalid') throw error;
          halt = true;
          rejectedOutput = true;
          Object.assign(
            canonical.workItems.runs[0].nodes.find((n) => n.id === item.id),
            {
              status: 'blocked',
              resultSummary:
                'Controller rejected child scope, identity or immutable packet changes.',
            },
          );
          return;
        }
        Object.assign(
          canonical.workItems.runs[0].nodes.find((n) => n.id === item.id),
          {
            result: copy(result),
            resultSummary: result.summary,
            outputCheckpoint: output,
            commit: {
              nonce: nonce(),
              status: 'running',
              beforeSha: output.head ?? reservation().sourceIntegrationSha,
            },
          },
        );
      });
      if (rejectedOutput) return { id: item.id, definite: true };
      await mutate(async (canonical) => {
        const checked = await workspace.checkpointChild({
          batch: canonical,
          item,
          reservation: reservation(),
          assertOwnership: effects.assertOwnership,
        });
        const n = canonical.workItems.runs[0].nodes.find((entry) => entry.id === item.id);
        Object.assign(n, {
          status: 'implemented',
          childSha: checked.sha,
          outputManifest: checked.manifest,
        });
        n.commit.status = 'committed';
        n.commit.afterSha = checked.sha;
      });
      await integrateSerially(async () => {
        if (halt) return;
        await mutate(async (canonical) => {
          const beforeSha = await workspace.integrationHead(canonical);
          const n = canonical.workItems.runs[0].nodes.find((r) => r.id === item.id);
          n.integration = { nonce: nonce(), status: 'running', beforeSha, childSha: n.childSha };
        });
        await mutate(async (canonical) => {
          const n = canonical.workItems.runs[0].nodes.find((r) => r.id === item.id);
          let integrated;
          try {
            integrated = await workspace.integrateChild({
              batch: canonical,
              item,
              reservation: copy(n),
              childSha: n.childSha,
              beforeSha: n.integration.beforeSha,
              assertOwnership: effects.assertOwnership,
            });
          } catch (error) {
            if (error?.workItemDefinite !== 'integration-conflict') throw error;
            n.integration.status = 'conflict';
            halt = true;
            return;
          }
          n.integration.status = 'integrated';
          n.integration.afterSha = integrated.sha;
          canonical.workItems.runs[0].integrationHeadSha = integrated.sha;
        });
      });
      return { id: item.id, definite: true };
    } catch (error) {
      halt = true;
      // No generic exception proves an inference or Git operation did not occur.
      unknown ??= error;
      try {
        if (reservation)
          await mutate((canonical) => {
            const n = canonical.workItems.runs[0].nodes.find((r) => r.id === item.id);
            if (n.integration?.status === 'running') n.integration.status = 'unknown';
            else if (!['implemented', 'blocked'].includes(n.status)) n.status = 'unknown';
            canonical.workItems.runs[0].status = 'unknown';
          });
      } catch {
        /* Keep the last genuinely durable reservation if the queue failed. */
      }
      return { id: item.id, definite: false, error };
    }
  }
  while (true) {
    if (!halt) {
      try {
        for (const item of readyFrontier(spec, record(), claims())) {
          if (halt || active.size >= envelope.policy.maxParallel) break;
          if (claims().some((other) => conflict(item, other))) continue;
          const candidate = await selectExecutor({
            item,
            profiles: copy(profiles),
            localClaims: claims(),
            observations: {},
          });
          if (!candidate) continue;
          const selected = candidate.profile ?? candidate;
          const profile = profiles.find(
            (p) =>
              p.id === selected.id &&
              p.provider === selected.provider &&
              p.model === selected.model &&
              p.ready,
          );
          assert(
            profile && claims().filter((c) => c.profileId === profile.id).length < profile.limit,
            'route outside configured local capacity',
          );
          if (
            item.routePreference === 'senior' ||
            item.difficulty === 'high' ||
            item.risk.level !== 'low' ||
            item.coupling.level === 'shared'
          )
            assert(profile.tier === 'senior', 'risk requires senior profile');
          const route = {
            profile: copy(profile),
            reason: candidate.reason ?? 'configured-route',
            localActive:
              candidate.localActive ?? claims().filter((c) => c.profileId === profile.id).length,
          };
          // Reserve admission synchronously in this map before the async worker yields.
          const promise = execute(item, route);
          active.set(item.id, {
            promise,
            claim: {
              ...item,
              itemId: item.id,
              profileId: profile.id,
              provider: profile.provider,
              model: profile.model,
            },
          });
        }
      } catch (error) {
        halt = true;
        unknown ??= error;
      }
    }
    if (!active.size) break;
    const settled = await Promise.race([...active.values()].map((entry) => entry.promise));
    active.delete(settled.id);
    if (!settled.definite) unknown ??= settled.error;
  }
  if (unknown) throw unknown;
  const complete = spec.nodes.every((item) =>
    record().nodes.some((n) => n.id === item.id && n.integration?.status === 'integrated'),
  );
  await mutate((canonical) => {
    canonical.workItems.runs[0].status = complete ? 'completed' : 'failed';
  });
  return complete
    ? {
        status: 'implemented',
        summary: `Integrated ${spec.nodes.length} bounded work packets; controller verification remains required.`,
      }
    : {
        status: 'blocked',
        summary:
          'Graph stopped at a definite blocked packet or unavailable configured route. Existing parent attempt and child reservations are retained.',
      };
}

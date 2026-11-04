import test from 'node:test';
import assert from 'node:assert/strict';
import {
  request,
  APP,
  TARGET,
  SERVICES,
  sourcePatch,
  validateReleaseProof,
  REQUIRED_CHECKS,
} from './policy.mjs';
import { execute } from './controller.mjs';

const W = 'a'.repeat(40),
  H = 'b'.repeat(40),
  TREE = 'c'.repeat(40);
function fixture(action = 'stage-source') {
  const req = request({
    action,
    service: 'backend',
    workflowSha: W,
    dispatchId: 'bcff0957-d503-4e26-8a52-70ff3e3fc016',
  });
  const data = {
    projectToken: {
      project: { id: TARGET.projectId },
      environment: { id: TARGET.environmentId, name: 'development' },
    },
    environment: {
      id: TARGET.environmentId,
      projectId: TARGET.projectId,
      name: 'development',
      isEphemeral: false,
      deploymentTriggers: { pageInfo: { hasNextPage: false }, edges: [] },
      serviceInstances: {
        pageInfo: { hasNextPage: false },
        edges: Object.values(SERVICES).map((serviceId) => ({
          node: {
            serviceId,
            environmentId: TARGET.environmentId,
            source: null,
            activeDeployments: [],
            latestDeployment: null,
          },
        })),
      },
    },
  };
  const patches = { pageInfo: { hasNextPage: false }, edges: [] };
  const count = { writes: 0, reserved: 0, completed: 0, unknown: 0, auth: 0 };
  const host = {
    requireWriteAuthority: async () => {},
    authorize: async () => {
      count.auth++;
    },
    validateConfiguration: async () => {
      throw Error('No configuration attestation');
    },
    reserve: async () => {
      count.reserved++;
      return { id: 1 };
    },
    unknown: async () => {
      count.unknown++;
    },
    complete: async () => {
      count.completed++;
    },
  };
  const provider = {
    requireAtomicEffect: async () => {},
    inspect: async () => structuredClone(data),
    patches: async () => structuredClone(patches),
    stage: async () => {
      count.writes++;
      return 'patch-id';
    },
    commit: async (_req, _id, options) => {
      assert.deepEqual(options, { skipDeploys: true });
      count.writes++;
      return 'commit';
    },
    deploy: async () => {
      count.writes++;
      return 'deployment-id';
    },
    verify: async () => ({ verified: true }),
  };
  return { req, data, patches, host, provider, count };
}
test('preflight has zero reservations and zero provider mutations', async () => {
  const f = fixture('preflight');
  const receipt = await execute(f);
  assert.equal(receipt.deployed, false);
  assert.equal(f.count.writes, 0);
  assert.equal(f.count.reserved, 0);
});
test('missing live action authority blocks before reservation and provider mutation', async () => {
  const f = fixture();
  delete f.host.requireWriteAuthority;
  await assert.rejects(execute(f));
  assert.equal(f.count.reserved, 0);
  assert.equal(f.count.writes, 0);
});
test('unqualified provider atomicity blocks before reservation and mutation', async () => {
  const f = fixture();
  f.provider.requireAtomicEffect = async () => {
    throw Error('No native CAS');
  };
  await assert.rejects(execute(f));
  assert.equal(f.count.reserved, 0);
  assert.equal(f.count.writes, 0);
});
for (const [name, mutate] of Object.entries({
  project: (f) => {
    f.data.projectToken.project.id = 'bddf5d1b-ee83-4362-8238-a79721f795e5';
  },
  environment: (f) => {
    f.data.environment.id = '8021987e-8eaa-4bc8-a102-20566db5e6b4';
  },
  name: (f) => {
    f.data.environment.name = 'demo';
  },
  ephemeral: (f) => {
    f.data.environment.isEphemeral = true;
  },
  pagination: (f) => {
    f.data.environment.serviceInstances.pageInfo.hasNextPage = true;
  },
  duplicate: (f) => {
    f.data.environment.serviceInstances.edges[0] = f.data.environment.serviceInstances.edges[1];
  },
  trigger: (f) => {
    f.data.environment.deploymentTriggers.edges.push({ node: {} });
  },
  rollout: (f) => {
    f.data.environment.serviceInstances.edges[0].node.latestDeployment = { status: 'BUILDING' };
  },
  staged: (f) => {
    f.patches.edges.push({ node: { status: 'STAGED' } });
  },
  failedPatch: (f) => {
    f.patches.edges.push({ node: { status: 'FAILED' } });
  },
  wrongSource: (f) => {
    f.data.environment.serviceInstances.edges[0].node.source = { repo: 'other/repo' };
  },
}))
  test(`reject ${name} before reservation and mutation`, async () => {
    const f = fixture();
    mutate(f);
    await assert.rejects(execute(f));
    assert.equal(f.count.reserved, 0);
    assert.equal(f.count.writes, 0);
  });
test('authorization and durable intent precede a single mutation', async () => {
  const f = fixture();
  f.provider.stage = async () => {
    assert.equal(f.count.auth, 2);
    assert.equal(f.count.reserved, 1);
    f.count.writes++;
    return 'id';
  };
  await execute(f);
  assert.equal(f.count.writes, 1);
  assert.equal(f.count.completed, 1);
});
test('lost authority immediately before mutation produces zero writes', async () => {
  const f = fixture();
  f.host.authorize = async () => {
    if (++f.count.auth === 2) throw Error('revoked');
  };
  await assert.rejects(execute(f));
  assert.equal(f.count.writes, 0);
});
test('snapshot drift produces zero writes after reservation', async () => {
  const f = fixture();
  let read = 0;
  f.provider.inspect = async () => {
    const result = structuredClone(f.data);
    if (++read === 2) result.environment.name = 'changed';
    return result;
  };
  await assert.rejects(execute(f));
  assert.equal(f.count.writes, 0);
});
test('uncertain submission is attempted once and remains unknown', async () => {
  const f = fixture();
  f.provider.stage = async () => {
    f.count.writes++;
    throw Error('network-token-must-not-reflect');
  };
  await assert.rejects(execute(f), { message: 'DEVELOPMENT_OPERATION_UNKNOWN_RECONCILE_ONLY' });
  assert.equal(f.count.writes, 1);
  assert.equal(f.count.unknown, 1);
  assert.equal(f.count.completed, 0);
});
test('proof failure never finalizes or resubmits', async () => {
  const f = fixture();
  f.provider.verify = async () => {
    throw Error('bad proof');
  };
  await assert.rejects(execute(f));
  assert.equal(f.count.writes, 1);
  assert.equal(f.count.completed, 0);
});
test('commit requires exactly the known staged source recipe and skipDeploys', async () => {
  const f = fixture('commit-source');
  f.patches.edges = [{ node: { id: 'p', status: 'STAGED', patch: sourcePatch('backend') } }];
  await execute(f);
  assert.equal(f.count.writes, 1);
});
test('deploy cannot proceed without configuration attestation', async () => {
  const f = fixture('deploy');
  f.data.environment.serviceInstances.edges[0].node.source = { repo: 'l2v-hub/ClinicOS' };
  await assert.rejects(execute(f));
  assert.equal(f.count.writes, 0);
});
function proof() {
  return {
    mainSha: W,
    appTree: APP.tree,
    workflowTree: TREE,
    reviewedTree: TREE,
    pr: {
      state: 'closed',
      merged: true,
      merge_commit_sha: W,
      base: { ref: 'main', repo: { full_name: 'l2v-hub/ClinicOS' } },
      head: { sha: H, repo: { full_name: 'l2v-hub/ClinicOS' } },
      user: { login: 'author' },
    },
    reviews: [
      { state: 'APPROVED', commit_id: H, user: { login: 'independent-human', type: 'User' } },
    ],
    checks: {
      total_count: REQUIRED_CHECKS.length,
      check_runs: REQUIRED_CHECKS.map((name) => ({
        name,
        status: 'completed',
        conclusion: 'success',
        head_sha: H,
        app: { slug: 'github-actions' },
      })),
    },
  };
}
test('workflow source and application source are deliberately distinct', () =>
  validateReleaseProof(proof(), fixture().req));
for (const [name, mutate] of Object.entries({
  selfApproval: (p) => {
    p.reviews[0].user.login = 'author';
  },
  botApproval: (p) => {
    p.reviews[0].user.type = 'Bot';
  },
  staleApproval: (p) => {
    p.reviews[0].commit_id = 'd'.repeat(40);
  },
  dismissedApproval: (p) => {
    p.reviews.push({ ...p.reviews[0], state: 'DISMISSED' });
  },
  changedTree: (p) => {
    p.workflowTree = 'e'.repeat(40);
  },
  staleMain: (p) => {
    p.mainSha = APP.sha;
  },
  failedCheck: (p) => {
    p.checks.check_runs[0].conclusion = 'failure';
  },
  wrongApp: (p) => {
    p.checks.check_runs[0].app.slug = 'untrusted-app';
  },
}))
  test(`native release proof rejects ${name}`, () => {
    const p = proof();
    mutate(p);
    assert.throws(() => validateReleaseProof(p, fixture().req));
  });

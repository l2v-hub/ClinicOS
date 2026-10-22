import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ProtectionError,
  TARGET,
  ensureEnvironmentSecret,
  isPinnedGhVersionOutput,
  main,
  removeRepositorySecret,
  validateInventoryPage,
  validateTrustedContext,
  writeEnvironmentSecretWithGh,
} from './protect-demo-secret.mjs';

const SHA = 'f'.repeat(40);
const context = (patch = {}) => ({
  eventName: 'workflow_dispatch',
  repository: TARGET.repository,
  ref: 'refs/heads/main',
  sha: SHA,
  workflowSha: SHA,
  workflowRef: TARGET.workflowRef,
  actor: TARGET.actor,
  triggeringActor: TARGET.actor,
  reviewedSha: SHA,
  ...patch,
});

class FakeApi {
  constructor({ repo = [TARGET.secretName], environment = [], admin = true } = {}) {
    this.repo = [...repo];
    this.environment = [...environment];
    this.admin = admin;
    this.mainSha = SHA;
    this.environmentName = TARGET.environmentName;
    this.environmentId = TARGET.environmentId;
    this.protectedBranches = false;
    this.customPolicies = true;
    this.policies = ['main'];
    this.deleteCount = 0;
    this.calls = [];
    this.inventoryHook = null;
    this.deleteHook = null;
    this.mainHook = null;
  }
  async getMainRef() {
    this.calls.push('main');
    if (this.mainHook) return this.mainHook(this);
    return { ref: 'refs/heads/main', object: { sha: this.mainSha } };
  }
  async getCollaboratorPermission(actor) {
    this.calls.push(`permission:${actor}`);
    return { permission: this.admin ? 'admin' : 'write', user: { login: actor } };
  }
  async getEnvironment() {
    this.calls.push('environment');
    return {
      id: this.environmentId,
      name: this.environmentName,
      deployment_branch_policy: {
        protected_branches: this.protectedBranches,
        custom_branch_policies: this.customPolicies,
      },
    };
  }
  async getEnvironmentPolicies() {
    this.calls.push('policies');
    return { total_count: this.policies.length, branch_policies: this.policies.map((name) => ({ name, type: 'branch' })) };
  }
  async listRepoSecrets(page) {
    this.calls.push(`repo:${page}`);
    return this.inventory('repo', page);
  }
  async listEnvironmentSecrets(page) {
    this.calls.push(`environment-secrets:${page}`);
    return this.inventory('environment', page);
  }
  inventory(kind, page) {
    const names = this[kind];
    if (this.inventoryHook) return this.inventoryHook(kind, page, names);
    if (page !== 1) return { total_count: names.length, secrets: [] };
    return { total_count: names.length, secrets: names.map((name) => ({ name })) };
  }
  async deleteRepoSecret() {
    this.calls.push('delete');
    this.deleteCount += 1;
    if (this.deleteHook) return this.deleteHook(this);
    this.repo = this.repo.filter((name) => name !== TARGET.secretName);
  }
}

const sentinel = 'dummy-sentinel-for-test-only';
const codes = async (promise, code) => {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof ProtectionError);
    assert.equal(error.message, code);
    assert.doesNotMatch(error.message, new RegExp(sentinel));
    return true;
  });
};

test('context binds manual dispatch to exact reviewed main SHA and triggering actor', () => {
  assert.deepEqual(validateTrustedContext(context()), { sha: SHA, actor: TARGET.actor });
  for (const patch of [
    { eventName: 'pull_request' },
    { repository: 'someone/else' },
    { ref: 'refs/heads/feature' },
    { workflowRef: 'someone-else.yml@refs/heads/main' },
    { workflowSha: 'a'.repeat(40) },
    { reviewedSha: 'b'.repeat(40) },
    { actor: 'someone-else', triggeringActor: 'someone-else' },
    { actor: TARGET.actor, triggeringActor: 'someone-else' },
  ]) assert.throws(() => validateTrustedContext(context(patch)), ProtectionError);
});

test('ensure writes the existing bound value once when only the repository copy exists', async () => {
  const api = new FakeApi({ repo: [TARGET.secretName, 'UNRELATED_REPO_SECRET'], environment: ['UNRELATED_ENV_SECRET'] });
  const writes = [];
  const receipt = await ensureEnvironmentSecret({
    context: context(), api, secretValue: sentinel,
    writeEnvironmentSecret: async (value) => {
      writes.push(value);
      api.environment.push(TARGET.secretName);
      return { ok: true };
    },
  });
  assert.deepEqual(receipt, { operation: 'ensure-environment', result: 'written-and-listed', writes: 1 });
  assert.deepEqual(writes, [sentinel]);
  assert.equal(api.calls.filter((item) => item === 'main').length, 1);
  assert.equal(api.calls.filter((item) => item === `permission:${TARGET.actor}`).length, 1);
  assert.deepEqual(api.repo, [TARGET.secretName, 'UNRELATED_REPO_SECRET']);
  assert.deepEqual(api.environment, ['UNRELATED_ENV_SECRET', TARGET.secretName]);
});

test('an existing environment copy is never overwritten and is idempotent', async () => {
  const api = new FakeApi({ environment: [TARGET.secretName] });
  let writes = 0;
  const receipt = await ensureEnvironmentSecret({
    context: context(), api, secretValue: sentinel,
    writeEnvironmentSecret: async () => { writes += 1; return { ok: true }; },
  });
  assert.equal(receipt.writes, 0);
  assert.equal(writes, 0);
});

test('environment copy appearing during awaited authority checks is never overwritten', async () => {
  const api = new FakeApi();
  api.mainHook = (target) => {
    target.environment.push(TARGET.secretName);
    return { ref: 'refs/heads/main', object: { sha: SHA } };
  };
  let writes = 0;
  const receipt = await ensureEnvironmentSecret({
    context: context(), api, secretValue: sentinel,
    writeEnvironmentSecret: async () => { writes += 1; return { ok: true }; },
  });
  assert.equal(receipt.result, 'appeared-before-write');
  assert.equal(receipt.writes, 0);
  assert.equal(writes, 0);
  assert.ok(api.repo.includes(TARGET.secretName));
  assert.ok(api.environment.includes(TARGET.secretName));
  const mainIndex = api.calls.lastIndexOf('main');
  const finalRepoIndex = api.calls.lastIndexOf('repo:1');
  const finalEnvironmentIndex = api.calls.lastIndexOf('environment-secrets:1');
  assert.ok(finalRepoIndex > mainIndex && finalEnvironmentIndex > mainIndex);
});

test('environment copy disappearing during authority checks stops before repository deletion', async () => {
  const api = new FakeApi({ environment: [TARGET.secretName] });
  api.mainHook = (target) => {
    target.environment = target.environment.filter((name) => name !== TARGET.secretName);
    return { ref: 'refs/heads/main', object: { sha: SHA } };
  };
  await codes(removeRepositorySecret({ context: context(), api, secretValue: sentinel }), 'ENVIRONMENT_SECRET_REQUIRED');
  assert.equal(api.deleteCount, 0);
  assert.ok(api.repo.includes(TARGET.secretName));
  assert.ok(!api.environment.includes(TARGET.secretName));
  const mainIndex = api.calls.lastIndexOf('main');
  const finalRepoIndex = api.calls.lastIndexOf('repo:1');
  const finalEnvironmentIndex = api.calls.lastIndexOf('environment-secrets:1');
  assert.ok(finalRepoIndex > mainIndex && finalEnvironmentIndex > mainIndex);
});

test('both copies absent or a missing environment binding fail before any write', async () => {
  const missing = new FakeApi({ repo: [], environment: [] });
  let writes = 0;
  await codes(ensureEnvironmentSecret({
    context: context(), api: missing, secretValue: sentinel,
    writeEnvironmentSecret: async () => { writes += 1; return { ok: true }; },
  }), 'BOTH_SECRET_COPIES_MISSING');
  assert.equal(writes, 0);
  const env = new FakeApi();
  await codes(ensureEnvironmentSecret({
    context: context(), api: env, secretValue: '',
    writeEnvironmentSecret: async () => { writes += 1; return { ok: true }; },
  }), 'ENVIRONMENT_BINDING_MISSING');
  assert.equal(writes, 0);
});

test('wrong fresh main, non-admin actor, environment identity, and branch policy fail before write', async (t) => {
  const cases = [
    ['main SHA drift', (api) => { api.mainSha = '0'.repeat(40); }, 'FRESH_MAIN_SHA_MISMATCH'],
    ['non-admin', (api) => { api.admin = false; }, 'TRUSTED_ADMIN_REQUIRED'],
    ['wrong environment id', (api) => { api.environmentId += 1; }, 'ENVIRONMENT_POLICY_MISMATCH'],
    ['extra branch policy', (api) => { api.policies.push('release/*'); }, 'ENVIRONMENT_MAIN_POLICY_REQUIRED'],
    ['tag policy', (api) => { api.policies = ['main']; api.getEnvironmentPolicies = async () => ({ total_count: 1, branch_policies: [{ name: 'main', type: 'tag' }] }); }, 'ENVIRONMENT_MAIN_POLICY_REQUIRED'],
    ['incomplete policy list', (api) => { api.getEnvironmentPolicies = async () => ({ total_count: 2, branch_policies: [{ name: 'main', type: 'branch' }] }); }, 'ENVIRONMENT_MAIN_POLICY_REQUIRED'],
    ['wrong admin identity', (api) => { api.getCollaboratorPermission = async () => ({ permission: 'admin', user: { login: 'other' } }); }, 'TRUSTED_ADMIN_REQUIRED'],
    ['protected branches enabled', (api) => { api.protectedBranches = true; }, 'ENVIRONMENT_POLICY_MISMATCH'],
  ];
  for (const [name, mutate, code] of cases) await t.test(name, async () => {
    const api = new FakeApi();
    mutate(api);
    let writes = 0;
    await codes(ensureEnvironmentSecret({
      context: context(), api, secretValue: sentinel,
      writeEnvironmentSecret: async () => { writes += 1; return { ok: true }; },
    }), code);
    assert.equal(writes, 0);
  });
});

test('unreadable, incomplete, truncated, and drifting inventories fail closed', async (t) => {
  const variants = [
    ['forbidden inventory', () => { throw new Error('403 private response body'); }, 'SECRET_INVENTORY_UNREADABLE'],
    ['incomplete count', () => ({ total_count: 2, secrets: [{ name: TARGET.secretName }] }), 'SECRET_INVENTORY_INCOMPLETE'],
    ['truncated body', () => null, 'SECRET_INVENTORY_INCOMPLETE'],
    ['changing count', (() => {
      let n = 0;
      return () => n++ === 0
        ? { total_count: 101, secrets: Array.from({ length: 100 }, (_, index) => ({ name: `secret-${index}` })) }
        : { total_count: 102, secrets: [{ name: 'secret-100' }] };
    })(), 'SECRET_INVENTORY_DRIFT'],
  ];
  for (const [name, response, expectedCode] of variants) await t.test(name, async () => {
    const api = new FakeApi();
    api.inventoryHook = (kind, page, names) => {
      if (kind === 'repo') return response();
      return { total_count: names.length, secrets: names.map((item) => ({ name: item })) };
    };
    let writes = 0;
    await codes(ensureEnvironmentSecret({
      context: context(), api, secretValue: sentinel,
      writeEnvironmentSecret: async () => { writes += 1; return { ok: true }; },
    }), expectedCode);
    assert.equal(writes, 0);
  });
  assert.throws(() => validateInventoryPage({ total_count: 101, secrets: new Array(100).fill({ name: 'x' }) }, 100), ProtectionError);
});

test('uncertain environment write is one attempt and a later explicit run rechecks state', async () => {
  const api = new FakeApi();
  let writes = 0;
  await codes(ensureEnvironmentSecret({
    context: context(), api, secretValue: sentinel,
    writeEnvironmentSecret: async () => {
      writes += 1;
      api.environment.push(TARGET.secretName);
      throw new Error(`transport echoed ${sentinel}`);
    },
  }), 'ENVIRONMENT_WRITE_UNCERTAIN');
  assert.equal(writes, 1);
  const recovered = await ensureEnvironmentSecret({
    context: context(), api, secretValue: sentinel,
    writeEnvironmentSecret: async () => { writes += 1; return { ok: true }; },
  });
  assert.equal(recovered.writes, 0);
  assert.equal(writes, 1);
});

test('second fresh environment job requires the bound value and environment copy before deletion', async (t) => {
  for (const [name, options, code] of [
    ['environment copy absent', { environment: [] }, 'ENVIRONMENT_SECRET_REQUIRED'],
    ['binding absent', { environment: [TARGET.secretName], value: '' }, 'ENVIRONMENT_BINDING_MISSING'],
  ]) await t.test(name, async () => {
    const api = new FakeApi(options);
    await codes(removeRepositorySecret({ context: context(), api, secretValue: options.value ?? sentinel }), code);
    assert.equal(api.deleteCount, 0);
  });
});

test('repository secret is deleted at most once after fresh checks and absence readback', async () => {
  const api = new FakeApi({ repo: [TARGET.secretName, 'UNRELATED_REPO_SECRET'], environment: [TARGET.secretName, 'UNRELATED_ENV_SECRET'] });
  const receipt = await removeRepositorySecret({ context: context(), api, secretValue: sentinel });
  assert.deepEqual(receipt, { operation: 'remove-repository', result: 'deleted-and-absent', deletes: 1 });
  assert.equal(api.deleteCount, 1);
  assert.deepEqual(api.repo, ['UNRELATED_REPO_SECRET']);
  assert.deepEqual(api.environment, [TARGET.secretName, 'UNRELATED_ENV_SECRET']);
  const deleteIndex = api.calls.indexOf('delete');
  const readbackRepoIndex = api.calls.lastIndexOf('repo:1');
  const readbackEnvironmentIndex = api.calls.lastIndexOf('environment-secrets:1');
  assert.ok(readbackRepoIndex > deleteIndex && readbackEnvironmentIndex > deleteIndex);
});

test('post-delete readback fails if the environment copy disappeared during deletion', async () => {
  const api = new FakeApi({ environment: [TARGET.secretName] });
  api.deleteHook = (target) => {
    target.repo = target.repo.filter((name) => name !== TARGET.secretName);
    target.environment = target.environment.filter((name) => name !== TARGET.secretName);
  };
  await codes(removeRepositorySecret({ context: context(), api, secretValue: sentinel }), 'ENVIRONMENT_PRESERVATION_READBACK_FAILED');
  assert.equal(api.deleteCount, 1);
  assert.ok(!api.repo.includes(TARGET.secretName));
  assert.ok(!api.environment.includes(TARGET.secretName));
});

test('repository absence is a zero-write idempotent result', async () => {
  const api = new FakeApi({ repo: [], environment: [TARGET.secretName] });
  const result = await removeRepositorySecret({ context: context(), api, secretValue: sentinel });
  assert.equal(result.deletes, 0);
  assert.equal(api.deleteCount, 0);
});

test('uncertain delete and recreated secret fail without a second delete attempt', async (t) => {
  await t.test('uncertain transport', async () => {
    const api = new FakeApi({ environment: [TARGET.secretName] });
    api.deleteHook = () => { throw new Error(`body ${sentinel}`); };
    await codes(removeRepositorySecret({ context: context(), api, secretValue: sentinel }), 'REPOSITORY_DELETE_UNCERTAIN');
    assert.equal(api.deleteCount, 1);
  });
  await t.test('recreated before readback', async () => {
    const api = new FakeApi({ environment: [TARGET.secretName] });
    api.deleteHook = (target) => { target.repo = [TARGET.secretName]; };
    await codes(removeRepositorySecret({ context: context(), api, secretValue: sentinel }), 'REPOSITORY_DELETE_READBACK_FAILED');
    assert.equal(api.deleteCount, 1);
  });
});

test('pinned gh version parsing accepts only the expected exact release', () => {
  assert.equal(isPinnedGhVersionOutput('gh version 2.103.0 (2026-10-15)\n'), true);
  assert.equal(isPinnedGhVersionOutput('gh version 2.103.0\n'), true);
  assert.equal(isPinnedGhVersionOutput('gh version 2.103.1 (2026-10-15)\n'), false);
  assert.equal(isPinnedGhVersionOutput('gh version 2.103.0-custom\n'), false);
  assert.equal(isPinnedGhVersionOutput('not gh version 2.103.0\n'), false);
});

test('writer requires the workflow-provided absolute pinned binary path', async () => {
  let runnerCreated = false;
  await codes(writeEnvironmentSecretWithGh({
    secretValue: sentinel,
    env: { GH_TOKEN: 'test-bot-token', PATH: process.env.PATH },
    runnerFactory: () => { runnerCreated = true; return async () => ({ ok: true, stdout: 'gh version 2.103.0' }); },
  }), 'GH_PINNED_BINARY_REQUIRED');
  assert.equal(runnerCreated, false);
});

test('actual gh writer verifies version without a token, then sends value only on stdin', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'protect-demo-secret-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const capture = path.join(root, 'capture.json');
  const versionCapture = path.join(root, 'version-capture.json');
  const executable = path.join(root, 'gh');
  await writeFile(executable, `#!/usr/bin/env node\nlet input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',()=>{const fs=require('fs');const args=process.argv.slice(2);if(args.length===1&&args[0]==='--version'){fs.writeFileSync(${JSON.stringify(versionCapture)},JSON.stringify({args,keys:Object.keys(process.env).sort(),input}));process.stdout.write('gh version 2.103.0 (2026-10-15)\\n');return;}fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify({args,keys:Object.keys(process.env).sort(),input}));});\n`);
  await chmod(executable, 0o700);
  await writeEnvironmentSecretWithGh({
    secretValue: sentinel,
    env: {
      GH_TOKEN: 'test-bot-token',
      PROTECT_DEMO_GH_PATH: executable,
      RAILWAY_DEMO_TOKEN: sentinel,
      RAILWAY_TOKEN: 'other-provider-test-value',
      ANTHROPIC_API_KEY: 'test-model-value',
      PATH: `${root}${path.delimiter}${process.env.PATH}`,
      HOME: root,
    },
  });
  const versionCheck = JSON.parse(await readFile(versionCapture, 'utf8'));
  assert.deepEqual(versionCheck.args, ['--version']);
  assert.equal(versionCheck.input, '');
  assert.ok(!versionCheck.keys.includes('GH_TOKEN'));
  for (const key of ['RAILWAY_DEMO_TOKEN', 'RAILWAY_TOKEN', 'ANTHROPIC_API_KEY', 'GITHUB_TOKEN'])
    assert.ok(!versionCheck.keys.includes(key));
  const child = JSON.parse(await readFile(capture, 'utf8'));
  assert.deepEqual(child.args, ['secret', 'set', TARGET.secretName, '--env', TARGET.environmentName, '--repo', TARGET.repository]);
  assert.equal(child.input, sentinel);
  assert.ok(child.keys.includes('GH_TOKEN'));
  for (const key of ['RAILWAY_DEMO_TOKEN', 'RAILWAY_TOKEN', 'ANTHROPIC_API_KEY', 'GITHUB_TOKEN'])
    assert.ok(!child.keys.includes(key));
  assert.ok(!child.args.join(' ').includes(sentinel));
});

test('gh version mismatch fails before the write process receives secret stdin', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'protect-demo-secret-mismatch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const capture = path.join(root, 'write-capture.json');
  const versionCapture = path.join(root, 'version-capture.json');
  const executable = path.join(root, 'gh');
  await writeFile(executable, `#!/usr/bin/env node\nlet input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',()=>{const fs=require('fs');const args=process.argv.slice(2);if(args.length===1&&args[0]==='--version'){fs.writeFileSync(${JSON.stringify(versionCapture)},JSON.stringify({args,keys:Object.keys(process.env).sort(),input}));process.stdout.write('gh version 2.102.9 (test)\\n');return;}fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify({args,input}));});\n`);
  await chmod(executable, 0o700);
  await codes(writeEnvironmentSecretWithGh({
    secretValue: sentinel,
    env: { GH_TOKEN: 'test-bot-token', PROTECT_DEMO_GH_PATH: executable, PATH: `${root}${path.delimiter}${process.env.PATH}` },
  }), 'GH_VERSION_MISMATCH');
  const versionCheck = JSON.parse(await readFile(versionCapture, 'utf8'));
  assert.equal(versionCheck.input, '');
  assert.ok(!versionCheck.keys.includes('GH_TOKEN'));
  await assert.rejects(readFile(capture, 'utf8'), { code: 'ENOENT' });
});

test('failed gh version check stops before the write process receives secret stdin', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'protect-demo-secret-version-failure-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const capture = path.join(root, 'write-capture.json');
  const versionCapture = path.join(root, 'version-capture.json');
  const executable = path.join(root, 'gh');
  await writeFile(executable, `#!/usr/bin/env node\nlet input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);process.stdin.on('end',()=>{const fs=require('fs');const args=process.argv.slice(2);if(args.length===1&&args[0]==='--version'){fs.writeFileSync(${JSON.stringify(versionCapture)},JSON.stringify({args,keys:Object.keys(process.env).sort(),input}));process.stdout.write('gh version 2.103.0 (test)\\n');process.exitCode=9;return;}fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify({args,input}));});\n`);
  await chmod(executable, 0o700);
  await codes(writeEnvironmentSecretWithGh({
    secretValue: sentinel,
    env: { GH_TOKEN: 'test-bot-token', PROTECT_DEMO_GH_PATH: executable, PATH: `${root}${path.delimiter}${process.env.PATH}` },
  }), 'GH_VERSION_CHECK_FAILED');
  const versionCheck = JSON.parse(await readFile(versionCapture, 'utf8'));
  assert.equal(versionCheck.input, '');
  assert.ok(!versionCheck.keys.includes('GH_TOKEN'));
  await assert.rejects(readFile(capture, 'utf8'), { code: 'ENOENT' });
});

test('main validates workflow context before creating an API client from credentials', async () => {
  let apiFactoryCalled = false;
  await codes(main({
    GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_REPOSITORY: TARGET.repository,
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: SHA,
    GITHUB_WORKFLOW_SHA: SHA,
    GITHUB_WORKFLOW_REF: TARGET.workflowRef,
    GITHUB_ACTOR: TARGET.actor,
    GITHUB_TRIGGERING_ACTOR: TARGET.actor,
    PROTECT_DEMO_REVIEWED_SHA: SHA,
    PROTECT_DEMO_OPERATION: 'remove-repository',
    GH_TOKEN: sentinel,
    RAILWAY_DEMO_TOKEN: sentinel,
  }, { get api() { apiFactoryCalled = true; return new FakeApi(); } }), 'TRUSTED_MAIN_CONTEXT_REQUIRED');
  assert.equal(apiFactoryCalled, false);
});

test('actual credential-free workflow node -e context import succeeds', () => {
  const code = "import { validateTrustedContext } from './scripts/automation/protect-demo-secret.mjs'; validateTrustedContext({eventName:process.env.GITHUB_EVENT_NAME,repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,workflowRef:process.env.GITHUB_WORKFLOW_REF,sha:process.env.GITHUB_SHA,workflowSha:process.env.GITHUB_WORKFLOW_SHA,actor:process.env.GITHUB_ACTOR,triggeringActor:process.env.GITHUB_TRIGGERING_ACTOR,reviewedSha:process.env.PROTECT_DEMO_REVIEWED_SHA}); process.stdout.write('PRECHECK_CONTEXT_OK\\n')";
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_REPOSITORY: TARGET.repository,
      GITHUB_REF: 'refs/heads/main',
      GITHUB_WORKFLOW_REF: TARGET.workflowRef,
      GITHUB_SHA: SHA,
      GITHUB_WORKFLOW_SHA: SHA,
      GITHUB_ACTOR: TARGET.actor,
      GITHUB_TRIGGERING_ACTOR: TARGET.actor,
      PROTECT_DEMO_REVIEWED_SHA: SHA,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'PRECHECK_CONTEXT_OK\n');
  assert.equal(result.stderr, '');
});

test('workflow is manual-only, pinned, and sequences two fresh protected-environment jobs', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/protect-demo-secret.yml', import.meta.url), 'utf8');
  assert.match(workflow, /^name:[^\n]+\non:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  (?:push|pull_request|schedule):/m);
  assert.equal((workflow.match(/^    environment: 'glistening-friendship \/ demo'$/gm) ?? []).length, 2);
  assert.equal((workflow.match(/Install and verify pinned GitHub CLI/g) ?? []).length, 3);
  assert.equal((workflow.match(/version='2\.103\.0'/g) ?? []).length, 3);
  assert.equal((workflow.match(/gh_\$\{version\}_linux_amd64\.tar\.gz/g) ?? []).length, 6);
  assert.equal((workflow.match(/fdd768eb70f6409f80fcfa9f3a1c0adf0fc98d827ab3ce0bed2ac22762c5d786/g) ?? []).length, 3);
  assert.equal((workflow.match(/PROTECT_DEMO_GH_PATH=%s/g) ?? []).length, 3);
  assert.match(workflow, /remove_repository_copy:\n    needs: ensure_environment_copy/);
  assert.equal((workflow.match(/actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/g) ?? []).length, 3);
  assert.equal((workflow.match(/actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/g) ?? []).length, 3);
  assert.equal((workflow.match(/github\.sha == github\.workflow_sha/g) ?? []).length, 3);
  assert.equal((workflow.match(/github\.actor == 'l2v-hub'/g) ?? []).length, 3);
  assert.equal((workflow.match(/github\.workflow_ref == 'l2v-hub\/ClinicOS\/\.github\/workflows\/protect-demo-secret\.yml@refs\/heads\/main'/g) ?? []).length, 3);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /cancel-in-progress: false/);
});


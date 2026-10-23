import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createModels } from '../../src/bug-pipeline/models.mjs';
import { childEnvironment, createRunner } from '../../src/bug-pipeline/process.mjs';

const RESULT = { status: 'implemented', summary: 'Applied the bounded child change.' };
const HELP_FLAGS = [
  '-c',
  '--output-schema',
  '--output-last-message',
  '--json',
  '--ephemeral',
  '--ignore-user-config',
  '--model',
  '--sandbox',
  '--cd',
].join('\n');
const PLAN = {
  tasks: [
    { issue: 18, description: 'Change the badge formatter.' },
    { issue: 19, description: 'Change the unrelated navigation.' },
  ],
  acceptance: [
    {
      issue: 18,
      criteria: ['Badge text uses the selected status.', 'Badge retains keyboard focus.'],
    },
    { issue: 19, criteria: ['Navigation keeps its expanded state.'] },
  ],
  verification: [
    { command: 'node', args: ['--test', 'badge.test.mjs'] },
    { command: 'node', args: ['--test', 'navigation.test.mjs'] },
  ],
};
const ITEM = {
  id: 'badge-format',
  title: 'Format the status badge',
  summary: 'Update the badge formatter.',
  issues: [18],
  scope: ['src/badge.mjs'],
  readFiles: ['src/badge.mjs'],
  taskIndexes: [0],
  criteriaRefs: [{ issue: 18, index: 0 }],
  verificationIndexes: [0],
  dependsOn: [],
};

test('nested scheduler routes accept only a configured profile and its running reservation', async (t) => {
  const f = await fixture(t);
  const calls = [];
  const models = createModels({
    plannerModel: 'codex-senior-test',
    runtimeRoot: f.runtimeRoot,
    run: codexRunner(calls),
  });
  const pool = await models.executionPool({ cwd: f.cwd });
  const profile = pool.find((candidate) => candidate.id === 'codex-delegate');
  assert.ok(profile?.ready);

  const result = await models.executeWorkItem({
    cwd: f.cwd,
    packet: { id: 'parent', siblingContext: ['opaque'] },
    parentPlan: PLAN,
    item: ITEM,
    route: { profile, reason: 'bounded scheduler choice' },
    reservation: reservation(profile),
  });
  assert.deepEqual(result, RESULT);
  assert.equal(calls.filter((call) => call.command === 'codex').length, 3); // version, help and child session
  const child = calls.find((call) => call.args.includes('--output-schema'));
  assert.ok(child);
  assert.match(child.input, /Format the status badge/);
  assert.match(child.input, /Badge text uses the selected status/);
  assert.doesNotMatch(
    child.input,
    /unrelated navigation|Navigation keeps its expanded state|Badge retains keyboard focus/,
  );
  const args = child.args.join('\n');
  assert.ok(args.includes('features.multi_agent=false'));
  assert.ok(args.includes('features.multi_agent_v2=false'));
});

test('wrong profile, provider, model, profile binding, and nonce are rejected before a child CLI session', async (t) => {
  const f = await fixture(t);
  const calls = [];
  const models = createModels({
    plannerModel: 'codex-senior-test',
    runtimeRoot: f.runtimeRoot,
    run: codexRunner(calls),
  });
  const pool = await models.executionPool({ cwd: f.cwd });
  const profile = pool.find((candidate) => candidate.id === 'codex-delegate');
  const route = { profile, reason: 'scheduler' };
  const invalid = [
    {
      route: { profile: { ...profile, id: 'unconfigured' }, reason: 'scheduler' },
      reservation: reservation(profile),
    },
    {
      route: { profile: { ...profile, provider: 'claude' }, reason: 'scheduler' },
      reservation: reservation(profile),
    },
    {
      route: { profile: { ...profile, model: 'other-model' }, reason: 'scheduler' },
      reservation: reservation(profile),
    },
    { route, reservation: { ...reservation(profile), profileId: 'codex-senior' } },
    { route, reservation: { ...reservation(profile), nonce: 'bad' } },
  ];
  for (const [index, value] of invalid.entries()) {
    const before = calls.length;
    await assert.rejects(
      models.executeWorkItem({ cwd: f.cwd, packet: {}, parentPlan: PLAN, item: ITEM, ...value }),
      { code: 'model-reservation-invalid' },
      `invalid binding ${index}`,
    );
    assert.equal(calls.length, before, 'invalid reservation must fail before any CLI call');
  }
});

test('fixed executor model does not run optional Claude auth probes', async (t) => {
  const f = await fixture(t);
  const calls = [];
  const models = createModels({
    plannerModel: 'planner',
    executorModel: 'fixed-codex',
    runtimeRoot: f.runtimeRoot,
    claudeExecution: {
      enabled: true,
      executable: '/missing/claude',
      configDir: '/missing/profile',
      model: 'haiku',
    },
    run: codexRunner(calls),
  });
  const pool = await models.executionPool({ cwd: f.cwd });
  assert.deepEqual(
    pool.map(({ provider, model }) => ({ provider, model })),
    [{ provider: 'codex', model: 'fixed-codex' }],
  );
  assert.equal(
    calls.some((call) => call.command === 'claude'),
    false,
  );
});

test('an unavailable optional Claude profile leaves a ready Codex profile usable', async (t) => {
  const f = await fixture(t);
  const calls = [];
  const models = createModels({
    plannerModel: 'codex-senior-test',
    runtimeRoot: f.runtimeRoot,
    claudeExecution: {
      enabled: true,
      executable: '/missing/claude',
      configDir: '/missing/profile',
      model: 'haiku',
    },
    run: codexRunner(calls),
  });
  const pool = await models.executionPool({ cwd: f.cwd });
  assert.equal(pool.find((profile) => profile.provider === 'codex')?.ready, true);
  assert.equal(pool.find((profile) => profile.provider === 'claude')?.ready, false);
});

test('work item delegation stays opt-in and its parallelism setting is bounded', async () => {
  const { workItemConfiguration } = await import('../../src/bug-pipeline/cli.mjs');
  assert.deepEqual(workItemConfiguration({}), {
    enabled: false,
    maxParallel: 2,
    claudeExecution: {
      enabled: false,
      hostedActions: false,
      executable: '',
      configDir: '',
      model: 'haiku',
      timeoutMs: 600_000,
    },
  });
  assert.equal(workItemConfiguration({}, ['--adaptive-work-items']).enabled, true);
  assert.equal(workItemConfiguration({ CLINICOS_WORK_ITEM_DELEGATION: 'adaptive' }).enabled, true);
  assert.equal(
    workItemConfiguration({
      GITHUB_ACTIONS: 'true',
      CLINICOS_WORK_ITEM_DELEGATION: 'adaptive',
      CLINICOS_CLAUDE_EXECUTOR_ENABLED: 'true',
    }).claudeExecution.hostedActions,
    true,
  );
  for (const env of [
    { CLINICOS_WORK_ITEM_DELEGATION: 'yes' },
    { CLINICOS_WORK_ITEM_PARALLEL: '0' },
    { CLINICOS_WORK_ITEM_PARALLEL: '3' },
    { CLINICOS_WORK_ITEM_PARALLEL: '1.5' },
  ])
    assert.throws(() => workItemConfiguration(env));
});

test('Claude execution child strips service credentials and requires its exact local CLI and profile', async (t) => {
  const f = await fixture(t);
  const profile = path.join(f.root, 'personal-claude-profile');
  const executable = path.join(f.root, 'claude-fixture.js');
  await mkdir(profile);
  await writeFile(
    executable,
    '#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({config:process.env.CLAUDE_CONFIG_DIR,api:process.env.ANTHROPIC_API_KEY,oauth:process.env.CLAUDE_CODE_OAUTH_TOKEN,gh:process.env.GH_TOKEN,github:process.env.GITHUB_TOKEN,codex:process.env.CODEX_API_KEY}));\n',
  );
  await chmod(executable, 0o700);
  const env = {
    PATH: process.env.PATH,
    CLAUDE_CLI_PATH: executable,
    CLINICOS_CLAUDE_EXECUTOR_ENABLED: 'true',
    CLINICOS_CLAUDE_EXECUTOR_CONFIG_DIR: profile,
    ANTHROPIC_API_KEY: 'synthetic-api',
    CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-oauth',
    GH_TOKEN: 'synthetic-gh',
    GITHUB_TOKEN: 'synthetic-github',
    CODEX_API_KEY: 'synthetic-codex',
  };
  const child = childEnvironment('claude-execution', env, f.runtimeRoot);
  assert.equal(child.CLAUDE_CONFIG_DIR, profile);
  for (const key of [
    'ANTHROPIC_API_KEY',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'GH_TOKEN',
    'GITHUB_TOKEN',
    'CODEX_API_KEY',
  ])
    assert.equal(child[key], undefined);

  const run = createRunner({ env, runtimeRoot: f.runtimeRoot });
  const allowed = await run({
    command: executable,
    cwd: f.cwd,
    envMode: 'claude-execution',
    claudeConfigDir: profile,
  });
  assert.equal(allowed.ok, true);
  assert.deepEqual(JSON.parse(allowed.stdout), { config: profile });
  for (const attempt of [
    { command: 'claude', claudeConfigDir: profile },
    { command: executable, claudeConfigDir: path.join(f.root, 'other-profile') },
  ]) {
    const result = await run({ ...attempt, cwd: f.cwd, envMode: 'claude-execution' });
    assert.equal(result.error, 'local-claude-executor-profile-required');
  }
  const hosted = createRunner({
    env: { ...env, GITHUB_ACTIONS: 'true' },
    runtimeRoot: f.runtimeRoot,
  });
  assert.equal(
    (
      await hosted({
        command: executable,
        cwd: f.cwd,
        envMode: 'claude-execution',
        claudeConfigDir: profile,
      })
    ).error,
    'local-claude-executor-profile-required',
  );
});

function reservation(profile) {
  return {
    profileId: profile.id,
    provider: profile.provider,
    model: profile.model,
    status: 'running',
    nonce: 'reservation-12345678',
  };
}

function codexRunner(calls) {
  return async (call) => {
    calls.push(call);
    if (call.args.includes('--version')) return { ok: true, stdout: 'codex fixture' };
    if (call.args.includes('--help')) return { ok: true, stdout: HELP_FLAGS };
    if (call.args.includes('--output-schema')) {
      const output = call.args[call.args.indexOf('--output-last-message') + 1];
      const schema = JSON.parse(
        await readFile(call.args[call.args.indexOf('--output-schema') + 1], 'utf8'),
      );
      assert.equal(schema.type, 'object');
      await writeFile(output, `${JSON.stringify(RESULT)}\n`, { flag: 'wx', mode: 0o600 });
    }
    return { ok: true, stdout: '', stderr: '' };
  };
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'work-item-models-'));
  const cwd = path.join(root, 'worktree');
  const runtimeRoot = path.join(root, 'runtime');
  await Promise.all([mkdir(cwd), mkdir(runtimeRoot)]);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, cwd, runtimeRoot };
}

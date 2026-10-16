import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
  access,
  chmod,
  symlink,
} from 'node:fs/promises';
import {
  installCron,
  replaceCronBlock,
  execute,
} from '../../../scripts/automation/install-claude-review-cron.mjs';

const id = 'a'.repeat(16);
const existing = 'MAILTO=owner@example.invalid\n17 3 * * * /usr/local/bin/backup\n';
const template = new URL('../../../scripts/automation/claude-review.crontab', import.meta.url);
async function fixture(t, options = {}) {
  const base = await mkdtemp(path.join(os.tmpdir(), 'cron-install-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, "repo ' % $(touch SHOULD_NOT_EXIST)");
  await mkdir(path.join(root, 'scripts/automation'), { recursive: true });
  await mkdir(path.join(root, 'agent-team/src/bug-pipeline'), { recursive: true });
  await writeFile(
    path.join(root, 'scripts/automation/claude-review.crontab'),
    await readFile(template),
  );
  const stateDir = path.join(base, 'private state');
  const executables = {
    node: process.execPath,
    git: '/fixture/git',
    gh: '/fixture/gh',
    claude: '/fixture/claude',
    crontab: '/fixture/crontab',
  };
  let current = existing;
  const calls = [];
  let writes = 0;
  const run = async (command, args, parameters = {}) => {
    calls.push({ command, args, input: parameters.input });
    if (command === executables.claude) {
      assert.equal(parameters.env.ANTHROPIC_API_KEY, undefined);
      assert.equal(parameters.env.CLAUDE_CODE_OAUTH_TOKEN, undefined);
      assert.equal(parameters.env.GH_TOKEN, undefined);
      assert.equal(parameters.env.OPENAI_API_KEY, undefined);
      assert.equal(parameters.env.RAILWAY_TOKEN, undefined);
      return {
        ok: true,
        stdout: JSON.stringify({
          loggedIn: true,
          authMethod: options.apiAuth ? 'api_key' : 'claude.ai',
          subscriptionType: 'max',
        }),
      };
    }
    if (command === executables.git) return { ok: true, stdout: root };
    if (command === executables.gh)
      return { ok: true, stdout: args.includes('.login') ? 'maintainer' : 'admin' };
    if (command === executables.crontab) {
      if (args[0] === '-l')
        return options.readFailure
          ? { ok: false, code: 1, stderr: 'permission denied' }
          : { ok: true, stdout: current };
      writes++;
      current = parameters.input;
      return { ok: true, stdout: '' };
    }
    throw new Error('Unexpected fake command');
  };
  const settings = {
    root,
    stateDir,
    configDir: path.join(base, 'personal config'),
    executables,
    run,
    env: {
      ANTHROPIC_API_KEY: 'synthetic-not-used',
      CLAUDE_CODE_OAUTH_TOKEN: 'synthetic-not-used',
      GH_TOKEN: 'synthetic-not-used',
      OPENAI_API_KEY: 'synthetic-not-used',
      RAILWAY_TOKEN: 'synthetic-not-used',
    },
  };
  return {
    base,
    root,
    stateDir,
    executables,
    settings,
    run,
    calls,
    current: () => current,
    setCurrent: (value) => {
      current = value;
    },
    writes: () => writes,
  };
}

test('managed crontab replacement preserves other jobs, is idempotent and removes only its own block', () => {
  const once = replaceCronBlock(existing, id, '*/5 * * * * /bin/sh /private/runner.sh');
  assert.ok(once.startsWith(existing));
  assert.equal(replaceCronBlock(once, id, '*/5 * * * * /bin/sh /private/runner.sh'), once);
  assert.equal(replaceCronBlock(once, id, null), existing);
  assert.throws(
    () => replaceCronBlock(`# BEGIN ClinicOS Claude review ${id}\n`, id, 'job'),
    /Ambiguous/,
  );
});

test('actual install verifies the resulting crontab, preserves unrelated jobs and performs no model invocation', async (t) => {
  const f = await fixture(t);
  assert.equal((await installCron(f.settings)).status, 'installed');
  assert.ok(f.current().startsWith(existing));
  assert.ok(f.current().includes('*/5 * * * *'));
  assert.equal((await installCron(f.settings)).status, 'already-installed');
  assert.equal(f.writes(), 1);
  assert.equal(
    f.calls.some((call) => call.args.includes('--print')),
    false,
  );
  assert.equal(
    (
      await installCron({
        ...f.settings,
        mode: 'remove',
        executables: { crontab: f.executables.crontab },
      })
    ).status,
    'removed',
  );
  assert.equal(f.current(), existing);
});

test('missing cron or API-only Claude authentication blocks before any schedule or launcher mutation', async (t) => {
  for (const options of [{ apiAuth: true }, {}]) {
    const f = await fixture(t, options);
    if (!options.apiAuth) f.settings.executables.crontab = null;
    const result = await installCron(f.settings);
    assert.equal(result.ready, false);
    assert.equal(result.status, 'blocked-prerequisites');
    assert.equal(f.writes(), 0);
    await assert.rejects(access(f.stateDir), { code: 'ENOENT' });
  }
});

test('an unreadable crontab is not mistaken for an empty one and check mode never writes', async (t) => {
  const denied = await fixture(t, { readFailure: true });
  await assert.rejects(installCron(denied.settings), /Cannot read/);
  assert.equal(denied.writes(), 0);
  const f = await fixture(t);
  const checked = await installCron({ ...f.settings, mode: 'check' });
  assert.equal(checked.ready, true);
  assert.equal(checked.installed, false);
  assert.equal(f.writes(), 0);
  await assert.rejects(access(f.stateDir), { code: 'ENOENT' });
});

test('generated POSIX launcher preserves exit codes, clears API tokens and quotes unusual repository paths', async (t) => {
  const f = await fixture(t);
  await installCron(f.settings);
  const marker = path.join(f.base, 'executed.json');
  await writeFile(
    path.join(f.root, 'agent-team/src/bug-pipeline/claude-review-cron.mjs'),
    `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(marker)}, JSON.stringify({cwd:process.cwd(),api:!!process.env.ANTHROPIC_API_KEY,oauth:!!process.env.CLAUDE_CODE_OAUTH_TOKEN})); process.exit(7);`,
  );
  const launcher = (await readdir(f.stateDir)).find((name) => name.startsWith('runner-'));
  const result = await execute('/bin/sh', [path.join(f.stateDir, launcher)], {
    env: { ...process.env, ANTHROPIC_API_KEY: 'synthetic', CLAUDE_CODE_OAUTH_TOKEN: 'synthetic' },
  });
  assert.equal(result.code, 7);
  assert.deepEqual(JSON.parse(await readFile(marker, 'utf8')), {
    cwd: f.root,
    api: false,
    oauth: false,
  });
  await assert.rejects(access(path.join(f.root, 'SHOULD_NOT_EXIST')), { code: 'ENOENT' });
  await assert.rejects(access(path.join(f.stateDir, 'cron.lock')), { code: 'ENOENT' });
  // A prior live/interrupted lock is preserved and prevents overlapping execution.
  await rm(marker);
  await mkdir(path.join(f.stateDir, 'cron.lock'));
  assert.equal((await execute('/bin/sh', [path.join(f.stateDir, launcher)])).code, 0);
  await assert.rejects(access(marker), { code: 'ENOENT' });
  await access(path.join(f.stateDir, 'cron.lock'));
});

test('concurrent crontab edits prevent overwrite and cron percent escaping stays separate from shell quoting', async (t) => {
  const f = await fixture(t);
  let reads = 0;
  const run = async (command, args, options) => {
    if (command === f.executables.crontab && args[0] === '-l' && ++reads === 2)
      return { ok: true, stdout: `${existing}0 1 * * * /new-user-job\n` };
    return f.run(command, args, options);
  };
  await assert.rejects(installCron({ ...f.settings, run }), /changed concurrently/);
  assert.equal(f.writes(), 0);
  const withPercent = { ...f.settings, stateDir: path.join(f.base, 'state % percent') };
  await installCron(withPercent);
  assert.match(f.current(), /state \\% percent/);
});

test('read-only check verifies the exact schedule, complete markers and actual private launcher', async (t) => {
  const f = await fixture(t);
  await installCron(f.settings);
  const installed = f.current();
  assert.equal((await installCron({ ...f.settings, mode: 'check' })).installed, true);
  for (const changed of [
    installed.replace('# END ClinicOS', '# MISSING ClinicOS'),
    installed.replace('*/5 * * * *', '*/9 * * * *'),
    installed.replace('2>&1', '2>&1; /unexpected'),
  ]) {
    f.setCurrent(changed);
    await assert.rejects(
      installCron({ ...f.settings, mode: 'check' }),
      /Ambiguous|command differs/,
    );
    assert.equal(f.current(), changed);
  }
  f.setCurrent(installed);
  const launcher = path.join(
    f.stateDir,
    (await readdir(f.stateDir)).find((name) => name.startsWith('runner-')),
  );
  await writeFile(launcher, '# altered launcher');
  await assert.rejects(installCron({ ...f.settings, mode: 'check' }), /launcher differs/);
  assert.equal(f.writes(), 1);
});

test('existing state, launcher and log must remain private regular owned files', async (t) => {
  for (const target of ['directory', 'launcher', 'log', 'symlink']) {
    const f = await fixture(t);
    await installCron(f.settings);
    const file =
      target === 'directory'
        ? f.stateDir
        : target === 'launcher'
          ? path.join(
              f.stateDir,
              (await readdir(f.stateDir)).find((name) => name.startsWith('runner-')),
            )
          : path.join(f.stateDir, 'cron.log');
    if (target === 'symlink') {
      await rm(file);
      await symlink(path.join(f.base, 'external-log'), file);
    } else await chmod(file, target === 'directory' ? 0o755 : 0o644);
    await assert.rejects(installCron({ ...f.settings, mode: 'check' }), /private, owned/);
    await assert.rejects(installCron(f.settings), /private, owned/);
    assert.equal(f.writes(), 1);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, realpath, readFile, writeFile, rm, access, link } from 'node:fs/promises';
import {
  installWindows,
  taskPlan,
  taskIdentity,
  taskScript,
  psQuote,
} from '../../../scripts/automation/install-claude-review-windows.mjs';
import { runWindowsReview } from '../../../scripts/automation/run-claude-review-windows.mjs';
import { execute } from '../../../scripts/automation/install-claude-review-cron.mjs';
import { createRunner, childEnvironment } from '../../src/bug-pipeline/process.mjs';

async function fixture(t, { api = false } = {}) {
  const base = await realpath(await mkdtemp(path.join(os.tmpdir(), 'windows-review-')));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, "repo à ' & spaces");
  await mkdir(root);
  const stateDir = path.join(base, 'private state');
  const executables = {
    node: process.execPath,
    claude: path.join(base, 'claude.js'),
    gh: path.join(base, 'gh.exe'),
    git: path.join(base, 'git.exe'),
    powershell: path.join(base, 'powershell.exe'),
  };
  const configDir = path.join(base, 'personal config');
  const plan = taskPlan({
    root,
    configFile: path.join(stateDir, 'config.json'),
    node: process.execPath,
  });
  let task = null,
    mutations = 0;
  const calls = [];
  const run = async (command, args, options = {}) => {
    calls.push({ command, args, options });
    if (command === executables.claude) {
      assert.equal(options.env.GH_TOKEN, undefined);
      return {
        ok: true,
        stdout: JSON.stringify({
          loggedIn: true,
          authMethod: api ? 'api_key' : 'claude.ai',
          subscriptionType: 'max',
        }),
      };
    }
    if (command === executables.git) return { ok: true, stdout: root };
    if (command === executables.gh)
      return { ok: true, stdout: args.includes('.login') ? 'maintainer' : 'admin' };
    assert.equal(command, executables.powershell);
    const program = Buffer.from(args.at(-1), 'base64').toString('utf16le');
    if (program.includes('Register-ScheduledTask -TaskPath')) {
      mutations++;
      assert.equal(task, null);
      task = {
        ...plan,
        user: 'S-1-fixture',
        currentUser: 'S-1-fixture',
        logon: 'Interactive',
        runLevel: 'Limited',
        multipleInstances: 'IgnoreNew',
        interval: 'PT5M',
        triggerType: 'MSFT_TaskTimeTrigger',
        triggerEnabled: true,
        duration: '',
        endBoundary: '',
        startBoundary: new Date().toISOString(),
        enabled: true,
      };
    } else if (program.includes('Unregister-ScheduledTask -TaskPath')) {
      mutations++;
      task = null;
    } else if (program.includes('ConvertTo-Json'))
      return { ok: true, stdout: JSON.stringify(task) };
    return { ok: true, stdout: '' };
  };
  return {
    root,
    stateDir,
    base,
    plan,
    executables,
    run,
    settings: {
      root,
      stateDir,
      configDir,
      executables,
      run,
      env: { GH_TOKEN: 'synthetic-credential' },
    },
    calls,
    task: () => task,
    setTask: (value) => (task = value),
    mutations: () => mutations,
  };
}

test('Windows install verifies a single user task, preserves unrelated work and removes only the verified task', async (t) => {
  const f = await fixture(t);
  assert.equal((await installWindows({ ...f.settings, mode: 'check' })).installed, false);
  await assert.rejects(access(f.stateDir), { code: 'ENOENT' });
  assert.equal((await installWindows(f.settings)).status, 'installed');
  assert.equal((await installWindows(f.settings)).status, 'already-installed');
  assert.equal((await installWindows({ ...f.settings, mode: 'check' })).installed, true);
  assert.equal(f.mutations(), 1);
  assert.equal((await installWindows({ ...f.settings, mode: 'remove' })).status, 'removed');
  assert.equal(f.task(), null);
  assert.equal(f.mutations(), 2);
});

test('Windows prerequisites and altered existing tasks fail closed without an inference or overwrite', async (t) => {
  const blocked = await fixture(t, { api: true });
  assert.equal((await installWindows(blocked.settings)).ready, false);
  assert.equal(blocked.mutations(), 0);
  await assert.rejects(access(blocked.stateDir), { code: 'ENOENT' });
  const f = await fixture(t);
  await installWindows(f.settings);
  f.setTask({ ...f.task(), arguments: 'unexpected command' });
  await assert.rejects(installWindows({ ...f.settings, mode: 'check' }), /arguments differs/);
  await assert.rejects(installWindows({ ...f.settings, mode: 'remove' }), /arguments differs/);
  assert.equal(f.mutations(), 1);
  assert.equal(
    f.calls.some((call) => call.args.includes('--print')),
    false,
  );
});

test('Windows task read failures and concurrent registration cannot replace an existing task', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    installWindows({ ...f.settings, run: async () => ({ ok: false, stdout: '' }) }),
    /read failed/,
  );
  let reads = 0;
  const run = async (command, args, options) => {
    if (
      command === f.executables.powershell &&
      Buffer.from(args.at(-1), 'base64').toString('utf16le').includes('ConvertTo-Json') &&
      ++reads === 2
    )
      return { ok: true, stdout: JSON.stringify({ foreign: true }) };
    return f.run(command, args, options);
  };
  await assert.rejects(installWindows({ ...f.settings, run }), /created concurrently/);
  assert.equal(f.mutations(), 0);
});

test('Windows launch runs the real child, retains exit7, strips provider tokens and preserves interrupted locks', async (t) => {
  const f = await fixture(t);
  await installWindows(f.settings);
  const marker = path.join(f.base, 'result.json');
  await mkdir(path.join(f.root, 'agent-team/src/bug-pipeline'), { recursive: true });
  await writeFile(
    path.join(f.root, 'agent-team/src/bug-pipeline/claude-review-cron.mjs'),
    `import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},JSON.stringify({cwd:process.cwd(),api:!!process.env.ANTHROPIC_API_KEY,oauth:!!process.env.CLAUDE_CODE_OAUTH_TOKEN}));process.exit(7);`,
  );
  const config = path.join(f.stateDir, 'config.json');
  const result = await runWindowsReview(config, {
    env: { ...process.env, ANTHROPIC_API_KEY: 'synthetic', CLAUDE_CODE_OAUTH_TOKEN: 'synthetic' },
  });
  assert.equal(result.code, 7);
  assert.deepEqual(JSON.parse(await readFile(marker, 'utf8')), {
    cwd: f.root,
    api: false,
    oauth: false,
  });
  await assert.rejects(access(path.join(f.stateDir, 'review.lock')), { code: 'ENOENT' });
  await rm(marker);
  await writeFile(path.join(f.stateDir, 'review.lock'), 'interrupted');
  assert.equal((await runWindowsReview(config)).status, 'already-running');
  await assert.rejects(access(marker), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(f.stateDir, 'review.lock'), 'utf8'), 'interrupted');
});

test('npm Claude entrypoints execute with Node without a shell and reviewer credentials remain isolated', async (t) => {
  const f = await fixture(t);
  await writeFile(
    f.executables.claude,
    `process.stdout.write(JSON.stringify({args:process.argv.slice(2),gh:!!process.env.GH_TOKEN,api:!!process.env.ANTHROPIC_API_KEY}));`,
  );
  assert.equal((await execute(f.executables.claude, ['auth', 'status'])).ok, true);
  const runner = createRunner({
    env: {
      ...process.env,
      CLAUDE_CLI_PATH: f.executables.claude,
      GH_TOKEN: 'synthetic',
      ANTHROPIC_API_KEY: 'synthetic',
      CLAUDE_REVIEW_AUTH_MODE: 'subscription-local',
      CLINICOS_CLAUDE_CONFIG_DIR: path.join(f.base, 'max'),
    },
    runtimeRoot: path.join(f.base, 'runtime'),
  });
  const result = await runner({
    command: 'claude',
    args: ['auth', 'status'],
    cwd: f.root,
    envMode: 'review',
  });
  assert.equal(result.ok, true, result.stderr || result.error);
  assert.deepEqual(JSON.parse(result.stdout), { args: ['auth', 'status'], gh: false, api: false });
  const child = childEnvironment(
    'review',
    { ...process.env, GH_TOKEN: 'synthetic', CLAUDE_REVIEW_AUTH_MODE: 'subscription-local' },
    path.join(f.base, 'env'),
  );
  assert.equal(child.GH_TOKEN, undefined);
  if (process.platform === 'win32') assert.equal(child.SystemRoot, process.env.SystemRoot);
});

test(
  'PowerShell scheduler definitions parse on Windows and use actual task action/trigger/principal objects',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const f = await fixture(t);
    const scripts = ['read', 'install', 'remove', 'privacy', 'secure', 'secure-config'].map(
      (operation) =>
        taskScript(operation, { name: taskIdentity(f.root), plan: f.plan, stateDir: f.stateDir }),
    );
    const bootstrap = await readFile(
      new URL('../../../scripts/automation/setup-claude-review-windows.ps1', import.meta.url),
      'utf8',
    );
    for (const script of scripts.concat(bootstrap)) {
      const parse = `$tokens=$null;$errors=$null;[void][System.Management.Automation.Language.Parser]::ParseInput([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(script, 'utf8').toString('base64')}')),[ref]$tokens,[ref]$errors);if($errors.Count){throw 'Parse error'}`;
      const native = await execute('powershell.exe', [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(parse, 'utf16le').toString('base64'),
      ]);
      assert.equal(native.ok, true, native.stderr);
    }
    // Create native objects and serialize the real schema; no scheduled task is registered.
    const program = `$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $a=New-ScheduledTaskAction -Execute ${psQuote(process.execPath)} -Argument ${psQuote(f.plan.arguments)} -WorkingDirectory ${psQuote(f.root)}; $t=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5);$p=New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value) -LogonType Interactive -RunLevel Limited;$s=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew;@{arguments=$a.Arguments;interval=$t.Repetition.Interval;logon=[string]$p.LogonType;level=[string]$p.RunLevel;overlap=[string]$s.MultipleInstances;duration=[string]$t.Repetition.Duration;triggerType=[string]$t.CimClass.CimClassName;triggerEnabled=[bool]$t.Enabled;endBoundary=[string]$t.EndBoundary}|ConvertTo-Json -Compress`;
    const result = await execute('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(program, 'utf16le').toString('base64'),
    ]);
    assert.equal(result.ok, true, result.stderr);
    const value = JSON.parse(result.stdout);
    assert.deepEqual(value, {
      arguments: f.plan.arguments,
      interval: 'PT5M',
      logon: 'Interactive',
      level: 'Limited',
      overlap: 'IgnoreNew',
      duration: '',
      triggerType: 'MSFT_TaskTimeTrigger',
      triggerEnabled: true,
      endBoundary: '',
    });
  },
);

test(
  'native Windows ACL creation is private and rejects a later public access rule',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const f = await fixture(t);
    await mkdir(f.stateDir);
    const config = path.join(f.stateDir, 'config.json');
    const parameters = { name: taskIdentity(f.root), plan: f.plan, stateDir: f.stateDir };
    const ps = (program) =>
      execute(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          '-EncodedCommand',
          Buffer.from(program, 'utf16le').toString('base64'),
        ],
        { env: { ...process.env, PSModulePath: path.join(f.base, 'wrong-powershell-edition') } },
      );
    const secure = await ps(taskScript('secure', parameters));
    assert.equal(secure.ok, true, secure.stderr);
    await writeFile(config, '{}');
    const secureConfig = await ps(taskScript('secure-config', parameters));
    assert.equal(secureConfig.ok, true, secureConfig.stderr);
    const privateResult = await ps(taskScript('privacy', parameters));
    assert.equal(privateResult.ok, true, privateResult.stderr);
    const change = await ps(
      `$ErrorActionPreference='Stop';$file=${psQuote(config)};$before=Get-Acl -LiteralPath $file;$acl=[IO.File]::GetAccessControl($file,[System.Security.AccessControl.AccessControlSections]::Access);$world=[System.Security.Principal.SecurityIdentifier]::new('S-1-1-0');$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($world,'Read','Allow'));[IO.File]::SetAccessControl($file,$acl);$after=Get-Acl -LiteralPath $file;if($before.Owner -ne $after.Owner -or $before.AreAccessRulesProtected -ne $after.AreAccessRulesProtected){throw 'DACL mutation changed owner or inheritance'}`,
    );
    assert.equal(change.ok, true, change.stderr);
    const publicResult = await ps(taskScript('privacy', parameters));
    assert.equal(publicResult.ok, false);
    assert.match(publicResult.stderr, /Non-private scheduler state/);
  },
);

test(
  'native Windows bootstrap preserves dirty, foreign, wrong-branch and diverged work and fast-forwards only its dedicated checkout',
  { skip: process.platform !== 'win32' },
  async (t) => {
    const f = await fixture(t);
    const source = path.join(f.base, 'source');
    const policyArgs = ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', "@('MachinePolicy','UserPolicy','LocalMachine','CurrentUser') | ForEach-Object { [string](Get-ExecutionPolicy -Scope $_) } | ConvertTo-Json -Compress"];
    const policyBefore = await execute('powershell.exe', policyArgs);
    assert.equal(policyBefore.ok, true, policyBefore.stderr);
    const git = async (args, env = process.env) => {
      const result = await execute('git.exe', args, { env });
      assert.equal(result.ok, true, result.stderr);
      return result.stdout.trim();
    };
    const branch = 'codex/windows-claude-review';
    await git(['init', '--initial-branch', branch, source]);
    await git(['-C', source, 'config', 'user.name', 'Synthetic Windows QA']);
    await git(['-C', source, 'config', 'user.email', 'windows-qa@example.invalid']);
    await mkdir(path.join(source, 'scripts/automation'), { recursive: true });
    await writeFile(
      path.join(source, 'scripts/automation/install-claude-review-windows.mjs'),
      '// synthetic installer boundary',
    );
    await git(['-C', source, 'add', '.']);
    await git(['-C', source, '-c', 'core.hooksPath=NUL', 'commit', '-m', 'initial fixture']);
    const globalConfig = path.join(f.base, 'gitconfig');
    await writeFile(
      globalConfig,
      `[url "${source.replaceAll('\\', '/')}"]\n  insteadOf = https://github.com/l2v-hub/ClinicOS.git\n`,
    );
    const fakeGh = path.join(f.base, 'fake-gh.ps1');
    const fakeNode = path.join(f.base, 'fake-node.ps1');
    await writeFile(fakeGh, "Write-Output 'l2v-hub/ClinicOS'\n$global:LASTEXITCODE=0\n");
    await writeFile(
      fakeNode,
      "[IO.File]::WriteAllText($env:QA_NODE_MARKER,($args -join '|'))\n$global:LASTEXITCODE=0\n",
    );
    const gitPath = (await execute('where.exe', ['git.exe'])).stdout.trim().split(/\r?\n/)[0];
    // fileURLToPath handles escaped/non-ASCII checkout roots correctly below.
    const { fileURLToPath } = await import('node:url');
    const scriptFile = fileURLToPath(
      new URL('../../../scripts/automation/setup-claude-review-windows.ps1', import.meta.url),
    );
    for (const scenario of [
      'nonrepo',
      'dirty',
      'wrong-branch',
      'foreign',
      'diverged',
      'local-only',
      'clean',
    ]) {
      const destination = path.join(f.base, scenario);
      const marker = path.join(f.base, `${scenario}-node.txt`);
      if (scenario === 'nonrepo') await mkdir(destination);
      else {
        await git(['clone', '--quiet', source, destination]);
        await git([
          '-C',
          destination,
          'remote',
          'set-url',
          'origin',
          'https://github.com/l2v-hub/ClinicOS.git',
        ]);
        await git(['-C', destination, 'config', 'user.name', 'Synthetic Windows QA']);
        await git(['-C', destination, 'config', 'user.email', 'windows-qa@example.invalid']);
      }
      if (['nonrepo', 'dirty'].includes(scenario))
        await writeFile(path.join(destination, 'keep-local.txt'), 'preserve user work');
      if (scenario === 'wrong-branch') await git(['-C', destination, 'switch', '-c', 'user/work']);
      if (scenario === 'foreign')
        await git([
          '-C',
          destination,
          'remote',
          'set-url',
          'origin',
          'https://github.com/example/foreign.git',
        ]);
      if (['diverged', 'local-only'].includes(scenario)) {
        await writeFile(path.join(destination, 'local.txt'), 'local commit');
        await git(['-C', destination, 'add', '.']);
        await git(['-C', destination, '-c', 'core.hooksPath=NUL', 'commit', '-m', 'local-only']);
      }
      if (['diverged', 'clean'].includes(scenario)) {
        await writeFile(path.join(source, `upstream-${scenario}.txt`), 'upstream change');
        await git(['-C', source, 'add', '.']);
        await git([
          '-C',
          source,
          '-c',
          'core.hooksPath=NUL',
          'commit',
          '-m',
          `upstream ${scenario}`,
        ]);
      }
      const before =
        scenario === 'nonrepo' ? null : await git(['-C', destination, 'rev-parse', 'HEAD']);
      const program = `$ErrorActionPreference='Stop';function global:Get-Command {param($Name,$ErrorAction);switch($Name){'gh.exe'{[pscustomobject]@{Source=${psQuote(fakeGh)}}}'node.exe'{[pscustomobject]@{Source=${psQuote(fakeNode)}}}'git.exe'{[pscustomobject]@{Source=${psQuote(gitPath)}}}default{throw 'Unexpected command'}}};try { & ${psQuote(scriptFile)} -Destination ${psQuote(destination)}; Write-Output 'BOOTSTRAP_OK' }catch{Write-Output ('BOOTSTRAP_BLOCKED: ' + $_.Exception.Message);exit 9}`;
      const result = await execute(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-NonInteractive',
          // Only this synthetic child allows local scripts; never change user/machine policy.
          '-ExecutionPolicy',
          'RemoteSigned',
          '-EncodedCommand',
          Buffer.from(program, 'utf16le').toString('base64'),
        ],
        { env: { ...process.env, GIT_CONFIG_GLOBAL: globalConfig, QA_NODE_MARKER: marker } },
      );
      if (scenario === 'clean') {
        assert.equal(result.ok, true, result.stderr || result.stdout);
        assert.equal(
          await git(['-C', destination, 'rev-parse', 'HEAD']),
          await git(['-C', source, 'rev-parse', 'HEAD']),
        );
        await access(marker);
      } else {
        assert.equal(result.code, 9, scenario);
        const reason = {
          nonrepo: /not.*(git repository|dedicated checkout)/i,
          dirty: /local changes/i,
          'wrong-branch': /another branch/i,
          foreign: /checkout origin/i,
          diverged: /fast-forward/i,
          'local-only': /local-only commits/i,
        }[scenario];
        assert.match(result.stdout, reason, scenario);
        await assert.rejects(access(marker), { code: 'ENOENT' });
        if (before)
          assert.equal(await git(['-C', destination, 'rev-parse', 'HEAD']), before, scenario);
        if (['nonrepo', 'dirty'].includes(scenario))
          assert.equal(
            await readFile(path.join(destination, 'keep-local.txt'), 'utf8'),
            'preserve user work',
          );
      }
    }
    const policyAfter = await execute('powershell.exe', policyArgs);
    assert.equal(policyAfter.ok, true, policyAfter.stderr);
    assert.equal(policyAfter.stdout, policyBefore.stdout, 'Global/GPO execution policies changed');
  },
);

test('existing Windows state is inspected before any ACL write and malformed schedules fail closed', async (t) => {
  const f = await fixture(t);
  await mkdir(f.stateDir);
  await writeFile(path.join(f.stateDir, 'config.json'), 'foreign state');
  await assert.rejects(installWindows(f.settings), /config differs/);
  assert.equal(
    f.calls.some(
      (call) =>
        call.command === f.executables.powershell &&
        Buffer.from(call.args.at(-1), 'base64').toString('utf16le').includes('Set-Acl'),
    ),
    false,
  );
  assert.equal(await readFile(path.join(f.stateDir, 'config.json'), 'utf8'), 'foreign state');
  const valid = await fixture(t);
  await installWindows(valid.settings);
  const original = valid.task();
  for (const invalid of [
    { triggerEnabled: false },
    { duration: 'P1D' },
    { endBoundary: '2030-01-01T00:00:00' },
    { triggerType: 'MSFT_TaskLogonTrigger' },
    { startBoundary: '2099-01-01T00:00:00Z' },
  ]) {
    valid.setTask({ ...original, ...invalid });
    await assert.rejects(installWindows({ ...valid.settings, mode: 'check' }));
    assert.equal(valid.mutations(), 1);
  }
});

test('Windows installed-state check rejects hardlinked configuration consistently with the worker', async (t) => {
  const f = await fixture(t);
  await installWindows(f.settings);
  await link(path.join(f.stateDir, 'config.json'), path.join(f.base, 'another-config.json'));
  await assert.rejects(
    installWindows({ ...f.settings, mode: 'check' }),
    /Redirected scheduler config/,
  );
  await assert.rejects(runWindowsReview(path.join(f.stateDir, 'config.json')));
});

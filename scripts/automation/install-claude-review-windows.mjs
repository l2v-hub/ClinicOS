#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { mkdir, realpath, readFile, lstat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execute, findExecutable, prerequisites } from './install-claude-review-cron.mjs';

const FILE = fileURLToPath(import.meta.url);
export const psQuote = (value) => {
  assert.equal(typeof value, 'string');
  assert.ok(!/[\r\n\0]/.test(value));
  return `'${value.replaceAll("'", "''")}'`;
};
export function taskIdentity(root) {
  return `ClinicOS-ClaudeReview-${createHash('sha256').update(root.toLowerCase()).digest('hex').slice(0, 16)}`;
}
export function taskPlan({ root, configFile, node }) {
  for (const value of [root, configFile, node])
    assert.ok(path.isAbsolute(value) && !/["\r\n\0]/.test(value));
  return {
    description: `ClinicOS external Claude Max review | ${root}`,
    executable: node,
    arguments: `"${path.join(root, 'scripts/automation/run-claude-review-windows.mjs')}" "${configFile}"`,
    workingDirectory: root,
  };
}
export function taskScript(operation, { name, plan, stateDir }) {
  assert.ok(
    ['read', 'install', 'remove', 'secure', 'secure-config', 'privacy'].includes(operation),
  );
  assert.match(name, /^ClinicOS-ClaudeReview-[a-f0-9]{16}$/);
  const prelude = `$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$name = ${psQuote(name)}
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$sid = $identity.Value
`;
  const lookup = `$task = Get-ScheduledTask -TaskPath '\\' | Where-Object { $_.TaskName -eq $name }
if (@($task).Count -gt 1) { throw 'Ambiguous scheduled task' }
`;
  if (operation === 'secure')
    return (
      prelude +
      `$directory = ${psQuote(stateDir)}
$acl = New-Object System.Security.AccessControl.DirectorySecurity
$acl.SetOwner($identity)
$acl.SetAccessRuleProtection($true, $false)
$rule = [System.Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $directory -AclObject $acl
`
    );
  if (operation === 'secure-config')
    return (
      prelude +
      `$file = ${psQuote(path.join(stateDir, 'config.json'))}
$item = Get-Item -LiteralPath $file -Force
if ($item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Redirected new scheduler config' }
$acl = New-Object System.Security.AccessControl.FileSecurity
$acl.SetOwner($identity)
$acl.SetAccessRuleProtection($true, $false)
$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'Allow'))
Set-Acl -LiteralPath $file -AclObject $acl
`
    );
  if (operation === 'privacy')
    return (
      prelude +
      `$paths = @(${psQuote(stateDir)}, ${psQuote(path.join(stateDir, 'config.json'))})
foreach ($target in $paths) {
  $item = Get-Item -LiteralPath $target -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected scheduler state' }
  $acl = Get-Acl -LiteralPath $target
  if ($item.PSIsContainer -and -not $acl.AreAccessRulesProtected) { throw 'Inherited scheduler directory permissions' }
  if ($acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value -ne $sid) { throw 'Foreign state owner' }
  $rules = @($acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]))
  if ($rules.Count -eq 0) { throw 'Empty scheduler permissions' }
  foreach ($rule in $rules) {
    if ($rule.AccessControlType -ne 'Allow' -or $rule.IdentityReference.Value -ne $sid) { throw 'Non-private scheduler state' }
  }
}
`
    );
  const projection = `$actions = @($task.Actions)
$triggers = @($task.Triggers)
$user = [string]$task.Principal.UserId
if ($user -notmatch '^S-1-') { $user = ([System.Security.Principal.NTAccount]::new($user)).Translate([System.Security.Principal.SecurityIdentifier]).Value }
$record = [ordered]@{
 description = $task.Description
 executable = if ($actions.Count -eq 1) { $actions[0].Execute } else { $null }
 arguments = if ($actions.Count -eq 1) { $actions[0].Arguments } else { $null }
 workingDirectory = if ($actions.Count -eq 1) { $actions[0].WorkingDirectory } else { $null }
 user = $user
 currentUser = $sid
 logon = [string]$task.Principal.LogonType
 runLevel = [string]$task.Principal.RunLevel
 multipleInstances = [string]$task.Settings.MultipleInstances
 interval = if ($triggers.Count -eq 1) { $triggers[0].Repetition.Interval } else { $null }
 triggerType = if ($triggers.Count -eq 1) { $triggers[0].CimClass.CimClassName } else { $null }
 triggerEnabled = ($triggers.Count -eq 1 -and [bool]$triggers[0].Enabled)
 duration = if ($triggers.Count -eq 1) { [string]$triggers[0].Repetition.Duration } else { $null }
 endBoundary = if ($triggers.Count -eq 1) { [string]$triggers[0].EndBoundary } else { $null }
 startBoundary = if ($triggers.Count -eq 1) { [string]$triggers[0].StartBoundary } else { $null }
 enabled = ([bool]$task.Settings.Enabled -and [string]$task.State -ne 'Disabled')
}
`;
  if (operation === 'read')
    return (
      prelude +
      lookup +
      `if ($null -eq $task) { Write-Output 'null'; exit 0 }\n` +
      projection +
      '$record | ConvertTo-Json -Compress\n'
    );
  if (operation === 'remove')
    return (
      prelude +
      lookup +
      `if ($null -eq $task) { exit 0 }\n` +
      projection +
      `
if ($record.description -ne ${psQuote(plan.description)} -or $record.executable -ne ${psQuote(plan.executable)} -or $record.arguments -cne ${psQuote(plan.arguments)} -or $record.workingDirectory -ne ${psQuote(plan.workingDirectory)} -or $record.user -ne $sid -or $record.logon -ne 'Interactive' -or $record.runLevel -ne 'Limited' -or $record.multipleInstances -ne 'IgnoreNew' -or $record.interval -ne 'PT5M' -or $record.triggerType -ne 'MSFT_TaskTimeTrigger' -or -not $record.triggerEnabled -or $record.duration -or $record.endBoundary -or -not $record.enabled -or -not $record.startBoundary -or [DateTime]::Parse($record.startBoundary).ToUniversalTime() -gt [DateTime]::UtcNow.AddMinutes(5)) { throw 'Scheduled task changed; preserve it' }
Unregister-ScheduledTask -TaskPath '\\' -TaskName $name -Confirm:$false
`
    );
  return (
    prelude +
    lookup +
    `if ($null -ne $task) { throw 'Existing task must be checked before replacement' }
$action = New-ScheduledTaskAction -Execute ${psQuote(plan.executable)} -Argument ${psQuote(plan.arguments)} -WorkingDirectory ${psQuote(plan.workingDirectory)}
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId $sid -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskPath '\\' -TaskName $name -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description ${psQuote(plan.description)} | Out-Null
`
  );
}
export function verifyTask(task, plan) {
  assert.ok(task && task.enabled === true, 'Task missing or disabled');
  for (const key of ['description', 'executable', 'arguments', 'workingDirectory'])
    assert.equal(task[key], plan[key], `Scheduled ${key} differs`);
  assert.equal(task.user, task.currentUser, 'Scheduled user differs');
  assert.equal(task.logon, 'Interactive');
  assert.equal(task.runLevel, 'Limited');
  assert.equal(task.multipleInstances, 'IgnoreNew');
  assert.equal(task.interval, 'PT5M');
  assert.equal(task.triggerType, 'MSFT_TaskTimeTrigger');
  assert.equal(task.triggerEnabled, true);
  assert.equal(task.duration, '');
  assert.equal(task.endBoundary, '');
  assert.ok(
    typeof task.startBoundary === 'string' &&
      Number.isFinite(Date.parse(task.startBoundary)) &&
      Date.parse(task.startBoundary) <= Date.now() + 300000,
    'Invalid or distant task start',
  );
}
export async function installWindows({
  root,
  stateDir,
  configDir,
  executables,
  env = process.env,
  run = execute,
  mode = 'install',
}) {
  assert.ok(['install', 'check', 'remove'].includes(mode));
  root = await realpath(root);
  const name = taskIdentity(root);
  const configFile = path.join(stateDir, 'config.json');
  const plan = taskPlan({ root, configFile, node: executables.node });
  const invoke = async (operation) => {
    const response = await run(
      executables.powershell,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(taskScript(operation, { name, plan, stateDir }), 'utf16le').toString('base64'),
      ],
      { env, cwd: root },
    );
    assert.equal(response.ok, true, `Scheduled task ${operation} failed; existing state preserved`);
    return response.stdout;
  };
  if (!executables.powershell)
    return {
      status: 'blocked-prerequisites',
      ready: false,
      installed: false,
      checks: { powershell: false },
    };
  const task = JSON.parse((await invoke('read')).trim());
  if (task) verifyTask(task, plan);
  if (mode === 'remove') {
    if (task) await invoke('remove');
    assert.equal(
      JSON.parse((await invoke('read')).trim()),
      null,
      'Task removal could not be verified',
    );
    return { status: task ? 'removed' : 'already-removed', ready: true, installed: false };
  }
  const report = await prerequisites({ root, configDir, executables, run, env });
  if (!report.ready) return { status: 'blocked-prerequisites', ...report, installed: false };
  const config = JSON.stringify({
    root,
    configDir,
    claude: executables.claude,
    gh: executables.gh,
    git: executables.git,
  });
  const verifyState = async () => {
    const directory = await lstat(stateDir);
    const file = await lstat(configFile);
    assert.ok(directory.isDirectory() && !directory.isSymbolicLink());
    assert.equal(await realpath(stateDir), stateDir, 'Redirected scheduler directory');
    assert.ok(
      file.isFile() && !file.isSymbolicLink() && file.nlink === 1,
      'Redirected scheduler config',
    );
    await invoke('privacy');
    assert.equal(await readFile(configFile, 'utf8'), config, 'Scheduler config differs; preserved');
  };
  if (task) {
    await verifyState();
    return { status: 'already-installed', ...report, installed: true, name };
  }
  if (mode === 'check') return { status: 'prerequisites-ready', ...report, installed: false, name };
  await mkdir(path.dirname(stateDir), { recursive: true });
  let created = false;
  try {
    await mkdir(stateDir);
    created = true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  if (created) {
    assert.equal((await lstat(stateDir)).isSymbolicLink(), false);
    await invoke('secure');
    await writeFile(configFile, config, { flag: 'wx' });
    const fresh = await lstat(configFile);
    assert.ok(fresh.isFile() && !fresh.isSymbolicLink() && fresh.nlink === 1);
    await invoke('secure-config');
  }
  // Existing directories/config must pass inspection before any ACL or file mutation.
  await verifyState();
  // Re-read immediately before registration; never force-overwrite an unrelated task.
  assert.equal(
    JSON.parse((await invoke('read')).trim()),
    null,
    'Task created concurrently; nothing replaced',
  );
  await invoke('install');
  verifyTask(JSON.parse((await invoke('read')).trim()), plan);
  return { status: 'installed', ...report, installed: true, name, intervalMinutes: 5, stateDir };
}

async function windowsClaude(search) {
  const native = await findExecutable('claude.exe', search);
  if (native) return native;
  for (const directory of search.split(path.delimiter).filter(Boolean)) {
    const cli = path.join(directory, 'node_modules/@anthropic-ai/claude-code/cli.js');
    try {
      const pkg = JSON.parse(
        await readFile(
          path.join(directory, 'node_modules/@anthropic-ai/claude-code/package.json'),
          'utf8',
        ),
      );
      if (pkg.name === '@anthropic-ai/claude-code' && (await lstat(cli)).isFile()) return cli;
    } catch {
      /* next npm/native install */
    }
  }
  return null;
}
if (process.argv[1] && path.resolve(process.argv[1]) === FILE) {
  try {
    assert.equal(process.platform, 'win32', 'Use the POSIX installer on Linux/macOS');
    const flags = process.argv.slice(2);
    assert.ok(flags.length <= 1 && flags.every((flag) => ['--check', '--remove'].includes(flag)));
    const root = await realpath(path.resolve(path.dirname(FILE), '../..'));
    const executables = { node: process.execPath };
    for (const name of ['gh', 'git', 'powershell'])
      executables[name] = await findExecutable(`${name}.exe`, process.env.PATH || '');
    executables.claude =
      process.env.CLAUDE_CLI_PATH || (await windowsClaude(process.env.PATH || ''));
    const stateDir = path.join(
      process.env.LOCALAPPDATA || os.homedir(),
      'ClinicOS/claude-review',
      taskIdentity(root),
    );
    const report = await installWindows({
      root,
      stateDir,
      configDir: path.resolve(
        process.env.CLINICOS_CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'),
      ),
      executables,
      mode: flags.includes('--remove') ? 'remove' : flags.includes('--check') ? 'check' : 'install',
    });
    console.log(JSON.stringify(report));
    process.exitCode = report.ready ? 0 : 1;
  } catch {
    console.error(
      'Windows review setup blocked. Existing files/tasks preserved. Check Claude Max login, GitHub access and Task Scheduler; no credentials are copied.',
    );
    process.exitCode = 1;
  }
}

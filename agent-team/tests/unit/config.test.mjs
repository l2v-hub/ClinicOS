import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadConfig, validateConfig } from '../../src/core/config.mjs';

test('loadConfig loads versioned defaults and resolves repository paths', async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), 'agent-team-config-'));
  await mkdir(path.join(repoRoot, 'agent-team', 'config'), { recursive: true });
  await writeFile(
    path.join(repoRoot, 'agent-team', 'config', 'default.json'),
    JSON.stringify({
      schemaVersion: 1,
      repository: 'l2v-hub/ClinicOS',
      baseBranch: 'origin/main',
      pollIntervalMs: 15000,
      heartbeatTimeoutMs: 45000,
      leaseDurationMs: 300000,
      leaseRefreshMs: 60000,
      developmentConcurrency: 1,
      qaConcurrency: 1,
      noProgressLimit: 3,
      worktreeRoot: 'agent-team/.worktrees',
      artifactRoot: 'artifacts/task-validation',
      runtimeRoot: 'agent-team/.runtime',
      commandTimeoutMs: 120000,
      maxOutputBytes: 1048576,
      developmentTimeoutMs: 5400000,
      qaTimeoutMs: 3600000,
      tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'],
      allowedTools: ['Read', 'Edit', 'Bash(git *)'],
      disallowedTools: [
        'Task',
        'Agent',
        'Bash(claude)',
        'Bash(claude *)',
        'Bash(claude.exe)',
        'Bash(claude.exe *)',
        'Bash(npx claude)',
        'Bash(npx claude *)',
        'Bash(npx @anthropic-ai/claude-code)',
        'Bash(npx @anthropic-ai/claude-code *)',
      ],
      labels: {
        readyForDev: 'ready-for-dev',
        assignedToClaude: 'assigned-to-claude',
        working: 'agent-working',
        readyForQa: 'ready-for-qa',
        qaPassed: 'qa-passed',
        qaFailed: 'qa-failed',
        blocked: 'blocked',
      },
    }),
  );
  const config = await loadConfig({ repoRoot, env: {} });
  assert.equal(config.baseBranch, 'origin/main');
  assert.equal(config.noProgressLimit, 3);
  assert.equal(config.worktreeRoot, path.join(repoRoot, 'agent-team', '.worktrees'));
  assert.equal(config.tools.includes('Task'), false);
  assert.equal(config.disallowedTools.includes('Task'), true);
});

test('validateConfig fails closed for unknown keys and unsafe relationships', () => {
  assert.throws(
    () => validateConfig({ schemaVersion: 1, unexpected: true }),
    /unknown config key: unexpected/,
  );
  assert.throws(
    () =>
      validateConfig({
        schemaVersion: 1,
        repository: 'l2v-hub/ClinicOS',
        baseBranch: 'origin/main',
        pollIntervalMs: 1000,
        heartbeatTimeoutMs: 1000,
        leaseDurationMs: 5000,
        leaseRefreshMs: 5000,
        developmentConcurrency: 1,
        qaConcurrency: 1,
        noProgressLimit: 3,
        worktreeRoot: 'agent-team/.worktrees',
        artifactRoot: 'artifacts/task-validation',
        runtimeRoot: 'agent-team/.runtime',
        commandTimeoutMs: 1000,
        maxOutputBytes: 1000,
        developmentTimeoutMs: 5400000,
        qaTimeoutMs: 3600000,
        tools: ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash'],
        allowedTools: ['Read'],
        disallowedTools: [
          'Task',
          'Agent',
          'Bash(claude)',
          'Bash(claude *)',
          'Bash(claude.exe)',
          'Bash(claude.exe *)',
          'Bash(npx claude)',
          'Bash(npx claude *)',
          'Bash(npx @anthropic-ai/claude-code)',
          'Bash(npx @anthropic-ai/claude-code *)',
        ],
        labels: {
          readyForDev: 'ready-for-dev',
          assignedToClaude: 'assigned-to-claude',
          working: 'agent-working',
          readyForQa: 'ready-for-qa',
          qaPassed: 'qa-passed',
          qaFailed: 'qa-failed',
          blocked: 'blocked',
        },
      }),
    /leaseRefreshMs must be less than leaseDurationMs/,
  );
});

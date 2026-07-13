import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateWorkerToolPolicy } from './worker-policy.mjs';

const KEYS = ['schemaVersion', 'repository', 'baseBranch', 'pollIntervalMs', 'heartbeatTimeoutMs', 'leaseDurationMs', 'leaseRefreshMs', 'developmentConcurrency', 'qaConcurrency', 'noProgressLimit', 'worktreeRoot', 'artifactRoot', 'runtimeRoot', 'commandTimeoutMs', 'maxOutputBytes', 'developmentTimeoutMs', 'qaTimeoutMs', 'tools', 'allowedTools', 'disallowedTools', 'labels'];
const LABEL_KEYS = ['readyForDev', 'assignedToClaude', 'working', 'readyForQa', 'qaPassed', 'qaFailed', 'blocked'];

export function validateConfig(config) {
  for (const key of Object.keys(config)) if (!KEYS.includes(key)) throw new Error(`unknown config key: ${key}`);
  for (const key of KEYS) if (config[key] === undefined) throw new Error(`missing config key: ${key}`);
  if (config.schemaVersion !== 1) throw new Error('schemaVersion must equal 1');
  if (!/^[^/]+\/[^/]+$/.test(config.repository)) throw new Error('repository must be owner/name');
  if (config.baseBranch !== 'origin/main') throw new Error('baseBranch must be origin/main');
  if (config.leaseRefreshMs >= config.leaseDurationMs) throw new Error('leaseRefreshMs must be less than leaseDurationMs');
  if (config.noProgressLimit !== 3) throw new Error('noProgressLimit must equal 3');
  if (!Number.isInteger(config.developmentTimeoutMs) || config.developmentTimeoutMs <= config.commandTimeoutMs) throw new Error('developmentTimeoutMs must exceed commandTimeoutMs');
  if (!Number.isInteger(config.qaTimeoutMs) || config.qaTimeoutMs <= config.commandTimeoutMs) throw new Error('qaTimeoutMs must exceed commandTimeoutMs');
  if (!Array.isArray(config.allowedTools) || config.allowedTools.length === 0) throw new Error('allowedTools must be a non-empty array of scoped tool rules');
  for (const rule of config.allowedTools) {
    if (typeof rule !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*(\(.+\))?$/.test(rule)) throw new Error(`allowedTools entry must be a scoped tool rule: ${rule}`);
    if (/dangerous/i.test(rule) || /bypass/i.test(rule)) throw new Error(`allowedTools entry must not reference bypass options: ${rule}`);
  }
  // QA-263-011: the complete worker tool policy must make nested Claude execution unavailable.
  const policy = validateWorkerToolPolicy(config);
  if (!policy.ok) throw new Error(policy.errors[0]);
  for (const key of LABEL_KEYS) if (!config.labels?.[key]) throw new Error(`missing label key: ${key}`);
  for (const key of Object.keys(config.labels ?? {})) if (!LABEL_KEYS.includes(key)) throw new Error(`unknown label key: ${key}`);
  return config;
}

export async function loadConfig({ repoRoot, env = process.env }) {
  const defaultsPath = path.join(repoRoot, 'agent-team', 'config', 'default.json');
  const defaults = JSON.parse(await readFile(defaultsPath, 'utf8'));
  const localPath = env.CLINICOS_AGENT_TEAM_CONFIG;
  const local = localPath ? JSON.parse(await readFile(path.resolve(repoRoot, localPath), 'utf8')) : {};
  const config = validateConfig({ ...defaults, ...local, labels: { ...defaults.labels, ...(local.labels ?? {}) } });
  for (const key of ['worktreeRoot', 'artifactRoot', 'runtimeRoot']) config[key] = path.resolve(repoRoot, config[key]);
  return Object.freeze(config);
}

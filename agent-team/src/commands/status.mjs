import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createGitHubAdapter } from '../adapters/github.mjs';
import { runProcess } from '../adapters/process-runner.mjs';
import { buildStatusProjection } from '../core/status-projection.mjs';
import { rebuildRemediationContext } from '../core/history.mjs';

async function readLocal(config) {
  try {
    const heartbeat = JSON.parse(await readFile(path.join(config.runtimeRoot, 'heartbeat.json'), 'utf8'));
    const age = Date.now() - Date.parse(heartbeat.at);
    return { supervisor_running: age < config.heartbeatTimeoutMs, heartbeat_age_ms: age, pid: heartbeat.pid };
  } catch {
    return { supervisor_running: false, heartbeat_age_ms: null, pid: null };
  }
}

// Read-only projection: GitHub protocol comments and PR state are authoritative; local heartbeat
// only reports supervisor liveness. Never mutates GitHub or local state.
export async function run({ config, deps = {} }) {
  const github = deps.github ?? createGitHubAdapter({ run: runProcess, config });
  const local = await (deps.readLocal ?? readLocal)(config);
  const seen = new Set();
  const items = [];
  for (const label of [config.labels.working, config.labels.readyForQa, config.labels.qaFailed, config.labels.blocked]) {
    for (const listed of await github.listIssuesByLabels([label])) {
      if (seen.has(listed.number)) continue;
      seen.add(listed.number);
      const issue = await github.viewIssue(listed.number);
      const context = rebuildRemediationContext({ comments: issue.comments ?? [], issueNumber: issue.number, config });
      const pullRequest = context.lastHandoff?.pull_request_number ? await github.viewPullRequest(context.lastHandoff.pull_request_number) : null;
      items.push({ issue, pullRequest });
    }
  }
  return { ok: true, ...buildStatusProjection({ local, items, config }) };
}

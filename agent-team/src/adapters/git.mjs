import { existsSync } from 'node:fs';
import path from 'node:path';

export function createGitAdapter({ run, config }) {
  const invoke = async (args, cwd = process.cwd()) => {
    const result = await run({ command: 'git', args, cwd, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
    if (!result.ok) throw new Error(result.error || result.stderr);
    return result.stdout.trim();
  };

  // QA-263-013: recorded coordinates are only trusted when the directory exists, is checked
  // out on the expected branch, and belongs to the expected repository.
  const isValidWorktree = async (worktreePath, branch) => {
    if (!existsSync(worktreePath)) return false;
    try {
      if (await invoke(['rev-parse', '--abbrev-ref', 'HEAD'], worktreePath) !== branch) return false;
      return (await invoke(['remote', 'get-url', 'origin'], worktreePath)).includes(config.repository);
    } catch { return false; }
  };

  const findWorktreeForBranch = async (branch) => {
    let current = null;
    for (const line of (await invoke(['worktree', 'list', '--porcelain'])).split(/\r?\n/)) {
      if (line.startsWith('worktree ')) current = line.slice('worktree '.length).trim();
      else if (current && line.trim() === `branch refs/heads/${branch}`) return current;
    }
    return null;
  };

  const hasLocalBranch = async (branch) => {
    try { await invoke(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]); return true; } catch { return false; }
  };

  return {
    async prepareIssueWorktree({ issue, prior }) {
      if (prior?.worktree_path && prior?.branch) {
        const coordinates = { path: prior.worktree_path, branch: prior.branch, pullRequestNumber: prior.pull_request_number };
        if (await isValidWorktree(prior.worktree_path, prior.branch)) return coordinates;
        // Stale or foreign coordinates. Never destroy: reuse any live checkout of the branch,
        // otherwise prune dead registrations and recreate from the existing branch. Occupied
        // directories or missing branches make `worktree add` fail closed.
        const existing = await findWorktreeForBranch(prior.branch);
        if (existing && existsSync(existing)) return { ...coordinates, path: existing };
        await invoke(['worktree', 'prune']);
        await invoke(['fetch', 'origin']);
        if (await hasLocalBranch(prior.branch)) await invoke(['worktree', 'add', prior.worktree_path, prior.branch]);
        else await invoke(['worktree', 'add', prior.worktree_path, '-b', prior.branch, `origin/${prior.branch}`]);
        return coordinates;
      }
      const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
      const branch = `codex/issue-${issue.number}-${slug}`;
      const worktreePath = path.join(config.worktreeRoot, `issue-${issue.number}`);
      await invoke(['fetch', 'origin']);
      await invoke(['worktree', 'add', worktreePath, '-b', branch, config.baseBranch]);
      return { path: worktreePath, branch, pullRequestNumber: null };
    },
    async headSha(cwd) { return invoke(['rev-parse', 'HEAD'], cwd); },
    async changedFiles(cwd) { return (await invoke(['diff', '--name-only', `${config.baseBranch}...HEAD`], cwd)).split(/\r?\n/).filter(Boolean); },
    async blobSha(cwd, ref, filePath) { return invoke(['rev-parse', `${ref}:${filePath}`], cwd); },
    // Raw committed content: no sanitization, no trim — digests need exact bytes (text artifacts only).
    async showFile(cwd, ref, filePath) {
      const result = await run({ command: 'git', args: ['show', `${ref}:${filePath}`], cwd, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes, sanitize: false });
      if (!result.ok) throw new Error(result.error || result.stderr);
      return result.stdout;
    }
  };
}

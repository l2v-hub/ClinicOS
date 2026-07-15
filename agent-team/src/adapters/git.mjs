import { existsSync } from 'node:fs';
import path from 'node:path';

// QA-263-015: worktree identity comparisons must survive separator and (on Windows) case
// differences, otherwise the same checkout recorded two ways defeats the authority check.
const normalizeWorktreePath = (value) => {
  const resolved = path.resolve(value).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

export function isSameWorktreePath(a, b) {
  return normalizeWorktreePath(a) === normalizeWorktreePath(b);
}

export function createGitAdapter({ run, config }) {
  const invoke = async (args, cwd = process.cwd()) => {
    const result = await run({ command: 'git', args, cwd, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
    if (!result.ok) throw new Error(result.error || result.stderr);
    return result.stdout.trim();
  };

  const listRegisteredWorktrees = async () => {
    const entries = [];
    let current = null;
    for (const line of (await invoke(['worktree', 'list', '--porcelain'])).split(/\r?\n/)) {
      if (line.startsWith('worktree ')) { current = { path: line.slice('worktree '.length).trim(), branch: null }; entries.push(current); }
      else if (current && line.trim().startsWith('branch refs/heads/')) current.branch = line.trim().slice('branch refs/heads/'.length);
    }
    return entries;
  };

  // QA-263-013 + QA-263-015: recorded coordinates are only trusted when the directory exists,
  // is a REGISTERED worktree root, is checked out on the expected branch, and belongs to the
  // expected repository. The registration check is load-bearing: git commands executed from any
  // subdirectory resolve upward to the containing worktree, so branch/origin checks alone
  // accepted nested non-authoritative paths (the attempt-8 defect).
  const isValidWorktree = async (worktreePath, branch) => {
    if (!existsSync(worktreePath)) return false;
    try {
      if (!(await listRegisteredWorktrees()).some((entry) => isSameWorktreePath(entry.path, worktreePath))) return false;
      if (await invoke(['rev-parse', '--abbrev-ref', 'HEAD'], worktreePath) !== branch) return false;
      return (await invoke(['remote', 'get-url', 'origin'], worktreePath)).includes(config.repository);
    } catch { return false; }
  };

  const findWorktreeForBranch = async (branch) => {
    const entry = (await listRegisteredWorktrees()).find((candidate) => candidate.branch === branch);
    return entry?.path ?? null;
  };

  const hasLocalBranch = async (branch) => {
    try { await invoke(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]); return true; } catch { return false; }
  };

  const issueBranch = (issue) => {
    const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
    return `codex/issue-${issue.number}-${slug}`;
  };
  const defaultWorktreePath = (issue) => path.join(config.worktreeRoot, `issue-${issue.number}`);

  return {
    // QA-263-015: read-only resolution of the authoritative worktree, run BEFORE the GitHub
    // claim so the published claim names the exact registered checkout the worker will use.
    // A losing claimant therefore never mutates branches or worktrees.
    async resolveIssueWorktree({ issue, prior }) {
      if (prior?.worktree_path && prior?.branch) {
        const pullRequestNumber = prior.pull_request_number ?? null;
        if (await isValidWorktree(prior.worktree_path, prior.branch)) return { path: prior.worktree_path, branch: prior.branch, pullRequestNumber };
        const existing = await findWorktreeForBranch(prior.branch);
        if (existing && existsSync(existing)) return { path: existing, branch: prior.branch, pullRequestNumber };
        return { path: prior.worktree_path, branch: prior.branch, pullRequestNumber };
      }
      return { path: defaultWorktreePath(issue), branch: issueBranch(issue), pullRequestNumber: null };
    },
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
      const worktreePath = defaultWorktreePath(issue);
      await invoke(['fetch', 'origin']);
      await invoke(['worktree', 'add', worktreePath, '-b', issueBranch(issue), config.baseBranch]);
      return { path: worktreePath, branch: issueBranch(issue), pullRequestNumber: null };
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

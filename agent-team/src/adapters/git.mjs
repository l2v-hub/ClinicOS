import path from 'node:path';

export function createGitAdapter({ run, config }) {
  const invoke = async (args, cwd = process.cwd()) => {
    const result = await run({ command: 'git', args, cwd, timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
    if (!result.ok) throw new Error(result.error || result.stderr);
    return result.stdout.trim();
  };
  return {
    async prepareIssueWorktree({ issue, prior }) {
      if (prior?.worktree_path && prior?.branch) return { path: prior.worktree_path, branch: prior.branch, pullRequestNumber: prior.pull_request_number };
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

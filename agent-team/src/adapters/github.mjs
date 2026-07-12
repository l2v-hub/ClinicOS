export function createGitHubAdapter({ run, config }) {
  const invoke = async (args) => {
    const result = await run({ command: 'gh', args, cwd: process.cwd(), timeoutMs: config.commandTimeoutMs, maxOutputBytes: config.maxOutputBytes });
    if (!result.ok) throw new Error(result.error || result.stderr || `gh exited ${result.code}`);
    return result.stdout;
  };
  return {
    async listIssuesByLabels(labels) { return JSON.parse(await invoke(['issue', 'list', '--repo', config.repository, '--state', 'open', '--label', labels.join(','), '--json', 'number,title,body,labels,url'])); },
    async viewIssue(number) { return JSON.parse(await invoke(['issue', 'view', String(number), '--repo', config.repository, '--json', 'number,title,body,labels,comments,url'])); },
    async addLabels(number, labels) { await invoke(['issue', 'edit', String(number), '--repo', config.repository, '--add-label', labels.join(',')]); },
    async removeLabels(number, labels) { for (const label of labels) await invoke(['issue', 'edit', String(number), '--repo', config.repository, '--remove-label', label]); },
    async addIssueComment(number, body) { return JSON.parse(await invoke(['api', `repos/${config.repository}/issues/${number}/comments`, '-X', 'POST', '-f', `body=${body}`])); },
    async editIssueComment(commentId, body) { return JSON.parse(await invoke(['api', `repos/${config.repository}/issues/comments/${commentId}`, '-X', 'PATCH', '-f', `body=${body}`])); },
    async listIssueComments(number) { return JSON.parse(await invoke(['api', `repos/${config.repository}/issues/${number}/comments`, '--paginate'])); },
    async viewPullRequest(number) { return JSON.parse(await invoke(['pr', 'view', String(number), '--repo', config.repository, '--json', 'number,isDraft,headRefName,headRefOid,baseRefName,state,statusCheckRollup,url'])); },
    async addPullRequestComment(number, body) { await invoke(['pr', 'comment', String(number), '--repo', config.repository, '--body', body]); }
  };
}

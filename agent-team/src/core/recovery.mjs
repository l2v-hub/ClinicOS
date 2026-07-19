import { recoverActiveClaim, refreshGitHubClaim } from './locks.mjs';

// Restart recovery: authoritative work state lives on GitHub. Refresh every claim this worker
// still holds on issues labeled as working; expired claims simply lose arbitration and the issue
// is re-entered through the normal intake path.
export async function recoverActiveWork({ github, config, schemas, workerId, now = new Date() }) {
  const recovered = [];
  const working = await github.listIssuesByLabels([config.labels.working]);
  for (const issue of working) {
    const comments = await github.listIssueComments(issue.number);
    const claim = recoverActiveClaim({
      comments,
      schema: schemas.claim,
      issueNumber: issue.number,
      workerId,
      now,
    });
    if (!claim) continue;
    const refreshed = await refreshGitHubClaim({
      github,
      config,
      schema: schemas.claim,
      claim,
      now,
    });
    recovered.push({
      issue_number: issue.number,
      lease_id: refreshed.lease_id,
      attempt: refreshed.attempt,
      expires_at: refreshed.expires_at,
    });
  }
  return { recovered };
}

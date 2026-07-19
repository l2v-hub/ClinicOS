export function nextRemediationState({ qaResults, noProgressLimit }) {
  const tail = qaResults.slice(-noProgressLimit);
  if (tail.length < noProgressLimit) return 'ready-for-dev';
  const signature = (result) =>
    `${result.subject_sha}:${result.findings
      .filter((finding) => finding.status === 'open')
      .map((finding) => finding.fingerprint)
      .sort()
      .join(',')}`;
  return new Set(tail.map(signature)).size === 1 ? 'blocked' : 'ready-for-dev';
}

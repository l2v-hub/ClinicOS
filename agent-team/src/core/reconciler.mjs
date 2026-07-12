export async function reconcileOnce({ doctor, listDevelopment, listQa, runDevelopment, runQa }) {
  const health = await doctor();
  const result = { doctor: health, development: { processed: [], skipped_reason: null }, qa: { processed: [], skipped_reason: null } };
  if (health.developmentReady) for (const issue of await listDevelopment()) { await runDevelopment(issue); result.development.processed.push(issue.number); }
  else result.development.skipped_reason = 'doctor-not-ready';
  if (health.qaReady) for (const item of await listQa()) { await runQa(item); result.qa.processed.push(item.issue.number); }
  else result.qa.skipped_reason = 'doctor-not-ready';
  return result;
}

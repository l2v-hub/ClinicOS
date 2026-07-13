export async function reconcileOnce({ doctor, listDevelopment, listQa, runDevelopment, runQa }) {
  const health = await doctor();
  const result = { doctor: health, development: { processed: [], errors: [], skipped_reason: null }, qa: { processed: [], errors: [], skipped_reason: null } };
  if (health.developmentReady) {
    for (const issue of await listDevelopment()) {
      try { await runDevelopment(issue); } catch (error) { result.development.errors.push({ number: issue.number, error: error.message }); }
      result.development.processed.push(issue.number);
    }
  } else result.development.skipped_reason = 'doctor-not-ready';
  if (health.qaReady) {
    for (const item of await listQa()) {
      try { await runQa(item); } catch (error) { result.qa.errors.push({ number: item.issue.number, error: error.message }); }
      result.qa.processed.push(item.issue.number);
    }
  } else result.qa.skipped_reason = 'doctor-not-ready';
  return result;
}

from pathlib import Path
p=Path('/tmp/clinicos-autonomy-activation-20261022/source6/agent-team/src/bug-pipeline')
f=p/'operator-ownership.mjs';t=f.read_text().replace('''export function automationPaused(state) {
  if (!state.operatorTakeover?.active) return false;
  const handback = state.operatorTakeover.automation;''','''export function validOperatorTakeover(takeover) {
  return Boolean(takeover && typeof takeover === 'object' && !Array.isArray(takeover) &&
    (!Object.hasOwn(takeover, 'active') || typeof takeover.active === 'boolean') &&
    (takeover.nonce === undefined || (typeof takeover.nonce === 'string' && takeover.nonce.trim())) &&
    (takeover.automation === undefined || validAutomationHandback(takeover.automation)));
}

export function automationPaused(state) {
  const takeover = state.operatorTakeover;
  if (takeover === undefined) return false;
  if (!validOperatorTakeover(takeover)) return true;
  // Older budget-audit records without active are not an active takeover.
  if (takeover.active !== true) return false;
  const handback = takeover.automation;''');f.write_text(t)
f=p/'contracts.mjs';t=f.read_text().replace("import { validAutomationHandback } from './operator-ownership.mjs';", "import { validAutomationHandback, validOperatorTakeover } from './operator-ownership.mjs';");t=t.replace("    throw new Error('invalid operator automation handback');", "    throw new Error('invalid operator automation handback');\n  if (state.operatorTakeover !== undefined && !validOperatorTakeover(state.operatorTakeover))\n    throw new Error('invalid operator takeover');",1);f.write_text(t)
f=p/'external-review.mjs';t=f.read_text();start=t.index('// Ownership loss is a skip,');t=t[:start]+'''// Preserve the finite ownership-loss classification until the controller reloads
// canonical state. Returning a skip here would leave unsaved subject edits in its
// writer snapshot and leak them into the next independent subject's save.
export async function externalReviewStep(options) {
  return runExternalReviewStep(options);
}
'''
marker='async function runExternalReviewStep({'
helper='''// Recovery moves final-QA records between collections. Count the original intent,
// not its current pointer or the number of archived copies. Originals stay untouched.
function finalQaSpend(batch, prior, matches) {
  const infrastructure = batch.codexFinalQaInfrastructure ??= { attempts: [] };
  if (!Array.isArray(infrastructure.attempts) ||
      (batch.qaHistory !== undefined && !Array.isArray(batch.qaHistory)) ||
      (batch.codexFinalReviewHistory !== undefined && !Array.isArray(batch.codexFinalReviewHistory)))
    return { infrastructure, ambiguous: true };
  const seen = new Set();
  let ambiguous = false;
  const identity = (entry) => typeof entry.nonce === 'string' && entry.nonce.trim() &&
    typeof entry.reservedAt === 'string' && Number.isFinite(Date.parse(entry.reservedAt));
  for (const entry of infrastructure.attempts) {
    if (!entry || !matches(entry)) continue;
    if (!identity(entry)) ambiguous = true;
    else seen.add(entry.nonce);
  }
  for (const [origin, entries] of [
    ['current', prior ? [prior] : []],
    ['qaHistory', batch.qaHistory ?? []],
    ['codexFinalReviewHistory', batch.codexFinalReviewHistory ?? []],
  ]) {
    for (const entry of entries) {
      if (!entry || !matches(entry) ||
          !['failed', 'verified', 'changes-requested', 'running'].includes(entry.status)) continue;
      // waiting-checks and pre-QA identity-blocked metadata contain no inference
      // intent. Failed/terminal verdicts and recovered running leases do.
      if (!identity(entry)) { ambiguous = true; continue; }
      if (seen.has(entry.nonce)) continue;
      infrastructure.attempts.push({ ...structuredClone(entry), legacy: true, importedFrom: origin });
      seen.add(entry.nonce);
    }
  }
  return { infrastructure, spent: seen.size, ambiguous };
}

'''
t=t.replace(marker,helper+marker,1)
start=t.index('''        const infrastructure = (batch.codexFinalQaInfrastructure''');end=t.index('''          batch.codexFinalReview.status = 'blocked';''',start)
t=t[:start]+'''        const matches = (entry) =>
          entry.subjectSha === batch.sha &&
          entry.claudeRound === batch.reviews.length &&
          entry.feedbackFingerprint === fingerprint;
        const { infrastructure, spent, ambiguous } = finalQaSpend(batch, prior, matches);
        if (ambiguous) {
          batch.codexFinalReview.status = 'blocked';
          batch.codexFinalReview.failureCode = 'final-qa-infrastructure-history-ambiguous';
          await save();
          return blocked('Independent final QA inference history is ambiguous; explicit recovery required');
        }
        if (spent >= 3) {
'''+t[end:];f.write_text(t)

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { verifyMergedReleaseProof } from '../qa-source7/agent-team/src/bug-pipeline/release.mjs';
import { finalizeStandaloneSubject } from '../qa-source7/agent-team/src/bug-pipeline/standalone-review.mjs';
const root = '/tmp/clinicos-autonomy-activation-20261022';
const inventoryPath = `${root}/historical-cutover7/actual-readonly-historical-merge-inventory.json`;
const draftPath = `${root}/historical-cutover7/draft-finite-cutover-not-yet-authorized-or-written.json`;
const rawInventory = await readFile(inventoryPath, 'utf8'), rawDraft = await readFile(draftPath, 'utf8');
const inventory = JSON.parse(rawInventory), draft = JSON.parse(rawDraft);
const results = [];
for (const item of inventory.entries) {
  const entry = draft.entries.find(e => e.collection === item.collection && e.id === item.id);
  assert.ok(entry);
  const subject = { id: item.id, sha: item.reviewedSha, branch: item.stableIdentity.branch,
    pr: { number: item.pr, url: item.nativeReceipt.url }, release: structuredClone(entry.originalRelease) };
  const before = JSON.stringify(subject);
  await verifyMergedReleaseProof({ state: { releaseProofCutover: draft }, subject,
    collection: item.collection, repository: draft.repository,
    github: { reviewFeedback: async () => ({ number: item.pr, url: item.nativeReceipt.url,
      state: 'MERGED', head: item.reviewedSha, headRef: subject.branch, headRepo: draft.repository,
      headIsFork: false, baseRef: 'main', mergeCommitSha: item.mergeSha }),
      readReleaseMergeReceipt: async () => structuredClone(item.nativeReceipt),
      verifyHistoricalReleaseAncestry: async () => ({ ancestor: item.mergeSha, descendant: draft.mainSha }) } });
  if (item.collection === 'standaloneReviews')
    await finalizeStandaloneSubject({ subject, controller: { actor: async () => 'offline-replay', ownership: async () => {} },
      workspace: { finalQaStandalone: async () => assert.fail('historical terminal cannot invoke QA') },
      save: async () => assert.fail('historical terminal cannot mutate subject') });
  assert.equal(JSON.stringify(subject), before);
  results.push({ collection: item.collection, id: item.id, pr: item.pr, proof: 'accepted-offline-recorded-actual-receipt-replay',
    originalReleaseUnchanged: true, terminalChecked: item.collection === 'standaloneReviews' });
}
const digest = value => createHash('sha256').update(value).digest('hex');
await writeFile(`${root}/independent-qa7/historical-offline-replay-results.json`, JSON.stringify({
  liveAuthorityClaimed: false, note: 'Offline replay of root-recorded evidence; not a fresh authenticated GitHub read or cutover authorization.',
  inputs: { [inventoryPath]: digest(rawInventory), [draftPath]: digest(rawDraft) }, results,
}, null, 2) + '\n');
console.log(`accepted ${results.length} exact historical entries; terminal checks ${results.filter(x => x.terminalChecked).length}`);

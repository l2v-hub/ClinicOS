# React F4–F6 author handoff — implementation12

Only `/workspace/clinicos-497-review1-react` source was edited, against `17a127c432f39e094f2746dc33c38bcb234ce719`. Root reservation and both scope amendments were read and accepted before their extra source edits. Root owns integration, Git/index, publication and all clinical runtime/independent QA.

## Verified findings and changes

- **F4:** The reported remount/loading-key behavior was present. PatientToday time keys, scheduled/PRN dose loading identities, and PatientTherapySlotDetail request identity now remain stable during refresh. Revision triggers revalidation separately. Prior rows survive pending and failed refreshes, with explicit failure notices. Focus uses 250 ms debounce and a 1 s cooldown; cache invalidation is shared once per event. PS events only affect the matching patient. Existing local reason/note and glucose state can therefore remain mounted. The SlotDetail refreshRevision prop was necessary because PatientToday actually renders that component. **Actual interactive browser proof is UNRUN**, as agreed; no DOM renderer was available or installed. The optional root-only helper exports a focus/draft test without starting a browser or seeding data.
- **F5:** The claim that the anomaly list status was missing was partly incorrect. PatientRoster already has one failure/partial/in-progress list status, and it was preserved. PatientSignals now adds one compact Da verificare marker for a missing summary or unverified anomaly source; verified clean summaries/anomalies leave rows clean. No PatientListMedico exists or was invented. SSR tests verify the existing single list status, failed/partial/missing states and clean rows.
- **F6:** The shared history reader now permits at most four network reads globally, including roster and visible chips. A roster uses four workers, three pages per patient and server page size 50; oversized payloads are rejected. Automatic prefixes without a complete score remain unknown, retaining their cursor and provenance for one-page manual continuation. News2Chip and VitalsOverview explicitly show Da verificare/incomplete history; known partial vital values remain visible. The existing News2Chip call path means LazyNews2 shares the roster's pending/completed results without changing LazyNews2 itself. The cache has a 15 s TTL and at most 128 entries; keys are session epoch + API URL + patient, with no authentication headers, tokens or fingerprints. Every setCurrentOperator advances the epoch. Old-session results and worker queues are rejected, parameter saves invalidate affected cached/pending reads, and subscribers can abort independently. Consumers receive independent snapshot copies. Existing NEWS2 age/newer-partial staleness checks remain intact.

## Actual verification

- `tests-seal.json`: **46 PASS**, including 12 new behavioral unit/SSR tests and 34 existing regression assertions. Counting fetchers show peak **4** and total **183** requests for 60 roster patients plus one simultaneous additional chip patient (automatic budget **180** for the roster and **3** for that chip).
- `types-seal.json`: **PASS** frontend TypeScript, no emit or incremental output.
- `helper-syntax-seal.json`: **PASS** syntax only; helper execution remains **UNRUN**.
- `commandreceipts.json` links every retained actual command receipt. `types-initial.json` preserves an incorrect initial compiler path failure; `tests-cache.json` preserves the synchronous AbortError regression. Both were fixed and their original tests/receipts retained. No legacy test assertions were removed or weakened.
- `freeze-after.json` / `diffmanifest.json`: **11** changed files within the original contract and authorized amendments; root and author Git indexes unchanged; original contract/reservation/findings unchanged. `oldproof-before.json` / `oldproof-after.json`: all **13,048** previous proof files unchanged.

## Remaining root-owned checks

Actual browser focus/disclosure/note/glucose preservation, DOM/network LazyNews2 reuse, parameter-save event integration, real HTTP/Postgres interleavings, the clinical integrated scenarios and the required native/model/release gates remain **UNRUN by this author**. Do not treat pure counting-fetch tests or SSR as actual HTTP/browser evidence. No server, database, browser, install, schema change, credential lookup, network/provider operation, Git mutation, commit or publication was performed.

STOP before root integration/publication. Source hashes and evidence are sealed for root review.

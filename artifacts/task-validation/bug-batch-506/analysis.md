# Analysis — source10

Feature: patient-intake/routed-workspace-presentation. The original bug was a viewport modal covering the existing application shell during import, review, loading or resumed draft. Page presentation must stay in the main pane while real dialogs, pending-save safeguards and failed-save retention keep their behavior.

## Source10 after genuine Claude3 findings

The existing public source ff91e103827612337346520f2939694c6ae6bb92 received two LOW findings: submitting/manual intake must show the pending navigation notice; a non-upload busy operation must not say upload. Both known source9 application fixes are retained byte for byte. Native source9 run40512823458 really passed build and frontend but failed the new save-and-close harness assertion; it remains FAILED with its checkpoint. The original full source9 ephemeral worktree is unavailable; only the twelve exact retained source files are available and independently checked.

Root source10 changes only that harness expectation to assert the workspace closes, the notice clears, no navigation occurs, and exactly one draft is created. It does not weaken product code or the two notice fixes. The actual baseline RED2 failed at the old assertion; four-width local GREEN passed with zero browser errors. RED1 was an earlier setup failure caused by missing tracked tsconfig files in a partial worktree and is retained separately. Independent source QA VERIFIED the exact twelve-file CODE.

Qualified CODE: 7736adffea3394c8a70b76f71967309f1aa32b7a. Native qualification40535859044 executed all three unchanged plan commands with exit0 and no no-tests signal. Build, frontend tests, and the synthetic React browser at1440/1024/768/390 passed. Native evidence validation passed. This is synthetic loopback behavior, not authenticated backend/OCR/provider or online acceptance. Additional author/provider calls: zero.

Current evidence-manifest.json is the exact nativeEvidence array from the actual new qualification. The old wrapper is preserved byte-exact under history/publication8 and binds the old publication SHA; old primary and supplemental media are copied to distinct historical paths. Sidecar metadata identifies actual current supplemental media and the verified read-only transport receipt. All original source8 analysis and validation statements are preserved under history/publication8; they do not stand in for source10 evidence. All attempts and statuses are retained in execution-history.json with the complete original authority snapshot.

The acceptance criteria, file map, application scope and three verification commands remain unchanged. Final-head six CI, genuine Claude4, fresh final Codex, protected merge, deploy, online acceptance and issue closure remain sequential future gates.

## Code ancestry and verification baseline

CODE7736adffea3394c8a70b76f71967309f1aa32b7a has Git parent a918212c55b2b13707a6e2551317bac780fec45d, the twelve retained source9 files on a history descending from public ff91e103827612337346520f2939694c6ae6bb92. The value2dc0c0050a9f18a51a7ac980b42b46057870e27e in qualification.sourceParent is the trusted native verification worktree baseline into which the twelve application files were copied; it is not the CODE Git parent. The final publication is planned as a metadata/media child of7736, so the qualified and recovered source objects are reachable. No final publication SHA is invented here.

## Actual current runner-media receipt

The fixed read-only reader59727f4af656daadcfd151a3c08e89f3bc4d0542 completed run40543644056 and recovered all five selected files from native qualification40535859044, source7736adffea3394c8a70b76f71967309f1aa32b7a. Primary bytes and hashes equal the native qualification; supplemental save-failure-recovered-390.png is82429B/SHA256188582bf6b3da365d2050446028aa5fe315d9e416394e099f66691d8f424bbc5 and upload-notice-cleared-390.png is60092B/SHA2567eb5298cefbbdcbad44e1941d4750b7962e96b47ebf9898ac83a6d30d4d7ea2b. Total selected11,227,476B. Stream/chunk identities, gzip/payload/log ZIP and selected-byte hashes were actually verified. The complete original native artifact archive digest remains pinned provenance, not a locally rehashed archive. The exact receipt is under history/source10/media-reader-proof.json. No model was invoked by the reader.

The parent integrates the five actual new media files directly from the validated reader output; this author packet deliberately contains no duplicate new11MB media copy. Old publication8 media copies remain present under distinct historical paths.

# Task Contract

## Task
Standalone PR review adapter — implementation cycle 2/4. Root authoritative CAS reserved round2 before edits; QA1 failure and all cycle1 evidence remain immutable.

## Impact Classification
Frontend/backend/database/clinical AI: no. Trusted authorization, persistence and release orchestration: yes.

## Current Behaviour
QA1 proved whole-subject normal100KB bound strands valid reports for actual PR393, and revision adoption permits replacing historical proof bytes. Infrastructure merge is export-only and lacks requested runtime automation.

## Expected Behaviour
Standalone per-field/report sanitization and explicit aggregate limits accommodate real descriptor plus four reports without weakening normal guards. Revision packets append while all old proof bytes remain at original paths on currenthead. Trusted main CLI supplies fixed infrastructure-only exact allowlist for protected auto merge after genuine clean Claude+independent Codex+nativechecks and no hold.

## Acceptance Criteria
- AC1: Actual PR393 descriptor plus legitimate14KBreport persists; four bounded reports fit; unsafe fields/reports and aggregate excess reject; normal100KBguard unchanged.
- AC2: Revision cannot rewrite historical evidence bytes/digests or remove prior packets on newhead; preserve original history/counts and append a fresh revisionpacket.
- AC3: Real normal-pipeline invocation auto-merges only fixed trusted allowlisted infrastructure with both reviews/currentchecks/nohold, then persists confirmed exactSHA merge receipt. Clinical, unknown files, missingreviews or hold never merge. No deployment/issueclosure.
- AC5: A standalone-only finalize CLI reuses actual fresh read-only Codex QA and the same fixed-policy merge/receipt path; missing auth/sandbox/model results fail closed, and normal batch finalization is rejected. DI tests cover production CLI dispatch.
- AC6: Frozen baseSha is the authenticated PR merge base; advancing native main tip is allowed only when GitHub compare proves unchanged merge_base_commit.sha. Changed mergebase/head/fork/baseRef reject.
- AC4: No GitHub/provider/model/DB live actions by author; old sealed author/QA1 files unchanged; root receives sourcefreeze for fresh QA2.

## Test Plan
Required: author regression full bug-pipeline suite, actual descriptor bound counterexample, malicious same/crosspacket historical rewrite, fourreport cumulative/unsafe bounds, runtime pipeline auto merge/nohold/noClaude/noCodex/app/unknown tests, existing normal guards. No UI/application code changed. Fresh independent QA2 owns browser protocol proof.

## Evidence Plan
Append-only cycle2 report, source-freeze, logs and attempt record. Preserve seven sealed cycle1 author artifacts and full independent-qa proof.

## Risks
New runtime merge is privileged; fixed trusted list only, exactSHA protections and actual persisted review evidence remain mandatory. Bootstrap actualClaude still external root-owned and pending. Merge receipt is not deployment.

## Gate Status
READY FOR IMPLEMENTATION

# Task Contract

## Task
Standalone PR review adapter — LAST implementation attempt4/4. Actual durable local wx reservation root-reservation.json predates edits. Root will historically register it after active clinical controller is idle; no global state mutations by author. Three prior independent QA failures remain counted and immutable; no fifth attempt.

## Impact Classification
Clinical/UI/backend/database/model configuration: no. Trusted durable review state capacity and concurrent CAS persistence: yes.

## Current Behaviour
QA3 F5: organically near-capacity accepted state allows claim and valid report comment, then result import exceeds8MiB and strands running reservation. F6: another entity writes while independent QA waits; strict CAS result save fails, leaving valid owner running. Default strict CAS is correct for release and must remain.

## Expected Behaviour
Before claim/model reserve512KiB worst-case result allowance for each running externalreview/CodexQA across state; actual pretty UTF8 bytes plus all reservations cannot exceed8MiB. Standalone compact2MiB subjectcap includes its own active result allowances. Imported result replaces reservation atomically. Opt-in trusted orchestration only can three-way rebase disjoint entities after actual409, while default strictCAS never retries. Full merged schema/ownership/capacity and original guards rerun; source object/array/attempt references survive synchronization.

## Acceptance Criteria
- AC1: Near-capacity realistic approved-history state refuses new review/QA before durable running/round/comment/model; all simultaneous reservations count so other writers cannot spend promised room. All admitted canonical report shapes fit reserved512KiB; normal limits unchanged.
- AC2: Explicit opt-in disjoint batches/manualBatches/standaloneReviews writes merge via persisted-base/intended/fresh snapshots, unique entity IDs, bounded newbody CAS retries, full merged validator and native/auth guards. Same-entity ANY dual change, conflicting unknown root fields and invalid ownership/schema fail closed. Default strict CAS unchanged.
- AC3: Recursive in-place caller synchronization retains collection arrays, entity objects and nested attempts/round refs; original guards see updated disjoint context without losing own identity/nonce/SHA binding.
- AC4: Actual store/model barrier proves unrelated request+claim while QA awaits no longer strands owner; sameentity negative/authrevocation/stale nonce prevent inference/merge; no duplicate QA/merge. Safe known errorcodes only for diagnosis, no raw stderr/PHI/secrets.
- AC5: All earlier author/QA1/QA2/QA3 evidence stays immutable; full regression and freeze15sourcepaths for fresh QA4; no actual GitHub/model/provider/DB/commit/push/adopt/merge.

## Test Plan
Senior core/github concurrency/capacity and integration, optional bounded pure test delegation. Production store409 fixtures, model barriers, organic nearcap review manifests, maximalmultilingual canonical representation, reference identity assertions, original normal strictCAS/release regression. Author no live external operations.

## Evidence Plan
Append-only cycle4 sourcefreeze/report/logs/reservationcopy and immutable prior proof audit. Fresh independent QA4 is final; any remaining failure is BLOCKED with no fifth attempt.

## Risks
Rebasing is privileged and explicit-only: never oldbody/newSHA retry, never sameentity automatic conflict resolution. Headroom is conservative backpressure rather than inference followed by unpersistable output. Existing abandoned reservations require explicit operator recovery.

## Gate Status
READY FOR IMPLEMENTATION

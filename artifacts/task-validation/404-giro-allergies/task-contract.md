# Task Contract: #404 allergy context before Giro administration

## Impact Classification

Frontend read/presentation/accessibility only. Existing authenticated scoped clinical_record.get API; no backend/schema/policy/dose/administration-payload changes. No real patient writes or PHI evidence.

## Current Behaviour

Giro patient cards omit allergy state before Somministra. Slots do not contain an explicit allergy state; zero counts cannot establish verified absence.

## Expected Behaviour

Read fresh cartella allergy fields for visible Giro cards only, bounded concurrency, timeout and cancellation. Keep only a validated minimal local allergy projection, never full chart or global patient cache. Display known named allergens/severity/reaction before administration actions. Preserve documented absence, patient denial and unknown distinctions. Local keyboard-accessible disclosure reveals documentation without route/date/fascia/patient/scroll changes. Read errors remain unknown with retry, not a clinical compatibility decision or new administration block.

## Acceptance Criteria

1. AC1: Every visible Giro patient card displays source-bound allergy state, including undocumented/malformed/failed/unauthorized source as unknown. Explicit verified absence and patient denial remain distinct, including valid legacy status-only records per #244. Missing list alone never implies absence. Reject malformed statuses and mismatched patient responses; cancel stale reads on identity/context/unmount and suppress denied reads.
2. AC2: Known allergens and textual severity/reaction appear before Somministra, not color/count alone; list takes precedence over contradictory absence. Desktop1150 and mobile390 remain readable without page overflow.
3. AC3: Open/close details by pointer/keyboard while preserving patient/date/fascia/filter and scroll position. Native local disclosure does not navigate or write.
4. AC4: Exercise full supervisor administration confirmation in synthetic actual SPA: cancel means zero writes; confirm has unchanged correct key/confirmed:true; refreshed administered state and reload reflect simulated persisted response. Also test unauthorized read, retry and stale response isolation. Explicitly distinguish mock-transport persistence from real database/clinical validation.

## Test Plan

Pure projection/read/security/render regression tests, existing allergy-status and Giro/administration suites, types/build/full frontend compared against exact 12 existing failures (zero NEW). New independent QA agent exercises actual SPA synthetic interception, desktop/mobile/keyboard, all ACs and failure paths; records console/runtime/relevant HTTP outcomes. Four concurrent cartella reads maximum; no cached full chart, credentials or new backend permission.

## Evidence Plan

Freeze clean application candidate commit before independent QA handoff; root sole app writer. Bind receipts to immutable candidate, retain screenshots/trace/video/HTML/JSON and sanitized logs. Root independently reruns focused/browser/gates. Publish via authorized main push, verify Vercel READY exact SHA plus public feature assets and backend health. Proof-only commit and pinned screenshots GitHub #404; close only after all ACs verified. Known full-suite failures waived unchanged, no broad green claim.

## Gate Status

READY FOR IMPLEMENTATION

## Ownership / Policy Decision

Allow user-authorized scoped fix, synthetic tests, commit/push/deploy/evidence/closure. Deny real patient test mutations, PHI/secrets publication, capability expansion and simultaneous worktree writers. Root owns this integration worktree; researcher was read-only; new QA gets evidence-only ownership after freeze. Preserve unrelated dirty files.

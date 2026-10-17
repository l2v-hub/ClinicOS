# ClinicOS portable skill — validation

Documentation-only task requested by the user; no clinical issue closure or runtime changes.
Base main: 14dbcd353242b35a050c45cbed7978ac213edd62.

## Changes

Updated canonical .claude/skills/clinicos/SKILL.md, added its portable references/bug-delivery.md,
and a .agents/skills/clinicos entry pointing to the same canonical package.

## Acceptance Criteria Result

| AC | Result | Evidence |
| --- | --- | --- |
| AC1 Portable package and links | PASS | independent-qa/document-checks.json |
| AC2 Complete grouped analysis and bounded adaptive execution | PASS | independent-qa/validation-report.md |
| AC3 Independent QA, evidence, Claude review and verified release rules | PASS | independent-qa/validation-report.md |
| AC4 Safe documentation-only scope | PASS | independent-qa/validation-report.md |

## Test Results

Independent contract/diff/security review PASS. Frontend typecheck and build PASS (740 modules).
Real Markdown browser navigation/reload/content assertions PASS; zero console/page/HTTP errors.
Three PNG, one trace (17 ZIP members) and fully decoded video verified. Portable package copied
outside the checkout and relative links validated. Root independently rechecked all 17 manifest
hashes and visually inspected review-playbook.png. No database, clinical runtime or model called.

Independent verdict: READY FOR CODEX QA. Native protected PR checks and main integration pending.
This report certifies the documentation acceptance criteria, not the open clinical releases.

## Final Decision

CLOSED — VERIFIED

Local documentation scope verified. Publication tracked by the PR and its required checks;
existing clinical/Max/Railway blockers are not resolved by this documentation task.

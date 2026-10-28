# Task Contract

## Impact Classification
One-file responsive CSS correction. No clinical logic, action, API, schema or test changes.

## Current Behaviour
Source635c11a560e878f98b2d1c729893a203f1dc932c; independent QA3 found document overflow at320px, menu bounds passed all4sizes. Fresh diagnostic measured html/body scrollWidth356 versus320. Two primary dose buttons right355.86, parent action row258px but scrollWidth325. Mobile flex1 + auto min-content + nowrap does not wrap, pushing buttons past card. Private cause-receipt and actualDOMmetadata prove cause; initial offscreen-menu correction remains valid. QA3 and all earlier failures preserved.

## Expected Behaviour
Dose action buttons wrap inside their patient card on narrow screens; every label and action stays usable without clipping/hiding text or horizontal document overflow. Menu remains positioned and keyboard accessible. Desktop layout unchanged.

## Acceptance Criteria
- Minimal mobile CSS at max-width720 for .giro-row__act/.giro-drug action row, typically flex-wrap:wrap, while preserving flex expansion and badge layout. No overflow:hidden mask, shrinking unreadable text, labels/actions removed or forced click. Each actual button fits its258px action container at320 viewport.
- Only TherapyRoundsPage.css plus NEW safe packet. Preserve exact source TS/TSX/API/test/harness and all old media/proofs, no assertion weakening. Source snapshot/hardlink privatization before edit.
- Existing29focused tests and frontend build through credential-free verification runner; no new CSS-mirroring tests or repeated unaffected1509suite. Real canonical452 all4viewport/nativeEnter/normalclick and remaining clinical checks run by fresh independent QA afterSTOP; no author DB/browser/provider/GH actions.

## Scope
- frontend/src/components/operator/TherapyRoundsPage.css

## Test Plan
Source diff and meaningful existing focused tests/build, authorSTOP. Independent actual canonical checks retain original thresholds and old failures. No claim full8/15clinical coverage from CSS/unit results.

## Evidence Plan
Private /workspace/.clinicos-cloud/ux447-followup8-author-20261019; NEWpublic artifacts/task-validation/bug-batch-447/codex-followup-4. Diagnostic cause metadata and all oldQA immutable. Root solely owns Git/GH/state/provider. No raw/ignored log force additions, no PHI/credentials.

## Gate Status
READY FOR IMPLEMENTATION after diagnostic STOP and authentic user-session7to8 grant, new canonical nonce readback. Existing continue-until-resolution authorization, all7priorattempts preserved. ActualClaude/finalCodex/native6/exactdeploy before issueclosure.

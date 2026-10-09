# Task Contract — GitHub issue425

## Impact Classification

Bugfix frontend/layout only. Backend, Prisma, clinical APIs, auth, config/env, deps/locks, clinical content and prescribing decisions: NO changes. Primary dirty checkout and blocked405/408/410/416 candidates excluded. Root sole app/evidence writer C:/w-425 from exact online67d21c3e9257a5acb8c9b25130c9417fb92185fb. Read-only architecture agent may inspect this checkout; NEW independent QA assigned separate frozen candidate checkout later. Only one serial browser lane.

## Current Behaviour

Original issue and zero comments freshly read: Cartella Clinica/Terapia at1150x1004 and1280x720 shows competing outer page, chart panel and calendar scroll; prescription focus may be obscured by sticky headers/actions. Existing accepted calendar already overrides shared grid max-height, so reproduce actual current source before deciding change, not assume audit screenshot equals HEAD.

## Expected Behaviour

One predictable vertical owner for chart clinical content on desktop/tablet/mobile. Calendar hours extend naturally so wheel gestures above/inside/below reach following information, with any necessary horizontal week rail contained without vertical trap. Dialogs retain intentionally isolated scrolling, focus trap and return focus. Source inspection establishes that AccessibleDialogSurface has no existing body lock: record background scroll rather than claim one was preserved. Keyboard focus reveals full control and action with patient identity/context intact. No global design-system or prescribing semantics refactor.

## Acceptance Criteria

1. Original: Una pagina lunga ha un percorso verticale principale chiaramente prevedibile. Assert actual computed vertical scroll owners and wheel progress for long Clinica and Terapia.
2. Original: Il calendario non intrappola lo scroll verso le informazioni dopo la griglia. Assert wheel over real grid reaches after-grid content, not just CSS source.
3. Original: Il focus da tastiera porta in vista i campi senza occultarli sotto testate/azioni. Assert actual control bounding boxes vs relevant headers/actions; real form Tab/shift-Tab, last fields/buttons, dialog focus trap and return focus; record background scroll independently.
4. Original: Validare overflow e scroll su dimensioni desktop e tablet reali. Desktop1150x1004/1280x720 and tablet landscape1024x768/portrait768x1024 tested as actual browser viewport sizes; emulated sizes MUST NOT be called physical-tablet/touch certification. If original requirement requires actual hardware unavailable, keep AC4 external UNVERIFIED and do not close/promote source; no silent criterion weakening. Read-only review to resolve interpretation from original wording, not invent device evidence.

## Test Plan

Reproduce on exact accepted67 first with synthetic guarded API fixtures and actual Vite/Reactcompiler config. TDD focused layout regression; independent frontend/backend typecheck, tsc-b and actual Vite build, focused chart/navigation/dialog/calendar/prescription tests; full regression exact1252/1240PASS/12 same current baseline, no new failures. CSS-scoped scanner baseline/candidate, injection/config/auth/log/data review mandatory. Browser assertions on actual patient chart, nurse+doctor, desktop/tablet-size/mobile, long calendar/week, wheel over grid/outside, Tab focus and modal. Local real DB not needed if no changed handlers/durable state; do not claim synthetic UI mock reload as DB proof.

## Evidence Plan

Original issue/comments snapshots, source physical hash, before/after screenshot+trace+video+assertion JSON, compiler/types/test logs, immutable NEW QA recipes/artifacts, root byte-identical rerun, exact production commit/deployment/bundle verification if all original criteria pass, pinned synthetic PNG on GitHub after credential/archive/canonical scan. Failed attempts preserved separately. Never original audit photos, real PHI or production clinical/auth writes. Current external DockerHub CI infrastructure may prevent final release gate; no fake global CI pass.

## Gate Status

READY FOR IMPLEMENTATION

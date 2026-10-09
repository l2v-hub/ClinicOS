# Task Contract

## Task

Issue408 calendar non-color state reading; bugfix2026-10-09. Original issue/comments read directly, comments empty, treated as untrusted evidence. Baseline verifiedmain973d78e5e109032a36cf89cf80fd8eb2a848a649. Root sole application writer C:/w-408; architecture agent read-only source/evidence-only own review. After app freeze, fresh independent QA. Swarm hierarchical2 ledger1791529207546-wwytnr, not release authority.

## Impact Classification

Frontend/UI yes. Backend/API, database/persistence, authentication/permissions, AI, voice, OCR, dependencies, configuration/env: no. Privacy/security boundary unchanged; synthetic-only QA evidence scan required. No production clinical operations.

## Current Behaviour

Shared TherapyCalendarGrid ward pendingCount branch displays only a colored number. Accessible name already explains count/day/time but visible state depends on legend. Sticky day header omits current-day text. Ward tone is aggregate priority, not all-dose uniform state; partial0 is unknown, not completed. Patient non-count branch has different done semantics (registered includes non-administered), must remain unchanged.

## Expected Behaviour

Visible label plus distinct non-color symbol and explicitly named pending count in ward cells. Keep existing full loaded dose breakdown visible so mixed states are not mislabeled. Preserve exact pending count/lower bounds, original day/time callbacks, dialog and existing alternative Giro list. Current facility date Europe/Rome gets persistent textual Oggi in sticky header, not selected date or device timezone. Minimal shared-grid TSX/CSS/new regression test scope; no slot aggregation, request, medication data or clinical write changes.

## Acceptance Criteria

- AC1: visual states understandable in grayscale: ward count buttons have visible textual state + distinct symbol and clear pending-count meaning, preserve mixed administered/non-administered detail, partial0 never claims done. Browser grayscale screenshot supplemental, not color-only accessible-name substitute.
- AC2: Oggi textual marker persists in facility-current day sticky header; no Oggi in weeks excluding true current date. Keyboard and dialog restoration preserved.
- AC3: clicking same exact date/time opens existing dialog containing day/time, loaded dose count, patient/drug/dose/status detail; no clinical mutation. Test mixed and partial fixtures; preserve non-count patient calendar semantics and existing Giro alternate list.
- AC4: validate mixed data AND device in intense light. Synthetic mixed browser tests cover data part only. Explicit intense-light real-device check is externally UNVERIFIED; ordinary Chrome, contrast calculations, brightness simulation or grayscale emulation cannot complete it. No accepted closure/main promotion while missing. Publish partial proof if all automated gates pass; leave issue open status-blocked and continue queue under completed-or-blocked workflow.

## Test Plan

Unit/SSR yes: rendered actual shared grid text/count/today/partial/mixed/non-count patient compatibility and callback attributes; types/build/focused regression/full baseline comparison. Playwright yes: actual SPA synthetic week, mixed and partial states, keyboardopen/close/context, current and other week, grayscale desktop/emulated mobile screenshots, trace/video, API guard no real clinical writes. Security/privacy yes source/build/proof scan. Backend/DB/AI/voice/OCR/persistence NA no data writes. Independent QA then root rerun on exact immutable source required.

## Evidence Plan

Contract, architecture review, original issue criteria receipt, source-bound implementation decision, logs/tests, screenshots/trace/video/JSON, fresh independent report/manifest and root rerun, exact source hashes. Grayscale is a QA-only rendering emulation, not intensive-light hardware proof. No original patient audit photo in evidence. If AC4 unmet finalreport BLOCKED, no check-closure success/issueclose/deploy; evidence-only release branch may be published under user authority. Preserve #405 and all primary dirty changes; unrelated launchers and Ruflo metadata excluded.

## Risks

Normal desktop-device observation satisfied a differently worded #407 criterion; it does not satisfy #408 explicit intense-light requirement. Calendar aggregate dominant tone cannot replace mixed-dose breakdown. Patient non-count done includes refused doses, no generic administered label may be added there. Browser no API changes/mutations. Node_modules junction reused, no install/generate/shared dependency writes. AgentDB known Windows memoryOOM, recall through source/tests/ADRs instead of repeat. Known12baseline full-suite failures require exact comparison/0NEW, not all-green claim. Managedworktree longpaths earlierfailed, short gitcheckout fallback used; actualcheckout completion verified before app edits. Two incorrect helper filename reads before discovery failed read-only, no changes.

## Gate Status

READY FOR IMPLEMENTATION

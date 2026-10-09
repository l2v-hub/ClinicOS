# Issue 413 independent QA — first candidate

Final Decision: FAILED VALIDATION

Application: `2097e059e7ef87871ceeaf29c56bfd83aac7f7e6`; accepted baseline `3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56`.
Exact source SHA-256 `e86cf7f173b5d3a78f3660448a2dd1dfc6e8be08e03618badb707e876454f303` (1448 source inputs), identical pre/post receipts.
Read original GitHub issue and comments directly: four original criteria, no comments. Synthetic intercepted actual SPA, sole browser lane at localhost7475; root-owned server retained, all QA browser contexts closed.

| Area | Test | Esito | Evidenza |
|---|---|---|---|
| Contract/scope | Original four AC; entire six-file diff review | PASS scope, correctness regression below | ../task-contract.md; this report |
| Frontend | Independent frontend/backend noEmit, tsc build and Vite build | PASS | commands/*types.log, commands/frontend-tsc-build.log, commands/vite-build.log |
| Frontend | Focused unit/SSR/draft/version tests | 38/38 PASS | commands/focused.log |
| Frontend | Full suite vs immutable accepted #412 proof553dbd83 | 1206 total,1194 PASS,12 exact baseline failures,0 NEW; not globally green | commands/command-results.json, commands/full-regression.log |
| AC1 | First question label/name and viewport focus desktop1150x1004/mobile390x844 | PASS | browser/test-results/browser-results.json; browser/screenshots/*; browser/*-trace.zip; browser/video/* |
| AC2 | No active redundant resume; inactive resume and real reload restore five answers | PASS | browser/test-results/browser-results.json |
| AC3 | Sticky progress/actions start/end with hit testing, no overflow; tablet820x1180 midpoint | PASS ordinary flow; invalid hidden metadata FAIL | browser/test-results/browser-results.json; adversarial/test-results/failure.json; adversarial/screenshots/tablet-midpoint.png |
| AC4 | 15 validated choices,0..5 partial/complete distinction, explicit preview/read-only and save400 recovery | PASS | browser/test-results/browser-results.json; commands/focused.log; pre/source-receipt.json |
| Frontend failure path | Empty required datetime, collapse metadata, press Salva bozza | FAIL: hidden invalid input cannot receive focus; console error | adversarial/test-results/failure.json; adversarial/screenshots/failure-1.png; adversarial/failure-1-trace.zip; adversarial/video/* |
| Security | Diff contains no transport/auth/schema/dependency changes; normal evidence guard empty external/unexpected/domain writes | PASS touched scope, no release eligibility | commands/security-scan.log; browser/test-results/browser-results.json; pre/source-receipt.json |

## Blocking finding

`frontend/src/components/operator/assessments/PaperForm.tsx:190–207`: compact metadata moves the existing required datetime into a closable `details`, but form invalid handling does not reveal it. Reproduction: new PAINAD, expand Data e compilatore, clear date, collapse, click Salva bozza. Date remains hidden; browser emits `An invalid form control with name='' is not focusable.` No save is sent. Screenshot shows no error prompt or reachable date. This is newly introduced by compact metadata, not one of twelve baseline failures. Need expose/focus invalid fields while preserving all existing validation constraints; re-run failure path after amendment.

Evidence was visually inspected: only Persona Sintetica, synthetic identifiers/operator and no real clinical identity. No original audit attachment downloaded. Two successful simulated draft save attempts in ordinary flow, zero finalizations; invalid-date case zero assessment writes. Transport intercepts all API and rejects any non-local origins. No deployment/GitHub publication performed by this QA agent.

Codex must now re-run the QA Gate.

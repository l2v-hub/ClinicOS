# Task Validation Report

## Task

- Issue:412, Clinica duplicate structured/narrative topics and expanded document absences.
- Commit:3790a95b7c0c09b388ffbaeb7c71fe09d80a1c56; accepted baseline8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df.
- Exact candidate source SHA256:d32b0be8dbc37b5f29df11578836bdc5720c9f420218e4b3d0e1f69c8bd50457;1446 inputs, unchanged root/independent before and after.
- Date:2026-10-09. Root integration gate, new independent bug412_fresh_qa gate; primary dirty source preserved.

## Implementation Summary

Each existing current topic editor owns a closed source/review detail. Current, original, reviewed text and provenance remain explicit; source never adopted automatically. Conflicts visible while collapsed. Exact document-absence placeholders grouped into one closed disclosure, not clinical negatives. Source loading/error keeps current editors. Optional shared/editor props preserve defaults elsewhere. Ten scoped frontend source/test files only; no backend/API/schema/auth/config/dependency edits.

## Acceptance Criteria Result

| AC original | Result | Evidence |
|---|---|---|
| AC1 one entry for Allergie/Diagnosi/Anamnesi | PASS local + online | root-rerun/browser/test-results/browser-results.json: each count1; root-rerun/extra-browser/test-results/browser-results.json: original aliases/anchor; independent-qa/validation-report.md; compiled online-extra-verified/test-results/browser-results.json |
| AC2 source/current distinct, details accessible | PASS local + online | root-rerun/online-verified/screenshots/reviewed-original-current-distinct.png; source provenance/compare/read/edit, failure+retry+reload with original/current unchanged |
| AC3 document absence not patient absence | PASS local + online | unknown allergy remains unknown, meaningful source negative retained; loading/error/retry, explicit absence disclaimer; root-rerun/online-extra-verified also injected markup/future topic/conflict |
| AC4 empty blocks not each expanded | PASS local + online | root-rerun/online-extra-verified/screenshots/desktop-compact-seven-absences.png; root-rerun/online-verified/screenshots/mobile-current-source.png; grouped7closed, empty history closed, conflicts retained |

## Test Results

| Area | Test | Result | Evidence |
|---|---|---|---|
| Contract | Valid before edits | PASS | task-contract.md; baseline-red.md documents initial module-boundary RED (not an assertion execution) |
| Source | Frozen clean application inputs | PASS | root-rerun/source-before/source-receipt.json and source-after; independent-qa/source-before and source-after; independent immutable73-artifact manifest |
| Build | Frontend/backend types, frontend tsc/Vite | PASS each root + independent | root-rerun/commands/command-results.json and logs; independent-qa/commands |
| Unit |43 focused +3 new independent adversarial SSR | PASS each root + independent | root-rerun/commands/focused.log; root-rerun/adversarial-unit.log; independent-qa/adversarial-unit.log |
| Regression | Full frontend1202tests |1190PASS,12 exact baseline failures,0NEW | root-rerun/commands/command-results.json pins baseline411 proof881c; no all-green claim |
| Browser |7 original +9 extra groups | PASS each root + independent | root-rerun/browser and extra-browser/test-results; independent-qa/browser and adversarial-browser-final. Serialized actual SPA, not mock page |
| Baseline UI | accepted8b reproduces duplicates/expanded empties | PASS reproduction | root-rerun/baseline-browser-complete/screenshots/before-accepted8b-separate-source-topics.png and before-accepted8b-expanded-empty-sources.png; baseline-source source receipt |
| Persistence boundary | existing narrative save/reload | PASS frontend simulated transport | root-rerun/browser/mixed-trace.zip and video/mixed.webm. In-memory API only; no backend/database/production persistence claim |
| Security | scoped secret and deep scan + manual/runtime XSS | PASS scoped, existing risks disclosed | security-review.md and security-receipt.json;481 baseline findings,7 dependency findings, one unchanged touched-file comment heuristic;0NEWtouched. Independent live injected markup remains text |
| Release | exact production source and compiled browser | PASS | deployment-receipt.json:Vercel dpl_31ZqytigpuBYh2Pgb3axwqSz3JQP READY both providerSHAs3790a95b, alias/assetsHTTP200. Compiled online-verified7+online-extra-verified9 groups PASS, every API request intercepted synthetically; backend409 retained health200 |
| CI scope | frontend secret scan + general gate comparison | PASS scoped / baseline failure retained | ci-comparison.json:frontend scan37913741859 SUCCESS; general37913741797 exact same single backend test failure as411run37908237127. Downstream import skipped, no general-CI green claim |

## Runtime Evidence

Result screenshots, HTML assertion reports, raw results, traces and videos are under root-rerun/browser, extra-browser, baseline-browser-complete and immutable independent-qa evidence. Source-bound compiled online artifacts are root-rerun/online-verified and online-extra-verified, visually inspected by root. Only synthetic identity/patient/source text, no original audit or medical files. Browser requests intercepted before network; unexpected endpoint/host/write and page errors are zero. Only deliberately injected source/read/save503 allowed and tested for recovery. Simulator re-auth after real reload follows memory-only development session behavior. Provider assets split PatientDetail/NarrativeSectionsTab: concrete labels checked across HTTP200 source-bound chunks, not falsely assumed all in one bundle.

## Residual Risks

Twelve unchanged frontend failures and pre-existing scan/dependency findings are not certified fixed by this change. Broad CI baseline backend failure must be compared and disclosed. No hardware, screen-reader or clinical policy acceptance inferred.405/408/410 remain externally pending; their application sources excluded. Backend409 retained unchanged, not redeployed fictionally. Baseline raw source hash differs with checkout line endings; committed application content matches8b, raw baseline snapshot separately bound. No real patient test mutations.

## Final Decision

CLOSED — VERIFIED

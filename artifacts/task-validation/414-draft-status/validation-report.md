# Task Validation Report

## Task
- Title / slug: 414-draft-status
- Application commit: 288dac948c8a46e26e1bef87d6266b2497727566
- Baseline: e01bd55114e2b5b1615b4088d988a41aad60eb80
- Date: 2026-10-09
- Raw source SHA-256: 9c0d4c1c5e559b66801f33760cb513d21a664e141fa30f1c0e23e3f26dc79e9c,1451 inputs.

## Implementation Summary

Seven frontend paths only. Shared Italian draft presentation distinguishes local unsaved edits, pending writes, uncertain/failed receipts, unsaved modifications and acknowledged saved drafts. Last confirmed timestamp derives only from record.updatedAt. Same-open-window availability, blocked storage, logout/new access and same-author account with continuing patient permission are explicitly explained. Existing save/retry/reconcile actions remain unchanged; no optimistic success, automatic finalization or new persistence.

## Files Changed

frontend/src/components/operator/assessments/{AssessmentDraftStatus.tsx,AssessmentDraftStatus.css,AssessmentWorkspace.tsx,PaperForm.tsx,AssessmentCatalog.tsx,LegacyDraftTools.tsx}; frontend/src/components/operator/__tests__/draftStatus414.test.ts. Backend/schema/API/config/auth/dependencies and clinical definitions/engines/versions/store/client/persistence unchanged. Primary dirty checkout and pending405/408/410 source excluded.

## Acceptance Criteria Result

Paths below are relative to this task folder and exist.

| AC original | Result | Evidence |
|---|---|---|
| AC1 Locality and availability without server | PASS | baseline/browser/screenshots/baseline-technical-hint.png; root-rerun/browser/screenshots/local-only.png; online-verified/screenshots/local-only.png; independent-qa414/validation-report.md |
| AC2 State changes only after actual save confirmation | PASS | root-rerun/browser/test-results/browser-results.json; root-rerun/adversarial-browser/test-results/adversarial-results.json; online-verified/screenshots/save-pending.png; online-verified/screenshots/confirmed-save.png |
| AC3 Progress/failure/recovery clear | PASS | root-rerun/browser/screenshots/failure-recovery.png; root-rerun/adversarial-browser/screenshots/desktop-malformed-receipt-blocked-storage.png; independent-qa414/adversarial-rerun/tests.log; online-verified/screenshots/failure-recovery.png |
| AC4 Chart-tab/new access/distinct test device | PASS | root-rerun/browser/test-results/browser-results.json; online-verified/test-results/browser-results.json; online-verified/screenshots/distinct-context-recovery.png; root-refinement/db/tests.log; independent-qa414/db/tests.log |

## Test Results

| Area / test | Result | Evidence |
|---|---|---|
| Types frontend/backend; tsc build; Vite build | PASS, root and dedicated independent QA | root-rerun/commands/command-results.json; independent-qa414/commands/command-results.json |
| Focused unit/integration | 42/42 each | root-rerun/commands/focused.log; independent-qa414/commands/focused.log |
| Independent adversarial state/store tests | 8/8, independently executed and root rerun | root-rerun/extra/tests.log; independent-qa414/adversarial-rerun/tests.log |
| Full frontend regression | 1210 tests,1198 PASS,12 exact baseline failures,0 new; not globally green | root-rerun/commands/full-regression.log; root-rerun/commands/command-results.json; independent-qa414/commands/command-results.json |
| Unchanged backend on fresh real PostgreSQL | 8/8 each, author isolation/CAS/replay/revocation/process persistence | root-refinement/db/result.json; independent-qa414/db/result.json |
| Ordinary SPA plus real local PostgreSQL | 10 assertion groups each | root-rerun/browser/test-results/browser-results.json; independent-qa414/browser-cleanup-rerun/test-results/browser-results.json |
| Additional adversarial browser desktop/mobile | 8 groups each, blocked storage and malformed HTTP201 DTO, preserved413focus/answers/lock | root-rerun/adversarial-browser/test-results/adversarial-results.json; independent-qa414/adversarial-browser/test-results/adversarial-results.json |
| Exact deployed compiled SPA | 10 groups PASS, process exit0 | online-verified/test-results/browser-results.json; online-verified/playwright-report/index.html; online-verified/context-0-trace.zip; online-verified/video/context-0.webm |
| Security/privacy | Source/dist scanner PASS; no new touched findings; broad481/7dependency baseline unchanged, not globally clean | root-rerun/commands/security-scan.log; security-receipt.json; source receipts |
| CI | Frontend Secret Scan37925601974 PASS; general37925601823 has exactly the same single backend failure as baseline37920045885,0 new; downstream import skipped, not PASS | ci-comparison.json |
| Agnos/voice/OCR | N/A, not changed or called | source receipts |

## Runtime Evidence

Dedicated fresh QA READY FOR CODEX QA, frozen70 raw files and exact source pre/post; root independently reran all18 browser groups plus8 additional state tests after that verdict. Local manifests verified unchanged. Initial independent test-import and PostgreSQL teardown failures are preserved and clearly not certified; fresh browser-cleanup-rerun exits0. Native exception dump existed only in transient tool output, never any attached file; independent publication audit checked70hashes and3454 decompressed trace members. Root failed development harness attempts stay local, excluded from public proof.

Browser/auth/navigation use actual SPA. Assessment requests invoke unchanged source backend services against fresh real loopback PostgreSQL; other UI APIs are guarded synthetic fixtures. The online run loads only public production static assets and fulfills every deployed backend API request before network. Zero production patient writes; no original audit photos or real patient identities. Deliberate503/404 and malformed receipts are isolated expected failure paths; zero other relevant HTTP/console/page errors or unexpected external requests.

Desktop1150x1004 and mobile390x844; separate independent browser storage contexts simulate distinct devices. Actual simulator logout/new login clears local edits; acknowledged DB drafts survive reload/new access; other-author and revoked patient scope denied. Not physical-device/Entra/screen-reader/bright-light certification. Compiled screenshots visually inspected by root.

Vercel dpl_CwR4uuG35U7PD7tKWxLwf3kPmJzJ READY with exact Git SHA, production alias and reachable new status chunks verified200: deployment-receipt.json. Backend unchanged, accepted409retained with read-only health200. No duplicate manual deployment.

## Logs / Integrity

Synthetic command outputs, HTML reports, screenshots, videos, per-context traces and migration hashes accompany results. root-rerun/source-before/source-receipt.json and root-rerun/source-after/source-receipt.json bind clean app source; source freeze excludes known unrelated launchers and coordination files. publication-manifest.json binds canonical staged Git blobs separately from the frozen independent raw manifest; text CRLF-to-LF is the only allowed export normalization. Initial publication pass146files/21159credential checks/6907ZIPmembers clean; final pass also includes this updated report and CI receipt before proof commit. GitHub image URLs must be pinned to immutable proof SHA and checked200/hash before closure by publish-proof.mjs.

## Residual Risks

12 frontend baseline failures remain; broad security findings remain. CI has the same preexisting backend failure: therapy reads and writes apply patient scope before loading clinical data; downstream tests skipped, no global green assertion. Existing external405/408/410 and audit429 acceptance limitations remain open and are not part of this release. No clinical formula or role authorization changed.

## Final Decision

CLOSED — VERIFIED

All four original acceptance criteria, independent QA, root rerun, compiled production SPA, deployment and exact CI baseline delta verified. Root integration decision under direct human publication authority. This decision authorizes source-bound proof publication; actual GitHub closure is asserted only by the subsequent github-closure-receipt.json after pinned image/hash checks and confirmed closed state.

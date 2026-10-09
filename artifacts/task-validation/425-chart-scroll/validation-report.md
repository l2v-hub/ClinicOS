# Validation Report — issue425

Application: b7ae14d120c1e70ccf72784206a505f8c48f975e; accepted baseline67d21c3e9257a5acb8c9b25130c9417fb92185fb. Only3 frontend paths: scoped chart CSS, PatientDetail import and5 source regression guards. No backend/API/auth/schema/config/dependency changes. Primary dirty checkout and unreleased blocked candidates excluded.

## Acceptance criteria

- AC1: Una pagina lunga ha un percorso verticale principale chiaramente prevedibile. PASS — one effective vertical owner in long actual Clinica/Terapia/form; browser01/results.json
- AC2: Il calendario non intrappola lo scroll verso le informazioni dopo la griglia. PASS — wheel over calendar reaches real following PRN information; week horizontal rail preserved; browser01/results.json
- AC3: Il focus da tastiera porta in vista i campi senza occultarli sotto testate/azioni. PASS — 110 real Tab/ShiftTab form/modal per primary group;330 supplemental modal focus controls effectiveClip0/hittrue/fixed containing block viewport, final Save fullbounds and hit on3 sizes; browser03/results.json
- AC4: Validare overflow e scroll su dimensioni desktop e tablet reali. PASS — actual measured Chromium1150×1004,1280×720,1024×768,768×1024,390×844; coarse-pointer denied-capability cases. Viewport-dimensions interpretation agreed by independent architecture/QA from original wording; no physical tablet or touch certification

## Tests executed

Fresh independent QA2:16 browser groups PASS (10nurse/doctor primary+3DENIED/coarse+3strongmodal). Root byte-identical frozen recipes:16 PASS. Actual compiled production static UI:16 PASS with the same assertions/fixtures; only transport/origin changed and frozen before execution. All16 per lane: console/page/HTTP/unknown API/external/clinical writes0. All clinical/auth/catalog APIs intercepted BEFORE wire; no production patient mutation or DB persistence claim. No backend/durable state change, therefore no fabricated local DB gate.

Types FE/BE,tsc-b, actual Vite/Reactcompiler and source/dist secret scanner PASS. Each independent/root focused44/43PASS/1 exact accepted classic-fallback failure; full1257/1245PASS/12 exact baseline failures,0 new. This is NOT globally green. Scoped3-path native security baseline/candidate0 findings, not global CVE certification. Source1534 physical inputs unchanged before/after; rootSHAcc6d66918aaa8f696cdfb0ed4db2a90babeeea80e9ffe95a6604d91fe2d79565, independent raw manifest160 artifacts SHAd2b1a84a534fcc1e1e98cabc5e48f8134aa45ad344727710a6a188daf82f2e3d. Cross-checkout differences permitted only for strict UTF-8 CRLF→LF in declared application paths; release-gate-receipt.json records normalization. Root recipes byte-identical before execution; pre-run.json records hashes.

## Baseline, remediation and evidence integrity

Accepted67 calendar already reached after-grid PRN on5 dimensions; no invented baseline calendar regression. Actual baseline form showed5 keyboard controls covered by sticky actions at1280×720. Scoped CSS releases mobile ancestor chain, keeps one desktop owner and puts prescribing actions into normal flow. First frozen796 independent QA FAILED: retained chart animation transform made fixed overlay relative to clipped chart panel. Ten controls were obscured despite DOM visibility. That failure is not waived: all142 artifacts/raw manifest a69b2123ffa5765005099a494ed66aa030561836b748fdec15ad93798885e22f preserved under failed-independent-qa-796. New b7 disables only chart retained transition;5th guard RED before implementation then PASS; real containing-block, clipping and hit-test proofs establish correction. QA2 all160 artifacts immutable, including report/recipes/logs/PNG/trace/video. Root adoption initially stopped on verdict-heading mismatch; only root parser corrected after checking actual sealed report and manifest SHA. No test/source/independent proof edited to pass; adoption-parser-incident.md discloses failed launches with no executed tests or server.

Actual screenshot pixels reviewed for old clipped window and corrected Save desktop/mobile. Reports under independent-qa2/validation-report.md and compiled-online/playwright-report.html. These are Playwright-library assertion receipts, not a native Playwright runner report. All failed/successful independent attempts are retained. Root preliminary development failures/caches remain local, no original audit photos or real patient data republished. No body-lock claim for the dialog primitive that does not implement one.

## Deployment and CI

Vercel dpl_2am1AHqBzDcCYtctXYmCqJvKXEYW READY, metadata/Git source SHA match application, production alias/staticHTTP200. JS bundle SHA4091a73cabe0f6669d1cc119ae189211034118fcf84edf15478b1a67c017d001; HTML and CSS assets captured before browser acceptance and byte-identical after. Backend unchanged retained47a4b16c111d9b9bfd0b138991958a8ca8f6c351 / Railwayed539cb2-224c-4221-8e7a-0f0901039987 health200, no backend deployment. deployment-receipt.json and compiled-online/online-receipt.json bind evidence.

CI 37998656995 completed, frontend secret scan37998657001 success. Exactly same single accepted baseline backend-test name/stage, no new failures; downstream import tests skipped, not claimed passing. ci-comparison.json preserves actual stage/name comparison; no global CI green claim beyond reported outcome.

Canonical staged Git blobs require strict normalization/binary integrity, all immutable QA files/raw hashes, configured credential checks and expanded ZIP checks before evidence push. Public PNGs must be HTTP200/hash-verified and pinned to proof commit; original issue body and duplicate-comment state checked before GitHub mutation. No hardware/AT/ward/clinical/provider/global security certification.

## Final Decision

CLOSED — VERIFIED

All four original scoped functional criteria and applicable source/independent/root/compiled/deployment/CI/canonical privacy/pinned public screenshot gates verified. Final report publication is still integrity-checked on the final proof commit before actual GitHub closure. No unrelated baseline failures fixed or hardware certification claimed.

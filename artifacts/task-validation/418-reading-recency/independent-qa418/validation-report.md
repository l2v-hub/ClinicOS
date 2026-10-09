# Independent QA — #418 — candidate ae2a94f

Final Decision: FAILED VALIDATION

This is the original frozen attempt, not a report for any later application commit. Dedicated QA worker did not implement or coordinate application changes, read the original GitHub issue and zero comments independently, and wrote only its isolated artifacts and permitted generated-runtime locations. No GitHub write, commit, push, deploy or production patient access occurred.

## Findings

**P2 — unsafe absolute timestamp formatting**: `frontend/src/lib/readingRecency.ts:26` calls the facility formatter for explicitly zoned years below1000. `0000-01-01T00:00:00Z`, `0099-01-01T00:00:00Z`, and `0999-01-01T00:00:00Z` all independently throw `Error: Data non valida` instead of returning explicit unavailable provenance. This path is called during overview and historical form rendering and can crash the new presentation. Proof: `commands/year-boundary.log`. No application edit was made by QA; root was notified immediately and will produce a separately frozen revision.

**Not an application finding — tablet test coordinate mismatch**: requested768×1024 mobile/touch emulation applies the existing `tabletScale.ts` 0.9 viewport scale. Actual layout/visual viewport853CSS, no document overflow, rightmost caption829CSS projects to746.4 within768physicalCSS. Baseline and candidate `tabletScale.ts` are unchanged. Failed viewport assertion is preserved at `browser-final/test-results/independent-tablet-emulate-61658-ed-wraps-and-read-only-idle/`; exact diagnosis `browser-final/tablet-runtime.json`; corrected assertions check both actualCSS viewport and projected viewport. Final16/16 pass.

## Original acceptance criteria

| Exact original criterion | Outcome on this candidate | Evidence and limits |
|---|---|---|
| Valore e data/ora restano visivamente associati e leggibili. | FAIL for malformed representation boundary; normal software presentation PASS | Year-boundary throw above; associated 14px captions, full years, wrapping and screenshots on all three surfaces in `browser-correct-viewport/` |
| Nessuna misura precedente viene descritta come attuale. | PASS for tested representable history; crash prevents universal PASS | Historical labels, blank new controls, unavailable/unzoned/future guards, idle display clock and preserved synthetic draft; no mutation calls |
| Eventuali indicatori di recenza usano testo, non solo colore. | PASS for representable inputs | Independently authored 6minutes/4days/3weeks examples and neutral textual age; NEWS2 source/thresholds unchanged |
| Confrontare sul dispositivo misure di minuti, giorni e settimane, senza inventare soglie cliniche. | Qualified literal runtime comparison PASS for ae2a only | Independently reviewed genuine visible Windows Chrome3 normal2133×1145AX/DOM receipt, source snapshot and guard. Actual device pixel capture failed and is NOT certified. No ward hardware, sunlight, physical touch or screen-reader-user certification. Headless screenshots do not replace device pixels. Any later source requires a new device receipt. |

## Mandatory five-phase gate

| Phase | Result | Exact evidence |
|---|---|---|
| 0 Contract | PASS | `original-issue.json`, `task-contract.md` (originalAC verbatim, no original patient photos copied) |
| 1 Full diff review | FAIL | `review.diff`, `commands/year-boundary.log`; narrow12-file presentation diff, no backend, Prisma, API, dependencies, scoring, clinical staleness, choices or drafts changes |
| 2 Independent build and tests | PASS relative to pinned baseline, not globally green | `commands/correct-runtime-receipts.json`, compiler originals extended only to relocate buildinfo; frontend app/node and backend typechecks pass, Vitebuild pass; `commands/focused64.log`64/64; `commands/correct-runtime-full-regression.log`1225/1213/12; `commands/baseline-comparison.json` original4171220/1208/12 exact same failure set, zero new failures |
| 3 Playwright runtime evidence | PASS software cases; boundary bug still fails gate | `commands/browser-correct-viewport.log`16/16; `browser-correct-viewport/playwright-report/index.html`, individual `test-results/*/trace.zip`, `video.webm`, and `screenshots/*.png`. Real SPA7483, all API interception before navigation, no external API/clinical writes. Device snapshot reviewed separately with explicit pixel limitation. |
| 4 Security validation | PASS scope checks; unsafe timestamp is a correctness finding | `commands/security.log` source/generated build0findings; `credential-artifact-scan.json`; synthetic fixtures only, no PHI/secret emitted, zero browser console/page/HTTP errors in passing tests, no auth weakening or dependency changes. Existing healthcare controls unchanged. |

`source-before.json` / `source-after.json` cover physical SHA256 and canonical Git blob identity for app/runtime input scopes; `source-integrity.json` asserts no source mutation/untracked override, with unrelated launcher change preserved. `runtime-manifest.json` binds generated build/cache outputs, retained separately rather than copied into this sealed evidence directory. `server-stopped.json` records owned server teardown before sealing. `SHA256-MANIFEST.json` and `seal-receipt.json` bind all original attempts, scripts, reports, screenshots, video, traces, source/runtime receipts and logs.

## Failed attempts retained, not waived

- First CLI paths incorrectly assumed frontend-local node_modules; root junction resolution corrected, originals in `commands/types-*.log`, `build-*.log`.
- First copied config parser naively removed comments inside quoted globs, incorrectly including tests. Preserved `tsconfig.app.json` and `commands/rerun-build-types.log`; final configuration extends original tracked config and changes only emitted buildinfo paths.
- Raw initial full runner without `TSX_TSCONFIG_PATH` had15failures, including3SSR config failures. With original frontend app config environment, the final12failures match the immutable417 proof exactly. Neither result is claimed globally green.
- First Playwright locator incorrectly anchored a form inside a label; preserved8pass/7fail test-results and `independent-attempt1-spec.cjs`. Fixed locator points to the actual input's parent label. Next14pass/1fail was the tablet coordinate mismatch above, not hidden as a source fix; `independent-attempt2-spec.cjs` preserved. Last16/16 includes explicit mobile/tablet emulation, bothDST transitions, expanded historicalNEWS2, bounded incomplete history and keyboard assertions.
- Initial server Windows import lacked fileURL conversion; unsupported-ESMURL error was corrected in QA harness only. The initial failure was visible in tool output; it produced no listening server. Subsequent server log and receipt retained.

The confirmed formatter bug prevents readiness even though the normal software suite is green relative to baseline. Publication and issue closure remain denied for this candidate. Skills QA Gate, Playwright Evidence and Agent Loop required the independent run, evidence bundle and failure verdict; Parallel Evidence Remediation defined artifact retention and assertion minimums. Its external publication steps were explicitly not authorized for this worker.

Codex must now re-run the QA Gate.

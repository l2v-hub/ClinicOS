# Independent QA Gate — issue 408

Final Decision: BLOCKED

Fresh independent QA session reviewed original issue 408 and all comments (empty), root contract, architecture review, full three-file application diff from baseline `973d78e5e109032a36cf89cf80fd8eb2a848a649` to frozen candidate `f58fbbd3337fabe68315dbd3cf7d295219dab58e`. No application changes, clinical writes, provider mutations, commit/push/deploy/issue changes by this QA agent.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS scope and original four criteria preserved | task-contract-snapshot.md, architecture-review-snapshot.md |
| 1 Diff review | PASS surgical shared grid TSX/CSS plus seven regressions | review below, source-receipt.json |
| 2 Build and tests | PASS types/build/security; 7/7 issue and 54/54 focused; full 1190/1178/12 known baseline, 0 new | command-results.json and corresponding logs |
| 3 Actual SPA browser | PASS 10 result assertions, synthetic desktop/mobile emulation, grayscale and dialog evidence | test-results/browser-results.json, screenshots/, trace.zip, mobile-trace.zip, video/, playwright-report/index.html |
| 4 Security/privacy | PASS scoped source/runtime/proof checks | security-scan.log, guarded request/error arrays, source receipt |
| 5 Acceptance | BLOCKED original AC4 genuine device in intense light absent | acceptance table below |

## Acceptance

| Criterion | Result |
| --- | --- |
| AC1 States visually distinct in grayscale | PASS desktop and emulated mobile: visible short state text, distinct symbols, clear remaining-dose count, mixed administered/non-administered breakdown and incomplete-zero presentation. Inspected grayscale result screenshots; not a full accessibility certification. |
| AC2 Oggi persistent text | PASS Rome date 9 October while host America/Los_Angeles remains 8 October; sticky header stays at grid top after internal vertical scroll. Another week has no marker. |
| AC3 Cell opens state/count/detail preserving date/time | PASS actual SPA Enter opens exact 07:15 and 08:00 within one server band, correct one versus three loaded doses, synthetic drug/dose/route/status/refusal reason, close restores same button focus. Actual bounded load-more merges positive and zero partial counts. |
| AC4 Mixed data and device in intense light | PARTIAL mixed synthetic data PASS; actual device in intense ambient light UNVERIFIED. Headless desktop/mobile, grayscale filter or ordinary visible desktop cannot complete this explicit criterion. |

## Diff review

- `frontend/src/components/shared/TherapyCalendarGrid.tsx`: count-only branch gains visible symbols/text and truthful remaining count; mixed detail retained, partial-zero overrides all-loaded-done tone. Patient non-count branch unchanged; seven render regressions independently pass including recorded-not-administered compatibility.
- `frontend/src/components/shared/TherapyCalendarGrid.css`: selectors scoped to shared grid, count button fits available width, state/detail wrap without ellipsis or hidden text; header remains sticky. No general palette/navigation/control or API/schema/auth/config changes.
- New regression file exercises each state, symbols, true today, incomplete counts and unchanged patient branch. No debug logging, new dependencies or unsafe HTML.
- Visual limitation: at emulated 390px, existing horizontally scrollable week grid produces narrow columns and multi-line word wrapping. All state text remains available and unclipped; existing Giro alternative remains usable. This is not a broad mobile-layout or outdoor-readability certification.

## Independent commands

Working directory `C:/w-408`; only one owned QA server/browser lane.

1. `$env:QA408_OUTPUT='artifacts/task-validation/408-calendar-states/independent'; node artifacts/task-validation/408-calendar-states/qa-commands.mjs` (exit 0; full suite itself retains 12 exactly baseline failures, not falsely all-green).
2. `node artifacts/task-validation/408-calendar-states/qa-server.mjs` (loopback 7472, runtime-only QA API target, no .env/config writes).
3. `$env:QA408_OUTPUT='artifacts/task-validation/408-calendar-states/independent'; node artifacts/task-validation/408-calendar-states/qa-browser.mjs` (exit 0, 10/10).
4. Same output variable, run `qa-source-receipt.mjs`, then `qa-publication-receipt.mjs` (source-bound immutable manifest).

First browser debug attempt incorrectly placed zero-hasMore fixture on Monday 12 outside selected week 5–11; second omitted two read-only SPA fixture endpoints. Both failed attempts preserved under debug-attempts and excluded from successful manifest. QA fixtures corrected; application remained frozen throughout. Successful guard arrays have zero clinical writes, unexpected requests, external network, console/runtime errors or HTTP failures.

No backend/DB/provider calls. Synthetic identifiers/medications only; no original audit patient attachment re-used, no token/PHI in artifacts. Session token is explicitly synthetic non-secret. Source/build scan has zero findings; no new package additions; baseline dependency vulnerabilities are not claimed fixed. Manifest excludes debug attempts, generated builds/metadata and known unrelated launchers. Root must independently rerun commands/browser and inspect source-bound result images before any further publication; missing AC4 prevents release/closure.

**Codex must now re-run the QA Gate.**

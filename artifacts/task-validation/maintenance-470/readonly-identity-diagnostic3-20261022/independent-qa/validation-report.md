# Independent QA validation report

Verdict: **READY FOR CODEX QA**

Fresh QA authored none of the implementation. Reservation nonce 489c1094-3cf8-4665-9128-535b213cdde1 and root state commit e4ca98fd41b10f9c8f32f1bd45e9fa7bbeae1ed7 preceded this session. Frozen source commit fa88482503e08b191395473a599325831f7e4bd7. Parent PR500 continuation3 retains prior attempts1+2 and two-review lineage; root owns canonical history verification and subsequent gates.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | task-contract.md; contract.log |
| 1 Entire diff | PASS | whole-source.diff; scope.txt; git-bindings.json; binding-review.json |
| 2 Syntax and tests | PASS | baseline-tests.log (185/185); probes.mjs; probes.log; matrix-results.json (40/40) |
| 3 Browser surface | PASS | browser-setcontent.cjs; browser-results.json; surface.html; screenshot.png; trace.zip; artifact-validation.json |
| 4 Security | PASS | security checklist below; matrix-results.json; source hash inventories |

Full 117-line two-file Git diff reviewed. Diagnostic production changes only fixed-enum projection and own-errors branch. Existing rejection predicate retained. Unknown codes override familiar message cues and remain unknown. Bounded message/code/entry parsing never transfers provider values into receipt. Test changes additive. Three unchanged helper/workflow files retain baseline blobs and all five Git modes are 100644. Snapshot before/after byte and mode inventories match.

Applicable build is Node22 syntax plus standalone focused tests: application/frontend untouched and no imported dependency change. Existing185 suite run once independently, 185 PASS/0 FAIL. New main-output matrix runs 40 cases with actual public main output callback: exact annotation and blocked phase/code/outcome, fixed two-key projection, total-output length, no sentinel/provider payload, identity-only request body/headers/endpoint, redirect:error, exactly1 native+1 GitHub and zero CLI/private target reads. Cases include null/empty/malformed, arrays20/21, message512/oversized, missing/empty message, extensions null/object secret/DSN/PHI synthetic sentinels, code object/array/long/misleading unknown, schema prefix/boundary, known/mixed, data-with-errors and both auth modes. Baseline suite covers unchanged success paths.

Browser rendered actual observed matrix JSON through a QA-only local HTML surface, asserted all40 rows and240 cell values plus count and synthetic label. Console errors0, HTTP errors0, network requests0. Screenshot PNG dimensions and trace ZIP integrity verified. Initial file:// navigation failed due browser administrator policy; original browser.cjs/browser.log preserved. Safe setContent retry passed without source changes, installs, server, or network. This environment limitation is not a diagnostic failure.

Security checklist: secrets PASS (synthetic credentials only; no raw output); PHI PASS (synthetic-only fixtures); logging PASS (fixed safe enums and bounded serialized receipts); input validation PASS (20 entries,512 message chars,64 code chars plus existing response bounds); AuthZ PASS (no acceptance or identity credential/scope changes); injection/XSS PASS (no SQL/HTML/application route changes, surface values fixed enums); dependencies PASS (no package additions); config PASS (no CORS/env/prod/installer/workflow weakening; fixed endpoint/query/headers/redirect preserved). No security findings.

No source modifications, live provider/auth/database/network/API actions, installation, native gate, Claude review, deploy or final Codex gate are claimed. Root handles remaining canonical metadata and external gates. Source unchanged, QA STOP sealed.

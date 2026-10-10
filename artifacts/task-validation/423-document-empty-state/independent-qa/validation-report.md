# Independent QA2 — issue423

Verdict: READY FOR CODEX QA

Candidate:3f911cbd281d7c93c4796e97d5940258ceb331f0. Accepted baseline:3cd984a5a40f1fe5cdc368dbcc4bb629bd6d1510. New dedicated QA2 neither implemented nor coordinated these application changes. This is independent QA readiness, not release/closure authorization.

## Five-phase gate

| Phase | Result | Objective evidence |
|---|---|---|
|0 Contract/original criteria|PASS|fresh-issue.json, input-receipt.json, task-contract.md, contract-validation.log: native CONTRACT VALIDO, original four criteria, comments0; original clinical image not downloaded|
|1 Full diff review|PASS|full-reviewed-diff.patch, diff-review.json, independent-review.md; exact seven paths,9–470 lines, no unrelated application/backend/schema/config/dependency change|
|2 Independent build/tests|PASS with accepted named baseline waiver|commands01 logs/command-results.json: FE/BE noEmit, frontend tsc-b and actual Vite build exit0, focused44/44, frontend secret scan PASS. Full1297/1285/12 exit1; all12 exact accepted names from source-bound proof057dc6ca6374203d4a1c86d1e5c4b14b73810d48,0 new. Not globally green, no test loader/assertion weakening|
|3 Actual native SPA/runtime|PASS|browser03/run/test-results/browser-results.json:46/46 assertions,30 contexts; baseline02 separately2 reproduction cases; native screenshots, traces, video, HTML assertion receipts and logs|
|4 Security/privacy|PASS scoped|security01/comparison.json native changed-source baseline0/candidate0, frontend scan PASS, publication-scan01.json zero leaks/515files/9615ZIPmembers; manual authZ/XSS/PHI/config/dependency review. Not global CVE certification|

## Original acceptance criteria

| Original criterion | Result | Evidence |
|---|---|---|
|Lo stato vuoto indica chiaramente il passo successivo.|PASS|desktop/mobile empty-next-step-viewport.png: Nessun documento, first action, type/file/photo/save guide, permitted formats/15MB; native Add enters original form with no automatic write|
|Categorie vuote e controlli inattivi non dominano la schermata.|PASS|desktop/mobile empty-next-step screenshots: collapsed native disclosure, no tree/search/filter/selection/print controls. Keyboard Enter opens/closes all10categories; baseline02 screenshots independently reproduce old management-heavy view|
|Le categorie restano disponibili al primo caricamento senza cambiare tassonomia.|PASS|desktop/mobile categories-expanded and first-native-form screenshots/traces; exact10labels,9optgroups/22existing upload types; assessment PDFs explained as generated from Modules; unchanged taxonomy/IO source diff|
|Se il ruolo non può aggiungere, mostrare una spiegazione utile e il referente.|PASS|desktop/mobile empty-no-upload/no-save/missing screenshots and assertions: no add/form/write; useful coordinator/administration referent. Operator/admin same capability behavior; role label not authority; null-policy unchanged compatibility|

## Preservation and safety

Existing-file note/details editing is preserved with save but denied classify: native Modifica dettagli opens, existing Prescrizione type disabled, stored synthetic file retained; note-only save emits exactly one scoped mocked PUT with original record id/type/file id preserved, no POST/PATCH, native reload/re-login reasserts edited note and type/file. Same note-only behavior with denied upload/save allowed. Final viewport screenshots: browser03/run/screenshots/{desktop,mobile}-no-classify-metadata-form-type-viewport.png, metadata-form-save-viewport.png, metadata-reloaded-viewport.png; corresponding no-upload results. Denied/missing save hides edits/removal and emits0clinical mutations. Removal cancellation adds no write.

First synthetic PNG emits exactly scoped POST then cartella PUT per viewport; populated management and filename survive native reload. Search-zero remains distinct from true empty. Delayed/incomplete/error metadata never says true empty; native retry resolves truthfully. All cancellation/missing-file paths write0; XSS-shaped title remains literal escaped text with0img.

runtime-summary.json: eight recorded synthetic mutations total (two first-upload POST, two first-upload PUT, four metadata-only PUT),0PATCH. Unexpected API/external/clinical writes/page errors0. Two deliberately mocked503 document-list responses total, exactly two corresponding browser resource console errors; no other console/HTTP errors. Persistence is guarded mock transport, NOT real database or production-write proof. No production APIs, patient PHI or original clinical photo downloaded.

## Artifact inventory and replay

Final candidate: browser03/run/screenshots/,trace/,video/,playwright-report/index.html,test-results/browser-results.json; browser03/browser.log/server.log/lane-receipt.json and frozen recipes. All final screenshots are real native screenshots; viewport shots demonstrate actually visible pixels after native scroll. HTML is a Playwright-library assertion receipt, not a native Playwright Test reporter.

Baseline comparison: baseline02/run equivalents, two cases separately counted. Earlier successful browser02/baseline01 and selector-failed browser01 artifacts/recipes remain intact; attempts.md/attempt-analysis.md disclose their exact status. No failed attempt erased.

Candidate source-final-bound.json binds1551 physical clean/unchanged application files against actual Git blobs; baseline-source-final-bound.json binds1546. Strict UTF-8 CRLF-only normalization, binary exact. Unrelated tracked start-claude-team.ps1 modification preserved/excluded; checkout is not claimed globally clean. All application source/manifests/locks/env/config unchanged during QA.

browser-plan.json specifies recipes/browser.mjs -> browser03/run,46 cases. Final actual-baseline path baseline02/run. replay-readme.md documents byte-identical root replay on7530 and compiled alias selection via APP_URL with all clinical/auth transport still guarded before wire. lane-handoff.md records RELEASED; final owned PIDs25432/41784 stopped and port-final-released.json free. Root must independently replay and apply separately authorized release gate; QA2 did not publish, close, commit or push.

## Explicit limits

No real DB persistence, human authenticated production session, hardware/sunlight or broad responsive redesign claim. Previous optional native focus-based live revocation probe did not refresh auth/me; no unchanged retry or live-runtime revocation claim. Current subscribe/open/render/remove/type/save guards reviewed statically, explicit denied/missing loads runtime tested; server remains authorization authority. Twelve unrelated exact accepted full-suite failures remain. Canonical final publication scan/manifest seal follows this report and binds all publishable evidence without runtime caches/node_modules.

Codex must now re-run the QA Gate.

# Validation Report — bug 406

Final Decision: CLOSED — VERIFIED

Application commit: `c11c0990f6313a53a8bcde467046eecef69e012a`. Evidence commit: `6c83db4bb3fb98acd34c7b4245cdd86b04c53565` on `codex/bug-406-prn-route`. Main remains exactly the application commit. Independent QA and the root independently passed scoped gates on the same 1427-file source hash. All 96 committed evidence entries match their recorded SHA256; both embedded synthetic screenshot URLs return HTTP200.

| Acceptance criterion | Result | Proof |
| --- | --- | --- |
| AC1 no regimen in route choices | PASS | Browser native route options, legacy review field, frontend/backend tests |
| AC2 type selection preserves route | PASS | All three types, PRN payload/reload, inactive schedule drafts |
| AC3 separate route/type preview | PASS | Desktop/mobile actual SPA screenshots, calendar dialog, labelled native controls |
| AC4 backend validation and explicit legacy review | PASS | Real PostgreSQL zero-write rejects, merged PUT guard, explicit repair, status-only clinical preservation, documented review procedure |

Types/build/security PASS; frontend focused 38/38, backend focused 48/48, real isolated PostgreSQL 6 issue-specific +21 regressions PASS, browser9/9 PASS. Full frontend suite1179/1167/12 exact baseline failures/0 new failures; no clean-full-suite claim. See immutable independent report and root-rerun report for details and limitations.

Production verification: Vercel `dpl_FsEgnzXDHUsKqDs67R3swyPnjpXe` READY at exact app commit, main alias HTTP200, real emitted clinical chunk includes both guards/labels. GitHub backend run37893378620 successful; actual checkout from `git log -1 --format=%H` is c11c0990 (runner-image metadata is not checkout). Printed Railway deployment208694a8-aed2-4895-abf4-e101cb67c40f provider SUCCESS, image digest pinned in deployment-receipt.json; healthHTTP200. Production checks read-only, zero patient mutations.

GitHub proof: https://github.com/l2v-hub/ClinicOS/issues/406#issuecomment-6075679684. All four issue criteria checked; verified CLOSED2026-10-09T06:31:22Z. Root/QA runtimes stopped. Issue405 remains pending real AT and excluded; audit429 is not claimed complete. PostgreSQL18.4 local differs from CI16; browser transport synthetic persistence and real DB checks are separate. Existing dependency vulnerabilities and 12 baseline failures are not resolved by this bug.

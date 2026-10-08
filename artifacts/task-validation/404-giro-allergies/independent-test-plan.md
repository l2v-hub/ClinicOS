# #404 independent QA plan

Owner: new dedicated QA agent, not application author/coordinator. Application freeze: `848ae9613c3cfe2a6eae81308719964475dc9afe`; baseline: `64b3427be9e2d73ae47303f31b468b3c89f0c214`. QA writes only this evidence folder and ignored build output; no application/config/dependency/release changes.

Read Phase0: applicable CLAUDE.md, qa-gate, agent-loop-quality-gate, referenced parallel-evidence-remediation/run-clinicos/validation rules, issue-source.json (full body; comments[]), task-contract.md, exact six application paths, existing #403 harness and scripts/e2e/ux-w2-therapy.mjs. Existing script's DB mutations are not executed. Use synthetic intercepted transport against actual index.html/main.tsx/App.tsx only.

| Criterion | Objective tests |
|---|---|
| AC1 | Eight visible cards cover known/contradictory status, explicit absence, status-only denial, missing/unknown, malformed array status/null list, internal patient mismatch and malformed optional severity. Pure tests additionally cover null/top-level mismatches/status-only absence. Denied capability yields zero reads, capability revocation clears projection;401/403/503 errors remain unknown and retry fresh. Read timeout; deferred old responses across time/date/unmount and actual supervisor logout/nurse login. Authenticated no-store fetch observation, max4 active requests, no chart sentinel in DOM or storage. |
| AC2 | Text allergen/severity/reaction before actual action list in DOM and visibly readable at1150x1004/390x844. Distinguish source absence/denial/unknown without color alone. Document has no horizontal overflow. |
| AC3 | Pointer and native Enter/Space disclosure; upper/lower cards, focus assertions, preserved hash/date/hour/non-default filter/patient and exact window scroll through open+close. Zero navigation/clinical writes. Literal HTML-like note renders text, creates no img/script/execution. |
| AC4 | Actual supervisor admin shell: Somministra opens real confirmation dialog with correct synthetic patient/drug/hour; cancel zero writes; confirm exactly existing patientId/therapyId/date/fascia/confirmed:true (no allergen/drug/dose extras), refresh shows administered and page.reload retains simulated persisted state. Nurse original issue profile also verified without writes. |

Independent validation: types, tsc-b, production Vite build, allergy-status/new-allergy/Giro in-place34 tests; source+bundle secret scan; full suite compare exact12 baseline identities. Receipt hashes full tracked frontend/build inputs, candidate/tree, six changed paths, harness/issue/contract, built files and final evidence.

Evidence: actual SPA screenshots, trace.zip and scenario traces, named desktop/mobile videos, HTML and JSON assertion report. Reject every unexpected localhost API and all external URLs except inert font CSS. Assert no unexpected console/runtime/HTTP errors. Expected fault-test401/403/503 are explicitly classified, never hidden as success responses. Transport simulation proves refresh/reload UI state only, not live database durability/authorization/clinical compatibility/hardware safety.

Policy decision: ALLOW frozen-source read/test and issue404-only synthetic evidence. DENY real patient/remote mutations, dependency install, app edits, commit/push/merge/deploy/close. Return ownership and stop server after evidence completion; root reruns QA and controls any independently authorized publication.

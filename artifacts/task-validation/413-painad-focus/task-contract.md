# Task Contract

## Task
- Title: 413-painad-focus
- Type: bugfix
- Date: 2026-10-09

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Auth / Permissions | no |
| Privacy / Security | yes |

## Current Behaviour
Accepted application3790a95b; isolated C:/w-413. Root sole application writer, architecture read-only, fresh independent QA after freeze. PAINAD active form repeats chart identity, workspace identity and paper anagrafica; description, draft resume and metadata push first question below fold. Active local draft has redundant resume; actions at bottom only. Preserve main dirty checkout and unrelated launcher changes. AgentDB isolated checkout may lack DB: use source/ADR fallback, never treat coordination ledger as release authority.

## Expected Behaviour
PAINAD-only interactive presentation: one contextual identity, compact metadata, first question focused and visible on new/resumed compilation, nonredundant active draft status. Persistent progress/actions in actual chart scroll container, keyboard/mobile tested. Default standalone identity retained; other modules/read-only preview/final unchanged. No clinical scoring/text/definition/engine/version/transport changes. Save/preview locking and errors unchanged.

## Acceptance Criteria
- AC1 (original): All’avvio la prima domanda e il suo nome accessibile sono immediatamente raggiungibili. Actual synthetic SPA desktop1150x1004 and mobile390x844 assert first question bbox/focus/name; focus once per selected draft, never steal each answer/date edit.
- AC2 (original): Nessun comando Riprendi ridondante mentre il modulo è attivo. Active local draft gets Bozza in modifica; other inactive drafts remain resumable; legitimate version-conflict reconciliation unchanged.
- AC3 (original): Progresso e azioni sono disponibili senza risalire la pagina. Actual scroll assertions at start/middle/end, not just CSS text; 0..5 progress and save/preview state; focus unobscured, no horizontal overflow.
- AC4 (original): Testi, punteggi e criteri della scala validata restano invariati; il parziale rimane distinto dal completato. Byte-pin definitions/engines/version source and option text/values; partial never complete/final, preview only complete, read-only defaults unchanged.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | RED SSR compact/default controls, option text/value parity, partial and locking |
| Integration | yes | types/build/full-suite exact delta vs accepted412 |
| Playwright | yes | guarded actual SPA baseline + keyboard first question, 0..5, sticky start/end/mobile, draft resume/reload, error/preview boundaries |
| Persistence after refresh | yes | synthetic local draft retains answers; never test production writes |
| Security/privacy scan | yes | affected scope, unchanged auth/transport/deps, no PHI/secrets |

## Evidence Plan
Required: validation-report.md, source-bound test outputs, synthetic screenshots/trace/video, exact source receipt, fresh independent QA then root rerun, deployed compiled SPA checks. Git screenshot raw blob hashes, credential/archive scan before public proof; no original audit patient images. Twelve pre-existing frontend failures and one existing broad backend CI failure disclosed, never global-green claim. Backend unchanged accepted409.

## Risks
User authorized commit/push/deploy/proof/verified closure. Independently source-bound release receipt required. Active sticky ancestors and mobile focus may obscure content: test real bounds and iterate. No pending405/408/410 source inclusion, no hardware or screen-reader claim. Patient identity never absent, standalone full identity preserved. Validated read-only paper stays identical.

## Gate Status
READY FOR IMPLEMENTATION

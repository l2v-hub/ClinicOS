# Task Contract

## Task
- Title: 414-draft-status
- Type: bugfix
- Date: 2026-10-09
- Scope owner: root sole app writer in C:/w-414,baseline e01bd55114e2b5b1615b4088d988a41aad60eb80. One bug active; primary dirty checkout preserved.

## Impact Classification
| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour
Technical reload/tab/server hint and Draft label; saved indicator lacks meaningful locality and save timestamp. True local guarantee is same open browser window/sessionStorage; logout clears local drafts. Confirmed saved drafts are accessible only to author with ongoing patient scope. Receipt/state/client/store already validate successful saves and fence stale operations; do not change them. Root read original GitHub issue414/comments,zero comments. AgentDB recall unavailable isolated database; inspected source/ADRs instead. Ruflo hierarchical3 ledger,not release authority.

## Expected Behaviour
Shared Italian presentation derived from existing draft state: unsaved local,unsaved changes,pending save,unconfirmed result/failure,confirmed saved. No optimistic Bozza salvata; timestamp only verified record.updatedAt and label last confirmed save. Explain local edits only same open window and not available on other devices/after logout; saved draft only same author/account while still authorized to patient,not other operators. Actions use existing save/retry/reconcile; no automatic submit/finalize or new persistence/API/permissions. Apply across assessment modules,keep413 compact first focus/sticky toolbar and validated scale output unchanged. No added misleading whole-device promise.

## Acceptance Criteria
- AC1 original: Località e disponibilità della bozza sono comprensibili senza la parola server. Italian labels,where/how/author access; no Draft/server/tab-dependent technical promise in affected draft state UI. Local not claimed available to entire device. No locality promise when persistence blocked.
- AC2 original: Lo stato cambia solo dopo conferma effettiva del salvataggio. Existing acknowledged DTO only; dirty edits never shown currently saved,busy/pending/unverified/failed cannot show saved success. Last confirmed save timestamp never confused with observation date.
- AC3 original: Fallimento e tentativo in corso hanno messaggi e recupero chiari. Busy polite status; failure exact preserved/retry/reconcile paths,no data loss or duplicate operation; unknown receipt not successful. Blocked browser storage clearly no reload guarantee.
- AC4 original: Testare cambio tab, riaccesso e dispositivo distinto in ambiente di test. Real synthetic SPA chart-tab change/reload/auth exit+new access and two independent browser storage contexts: unsaved absent elsewhere/after logout,confirmed saved reloadable same author,other operator forbidden. Isolated real local DB/service read guarantees tested with no real patient data; explicit distinction mocked frontend transport versus DB tests,no production writes.

## Test Plan
| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | RED state text/conditional success/timestamps/uncertain failure/storage limits,SSR |
| Integration | yes | existing draft store/client/persistence/version and413guards,full suite exact delta |
| API | yes | unchanged author-only save/read/history on isolated synthetic local DB; not production |
| Playwright | yes | actual SPA baseline/after desktop+mobile,held save/failure/retry,chart change,reload,logout+riaccesso,separate contexts |
| Persistence after refresh | yes | local same-window versus saved authenticated recovery distinct contexts |
| Security/privacy scan | yes | source/dist secret scan,full baseline delta,touched scope AuthZ no weakening |

## Evidence Plan
Source-bound task/report,types/build/focused/full regression outputs,synthetic before/after screenshots/trace/video/HTML/rawresults,independent fresh QA then root rerun. Exact immutable source receipts and sanitized DB test results. Guard all production backend requests before wire for compiled online checks. Credential/ZIPmember scan+canonical Git hash evidence;GitHub screenshot embed pinned proof commit. Exact Vercel Git commit READY/alias/chunks200;unchanged accepted409backend retained. Broad CI unchanged baseline failure explicitly disclosed. Independent QA never writes app files/promotes/closes.

## Risks
All modules share store but have legacy/paper forms; keep independent state presentation reusable and opt-in compact placement to avoid413first-question regression. Never infer storage save guarantee from lack of dirty alone; account pending/errors/storage failure,missing/invalid timestamp. Existing author-only rules govern other operators; do not broaden access. Freeze source before QA,use dedicated artifact paths and serialize browser and local DB. Backend definitions/scale criteria/version/schema/client/store unchanged. Pending405/408/410 excluded. No hardware/screen-reader certification or global security/CI green claim. Direct user authorizes scoped commit/push/deploy/verified closure;source-bound policy receipt required before promotion.

## Gate Status
READY FOR IMPLEMENTATION

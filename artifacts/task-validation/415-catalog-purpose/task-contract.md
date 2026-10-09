# Task Contract

## Task
- Title: 415-catalog-purpose
- Slug: 415-catalog-purpose
- Type: bugfix
- Date: 2026-10-09

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Original GitHub415 read with0comments, OPEN,P2oldest unblocked after accepted414. Isolated C:/w-415, branch codex/bug-415-catalog-purpose, baseline288dac948c8a46e26e1bef87d6266b2497727566. Root sole application writer; primary dirty checkout untouched. Catalog ten rows have names, metadata and icon-only chevron/+ with tooltip; no visible purpose. Existing open intent prefers latest final but falls back to local/saved drafts; cannot merely rename that ambiguous action Storico. NonPAINAD Workspace automatically loads current when no explicit entry. Catalog API has latest-final timestamps and own-draft metadata, no score/result. Legacy dates are not proof of finalized completeness. Error/loading must not be reported as empty. Ruflo ledger swarm-1791547345161-h790y0 hierarchical3; AgentDB unavailable isolated, source/ADR fallback. Architecture teammate read-only; new dedicated independent QA after freeze.

## Expected Behaviour

Visible brief purpose next to unchanged official current catalog names. Reuse existing source-bound current assessmentDefinition descriptions verbatim for six paper scales and transfers; Braden purpose uses provided tracked blank template wording about risk of compromised skin integrity, no new formula/threshold or clinical recommendation. Existing Medicazioni/Contenzioni titles may be used for concise non-scale scope. No invented clinical signoff or new clinical model. Textual Compila and Storico with distinct primary/secondary treatment and action-specific accessible names, plus visible Riprendi bozza/Elimina bozza labels when allowed. History entry explicitly consults stored history and never creates/resumes an unsaved draft automatically; new entry and resume remain existing store/capability paths. Preserve414status and413focus. Consistent empty/own-draft/latest-final wording, clinical assessedAt distinct from registered/finalized timestamps. Never invent a result not present in bounded catalog DTO; no additional full clinical read just for a score. Legacy dates stay labeled date riportata, not Ultima completa. No store/client/backend/schema/API/auth/config/dependency changes, no automatic writes/finalization.

## Acceptance Criteria

- AC1 original: Ogni scala ha uno scopo breve, senza modificare il suo nome ufficiale. All seven scales visible existing source-bound purpose, current names unchanged; no tooltip dependence. Approved/source wording reused, no independent clinical approval invented.
- AC2 original: Nuova compilazione e storico hanno azioni visive distinte. Compila primary versus Storico secondary, visible text and names; history not new/resumed local compilation. Only authorized create; no writes from catalog/history navigation.
- AC3 original: Gli stati Nessuna compilazione / Bozza / Ultima completa sono coerenti. Distinguish no finalized assessment, own or local draft and actual finalized record/date; error/loading never empty. Existing local-window/same-author guarantees unchanged; legacy only available clinical metadata with no unsupported completeness/result.
- AC4 original: Il catalogo è navigabile da tastiera e comprensibile senza affidarsi al tooltip. Native named buttons, logical row action order, visible keyboard focus, Enter/Space actions, desktop/mobile wrap without horizontal overflow, no required title-only instruction. Existing413firstquestion focus and414acknowledgment/recovery remain unchanged.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | RED SSR purposes/textual actions/read-only/empty/draft/final/error and entry intent nonmutation |
| Integration | yes | catalog workflow/reader/store,413focus,414draft status,types/build/full exact baseline delta |
| API | no | unchanged bounded API/read permissions; no new endpoint or DTO, no clinical result fetch |
| Playwright | yes | actual synthetic SPA baseline/after, keyboard native actions, all route intents, empty/local/saved/final/error/loading, desktop/mobile |
| Persistence after refresh | yes | existing local draft retained and not overwritten by history/new navigation; any saves synthetic only, existing receipt semantics |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | source/dist secrets, scoped AuthZ/capabilities/PHI/XSS/no new endpoints or logs; publication ZIP/credential scans |

## Evidence Plan

Contract/report, raw tests/types/build/full delta, baseline and actual-result synthetic screenshots, trace/video/HTML/rawresults. New dedicated QA reads originalissue/comments/full diff independently, owns only its evidence subtree, never publishes; root rerun serialized browser lane. Freeze exact application source commit/hash before QA. Scoped release receipt before commit/push main; exact-source Vercel READY/alias/chunks and compiled guarded production SPA rerun with all backend calls intercepted before wire. No production patient writes. Preserve baseline failures and exclude pending405/408/410/429 criteria. Immutable screenshot/proof commit with explicit ignored-log inclusion and independent-manifest completeness, Git blob/hash+ZIPmember+credential checks; screenshot embeds on GitHub, closure only after originalAC and deployment verified. User authorized scoped publication/closure, no extra authority inferred.

## Risks

Avoid misleading history label for existing open fallback. Explicit catalog history intent must be patient/type scoped; don't leak stale entry when switching modules or patients. Existing compiled scale output, legacy data, authored drafts and access boundaries unchanged. No score fetched/invented when DTO lacks it; stale cached metadata during error/loading not treated as confirmed empty/draft. Official names and brief purposes are existing source descriptions, not independent clinical certification. Browser device emulation not hardware evidence. No global CI/security-clean claim, baseline comparison exact. One issue/writer; no release with missing screenshot/log/source receipt. Files to touch only catalog presentation/CSS, small intent adapter/Workspace+PatientDetail plumbing if necessary, scoped tests; no unrelated refactoring of existing large files.

## Gate Status

READY FOR IMPLEMENTATION

Scoped legacy navigation: three kept-alive modules receive an explicit history/resume view request. This changes visibility only, preserving form answers, editId and the existing draft hook/storage. Fresh history intent replaces a previous new request; resume explicitly reopens preserved work. No reset, remount, implicit update or storage contract change.

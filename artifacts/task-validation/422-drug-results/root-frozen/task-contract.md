# Task Contract

## Task
- Title: 422-drug-results
- Slug: 422-drug-results
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

Original422/comments freshly read, labels empty (not a clinicos-requirement): same-name packages flatten description/form into a muted long secondary line; every document button repeats Apri RCP without package identity. API supplies optional authoritative descrizione/forma and no package-strength field or catalog total. Existing cursor25 search, zero-result scan continuation and retry are accepted behavior. Root sole writer in isolated C:/w-422 from accepted80b313; dirty primary/blocked candidates preserved. Read-only architecture review complete; NEW independent QA required, single browser lane.

## Expected Behaviour

Clear unchanged denomination then prominent full official package description (contains strength when source supplies it) plus distinct pharmaceutical form; separate AIC and secondary PA metadata. Do NOT fabricate/extract clinical strength from ingredient quantity or volume. Full package-specific accessible document action with exact original callback/URL. Reuse TableFilters for exact source-form option and literal package/strength text search on loaded denominations/descriptions; explicit loaded-only count and removable filters. Query/criterion changes atomically clear filters, while Azzera retains original query/criterion. Original lifecycle/cursor/ordering/identity, errors/retry/zero-page continuation stay unchanged. No backend/API/auth/config/locks/provider changes.

## Acceptance Criteria

- AC1: Same-name packages visibly distinguish supplied dosage/package description and form on first scan; full original strings and AIC remain present, missing metadata explicitly unspecified. Desktop1150x1004 and mobile390x844 wrap without horizontal overflow; no invented strength or document validity claims.
- AC2: Every RCP/FI action accessible name includes document type, exact denomination, description/form when present, and AIC, unique for same-name packages. Keyboard action opens unchanged source document URL with exact original package; missing document remains non-actionable, revoked state retained.
- AC3: Filters show original loaded count and filtered count, never fabricated catalog total; explicitly limited to loaded packages. Same raw query/criterion/cursor25 and same source order/record identity retained. Azzera restores loaded results without searching anew, query/criterion changes reset filters atomically. Zero local matches/empty server page still allow continuation; failure/retry preserve records/cursor.
- AC4: Long/similar names, many25+continuation packages, no backend results vs no local matches, partial/missing metadata, PA quantities differing from package, error/retry and late response verified. No real clinical/provider calls or official-RCP correctness claim.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | TDD pure presentation/filter/reset/names, existing medicationSearch/farmacoDocumento/correspondence and shared filter contracts |
| Integration | yes | frontend/backend types and actual repository Vite/React compiler production build, full exact12baseline delta |
| API | yes | guard/intercept synthetic catalog query, criterion, cursor continuation/error/retry and exact document package; no real clinical writes |
| Playwright | yes | baseline before edits + desktop/mobile all4AC + new independent QA + root identical rerun + compiled static online |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | yes | scoped source baseline, no raw HTML/XSS, configured credential and expanded trace ZIP scan; synthetic-only data |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Official package strings are presentation inputs, not prescribing advice. Do not infer strength from PA quantity/volume or normalize source records. Text filter is literal case-insensitive description/denomination matching, not clinical dose equivalence. Form options from all loaded records; counts explicitly loaded-only; don't hide Continue/retry on zero visible rows. Atomic search/filter state avoids transient stale combinations. Keep lifecycle/hook/backend/schema/auth/config untouched. Root alone implements scoped RicercaFarmaco.tsx/.css + pure helper/test; shared TableFilters reused readonly. Actual compiler maintained, all clinical calls intercepted BEFORE wire; no real patients/RCP content/provider/hardware assertions. Source receipts exactcommit plus physical hashes, pre-run frozen recipes and ALL independent attempts immutable. Full1243baseline1231PASS12FAIL and CI exactsingle scope failure remain honest, zero new failures. All4criteria + independent/root rerun + READYexactdeploy + complete CI comparison + pinned public screenshots required before closure. Ruflo swarm max3 initialized; guidance registry absent and prior memory/route OOM unchanged, source fallback no retry/install. User explicit release authorization overrides stale local manual-only deployment restriction, actual current Git/Vercel pipeline verified for421.

## Gate Status

READY FOR IMPLEMENTATION

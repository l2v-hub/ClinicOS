# Independent QA6 — PR483 / original batch432 / continuation6

Final Decision: VERIFIED — independent QA gate only; root owns publication/release.

Source commit `06751cad390103a67c82cf42721ab85438e1f22e`; six-source digest `1101ac764318611bfac1e4799c245823a23cad4fd19b48b6dbd940ffe99ad95f`. Handoff SHA256 `efa47da8e919a991da813693c87f518f112e92be34cb5b96b8119377f482680c`. Frozen origin manifest: 4,743 files, digest `3287751246fdbc1a9130aef1b4a2c2034d4ac67ff6f1b8613fccfbd15f404623`, manifest SHA256 `a44e90513c1500df6defaf70afca443bec374ec5d37744af8514c8d58011b795`.

Reservation `/workspace/.clinicos-cloud/codex-after-claude-20261018/483-qa6-reservation.json`, nonce `2f5a6cae-1fd3-440b-9f5b-f5e2080fd494`, was independently read before execution. Finalized frozen packet contract SHA256 `ff8582a11ec7d10fef17e3660b5adc443f3881562a06c379f150245377cd9e9c` applies; original external draft copies remain drafts.

## Executed outcomes and preserved failures

- `runs/qa-1`: PASS, exit0. Fresh frontend types, production build, 1,400 tests PASS/0 FAIL/0 SKIP; fresh backend 1,932 PASS/0 FAIL/5 unchanged opt-in SKIP (1,884+48 passes). Fresh therapy import API, canonical seven-issue browser E2E, F1/F2 clinical SQL/browser, all five actual-App Agenda scenarios PASS. No author/QA5 phase inheritance. `qa1-phase-seal.json` freezes 5,461 files.
- `runs/qa-2`: FAILED PREPARATION, exit1, before DB/service startup. Correctly refused phase reuse because an overbroad dependency inventory included Vite generated `_metadata.json`. Failure remains preserved.
- `runs/qa-3`: FAILED HARNESS, exit1. My supplemental generator cut at an inner catch, causing a parse error before browser scenarios. Owned startup was cleaned. Failure remains preserved; no product failure inferred.
- `runs/qa-4`: PASS, exit0. New syntax-checked navigation harness verifies previous-day and native browser history back for BOTH actual Operator/Admin Agenda routes, with real API/SQL and zero administration/receipt writes. Only this independent QA session's successful QA1 phases are explicitly referenced with exact source/config/fixture/dependency identity and log SHA256s in `own-qa1-phase-origins.json`; no author/QA5/global failed-attempt inheritance.

The five backend skips remain optional/unexecuted: one `ARCHIVE_DOCUMENT_DB_TEST` dedicated archive DB test and four `BUG428_SYNTHETIC_CLUSTER` dedicated operator-role cluster tests. No skips were relabeled passes.

## Acceptance evidence

| Contract | Independent result and evidence |
| --- | --- |
| AC1 | Actual cold authenticated Operator/Admin Agenda, reload, exact selected day, true partial/full five-item panels: QA1 `agenda-verification/{operator-positive,admin-positive}` and `results.json`. |
| AC2 | Verification-only projection reviewed at both required App call sites; real scheduled fixture names absent, no timed therapy cards/modal/actions or administration POST. SQL zero administrations/receipts. Actual positive screenshot visually inspected. |
| AC3 | QA1 next/today/day/week/month/Terapia return/reload/mobile and held day/append races PASS. QA4 previous-day and native browser-back PASS for both roles. Exactly one selected-day verification region and exact-name dedup are supplementary independent assertions. |
| AC4 | QA1 delivered/canceled synthetic initial503/append503/403, explicit error/retry, retained exact partial count, >105 candidates, real continuation/dedup, real roster409 recovery, held old-session logout/new-role response PASS. Injection/cancellation provenance explicitly recorded in browser-events. Real backend ACL/write denial checks: ten denied writes, zero administrations/receipts. |
| AC5 | Fresh complete frontend/backend phases, canonical seven issues, F1/F2 clinical scenarios and actual App browser/SQL PASS as identified above. |
| AC6 | Before/after all4,743 origin and executed inputs per runtime unchanged; all7,218 historical proof files,12author metadata files and12 old snapshot source paths unchanged. QA5 remains FAILED. Exact source changes confined to four production/two test paths. |

Canonical regression mapping: #432/#463 inventory/print completeness; #441 distinct doses; #467 one-off after band shift; #460 scheduled retry/reload single record; #442 deterministic correction barrier; #464 Europe/Rome clinical clock. See QA1 `inventory-browser/results.json`, `retry-browser/results.json`, `test-results/additional-browser-results.json` and per-issue evidence. The #442/#464 screenshots are explicitly assertion-result surfaces, backed by real SQL/runtime assertions, rather than claimed application UI. F1 refusal correction/reload/replay and F2 ambiguous readonly calendar/Giro/dashboard/assistant passed in `clinical-followup/results.json`.

## Provenance exception and runtime safety

Exactly ONE shared generated output changed during QA1 Vite startup: `frontend/node_modules/.vite/deps/_metadata.json`, before SHA256 `834fc2eb5637f5c4cdf01cd0391e09323025077568b00155d5230b082e6d2183`, after SHA256 `0c118cbc291098fdd90764859591ea49501bac7134175ce94bc73768b8b8f891`. This file is Vite generated path/config/browser metadata, not installed package source. All24,182 root dependency files (including generated Prisma), all other282 workspace files/dependency exports and18 copied legacy/font fixture files remained identical. `qa1-generated-cache-delta.json` and `workspace-installed-inputs-classified.json` retain the exact classification. Original before hash was captured; before raw cache bytes were NOT copied and are unavailable. After raw bytes are private. No stronger before-byte preservation claim is made. QA3/QA4 use an owned private frontend/node_modules directory so Vite output is isolated. No product/source/config/test/schema/client/dependency-package modification occurred.

Trusted createRunner verification mode stripped controller credentials/proxies, isolated HOME and used mock AI only. Whole lifecycle flock held. Existing exact pinned PG16 image ID/digest, pull=never, loopback55432 and512MiB tmpfs were enforced. No container-restart durability claim. Only owned services/container were removed. `cleanup.json` verifies owned ports3432/5433/8432/55432 closed, full lifecycle flock released and baseline `clinicos-postgres 9000f70d4ee9` intact. No GitHub/state/provider/production/commit/push operations occurred. Source/test/harness edits in the author worktree remain STOPPED.

## Evidence audit and handoff

Public sanitized evidence is under `publication/qa-1`, `publication/qa-3`, `publication/qa-4`; failed invocations remain separate. ZIPs passed CRC for every member, member credential scans, embedded image decode; PNGs decoded and WEBMs fully decoded with FFmpeg -xerror. All public files≤25MiB; no splitting was needed. Audit manifests give each SHA256. All16 QA1 and2 QA4 trace originals were captured privately with explicit token-observation flags; originals are excluded from public evidence.

No product findings remain. The generated-cache preservation limitation and two independent harness/preparation failures above remain recorded, alongside QA1 and QA4 successful phases. See `after-seal.json`, `cleanup.json`, `artifact-audit-*.json` and final seal for exact proof identities.

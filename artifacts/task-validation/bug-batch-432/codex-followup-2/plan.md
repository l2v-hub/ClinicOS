# Implementation/validation plan — PR483 continuation6

Preparation only. No product/test/harness/state/GitHub/runtime operation is authorized by this draft. Companion contract: `/workspace/.clinicos-cloud/pr483-codex-followup2-20261018/task-contract.md`. Refined analysis SHA256 `0ab00a8b521d77077c3141f258e6e3ab37c3e440701d82d39d1f79cf359b2b11`.

## Pending root bindings

- Parent candidate5 source SHA: `2c8a4b2b91fcda5e527b323031992a757e47fe90`.
- Parent candidate5 proof commit/boundary SHA: `c212e3141b6c7fdd88b4b1a4eaef73e5616a04f7`.
- Complete parent source/config/test and prior-proof manifests: `parent-input-manifest.json SHA256 e3fd1ec6f3420b3d811d1712e1e60a7a05e0ff85342188a22a0e4f88a16fe08e; parent-proof-manifest.json SHA256 26580ab64ccf5796ce2878034798732861eb2ac2c307b7f8e66ffe530ecdbb59`.
- Durable round6 reservation/nonce and validated finalized contract: `/workspace/.clinicos-cloud/codex-after-claude-20261018/483-round6-reservation.json nonce f4d74317-96d1-4111-a80d-a7ec1acde163; exact finalized contract digest in reservation`.
- Prior successful backend phase exact source/input/runtime/result/log identity: `codex-followup-1/independent-qa/phase-origins.json and source-input-manifest.json; originating qa-4 actual backend logs retained; identity closure and executedHere:false required before any inheritance`.

QA5 FAILED seal is already verified: `/workspace/.clinicos-cloud/pr483-followup-independent-qa-20261018/publication/final-seal.json`, SHA256 `6a479c192cc0c64ca37e9c5d1e2fdc84660a5e0721ef27637b6182c2db3c5d08`. The currently frozen41-file digest is `333b7c06f4d16e1ba54f857f594093008758e2a2165c3962a623e82f9d6a57f0`. These content identities do not supply the pending commit/reservation values. Root preserves candidate5 plus79 QA5 proof files before recording6. Original histories/counters and FAILED QA5 remain intact; continuation beyond4 is already user-authorized.

## 1. Begin only after reservation readback

Verify finalized source/proof boundaries and current checkout. Copy finalized contract/this plan/refined analysis into NEW `artifacts/task-validation/bug-batch-432/codex-followup-2/` before code. Record input/scope manifests; no old packet overwrite.

Check source hardlinks and privatize every existing target inode by same-byte temporary copy plus atomic replacement before edit or formatter. Verify parent/QA-linked copies and proof hashes remain identical. New files are private. Do not touch a shared QA inode or sealed proof. No app edit before root supplies the durable reservation.

## 2. Implement within four production paths

| Path | Narrow change |
| --- | --- |
| `frontend/src/App.tsx` | Project only `TherapyVerificationGroup[]`; record accepted first-page date/scope; pass a required verification feed at BOTH actual Agenda JSX sites. Reuse existing bounded loader, parser, roster recovery, sequence/epoch/abort and exact page merge. Bind continuation to accepted selected day/scope/cursor. Legacy timed props and administration callbacks remain omitted. |
| NEW `frontend/src/components/shared/AgendaTherapyVerification.tsx` | Export one required feed type and small actually-used eligibility helper; shared day effect, local honest pending completion guard, read-only panel and retry/continuation. Gate by local day/view, permission and accepted scope/date before rendering; distinguish pending/error/denied from accepted empty; ignore old completion. No separate data fetch/cache/controller. |
| `frontend/src/components/operator/OperatorAgenda.tsx` | Receive required verificationFeed; mount shared block with day-view active flag and existing local ISO selected date. Preserve appointment behavior and leave all legacy timed therapy props/handlers/unwired controls unchanged. |
| `frontend/src/components/admin/AdminAgenda.tsx` | Same verification-only mount and required prop. Keep appointment operator filters independent from ward therapy/patient scope. No timed feed/modal/action wiring. |

Do not edit backend, schema/client, dependencies, policy/#486, types.ts, shared existing verification panel/modal, old date-guard test, http.ts or unrelated worktrees. Stop and message root before any unlisted source change.

## 3. Add meaningful focused checks in two test paths

- NEW `frontend/src/components/shared/__tests__/agendaTherapyVerification.test.ts`: exercise the helper used by actual shared UI and server-render real component states. Cover wrong/missing date, wrong scope, pending/error/denied, accepted empty, verification-only names/count, exact partial/append-error state and absence of time/dose/actions. Do not invent an unrelated mirror helper solely for tests.
- `frontend/src/lib/__tests__/therapyNavigationGuard.test.ts`: correct the obsolete therapy-page-only assumption; retain bounded loader/parser/merge, no session prefetch and sequence/abort assertions; guard BOTH App call sites and verification-only projection. Required prop typing plus fresh actual-App browser behavior is the decisive integration regression protection.

Run focused credential-free tests and frontend type checks. Inspect exact four-file scope diff. Existing frozen backend and all unlisted source/tests/config must still match the parent manifest.

## 4. Fresh full frontend and actual-App browser/SQL

After source stabilizes, run fresh full frontend suite and build/types. Do not inherit round5 frontend/browser outcomes. Build/backend generation must not mutate shared Prisma client. Preserve every failure as its own run.

Add NEW `agenda-verification-browser.mjs` and owned launcher in codex-followup-2, redirecting every nested output to a unique new run. Never execute an old hardcoded harness against its historical proof directory. Read existing QA5 selectors/DOM as reference only; no edits to failed QA5 proof.

Under root-coordinated full-lifecycle lock and measured disk budget, use an owned real synthetic DB/backend/frontend and existing browser/cache. No paid providers/production DB or baseline-container changes. Positive verification/ACL checks use real data; delay/error interception is limited to disclosed lifecycle negative scenarios.

| Scenario | Decisive assertions |
| --- | --- |
| Actual nurse direct Agenda + reload, no prior Terapia | Exact selected-day bounded request; real verification names/count visible. |
| Actual admin direct Agenda + reload | Same authorized visibility with appointment UI independent. |
| UX447 preservation, both routes | Ordinary scheduled therapies do not create timed Agenda cards/modals/overlays/controls; no administration callbacks/POST; readonly verification has no writable key/time/dose. |
| Selected-day navigation and week/month | Next/previous/today, open-day, Terapia-to-Agenda and back/return keep correct date. Week/month show no single-day verification rows/continuation. |
| Held response/append race | ResolveA afterB; onlyB visible and no old cursor/data merge. Repeat across scope/session change. |
| Initial error/403 and retry | Explicit unavailable/error, no successful-zero/stale names; appointments remain usable; selected-day retry restores actual rows. |
| Pagination/append failure | At least105 candidates, ambiguity after first page; exact total and partial detail, actual continuation/dedup, safe retained rows on append error and correct retry/new-date reset. |
| Roster/ACL/logout-login | Existing roster409 recovery; no disclosure to denied scope; delayed old-session response cannot repopulate new session. |
| Original clinical regressions | Preserve all seven issue behaviors and F1/F2 SQL/read/write guarantees using fresh applicable browser/SQL assertions; no assertion weakening or relabeling old failed QA. |

Maintain console/network error classification, real fonts/tool provenance where required, request/SQL result assertions and screenshot/trace/video. Verify cleanup of only owned resources and lock release even on failure.

## 5. Backend inheritance is conditional and limited

Backend/schema remain immutable. A NEW independent QA6 may inherit ONLY the previous successful backend phase1,932PASS/five opt-in skips after complete relevant input identity, including frontend modules imported/read by backend tests, scripts/config/fixtures/catalog/assets, Prisma client/schema, dependency and runtime provenance. Record exact originating manifests/log hashes and `executedHere:false`. If closure cannot be proved or a relevant byte changed, rerun backend. Nothing inherits global QA5, which stays FAILED. Fresh full frontend and actual-App/browser/SQL are required regardless.

## 6. Freeze and independent handoff

Stop application/test/harness edits once ready. Verify parent source/proof and original7,119 plus newly preserved79 QA5 artifacts against root's exact manifests; preserve all failed-run logs/provenance. Prepare final changed-source and entire input digests, before/after equality, per-AC/seven-issue evidence map, actual-versus-inherited phase results, optional skips and limitations.

Audit fresh public media by decoding images/videos, CRC-checking every ZIP member and scanning contents; each public file≤25MiB. Preserve raw originals privately. Report READY FOR CODEX QA, never self-certified PASS. Root starts a NEW independent QA6 session and owns commit/push/publication/review/release. No GitHub/controller/state changes by author.

The four-file implementation may fit20–35min after reservation; focused tests and full live validation/independent QA take additional time. No completion or runtime readiness is claimed by this preparation-only plan.

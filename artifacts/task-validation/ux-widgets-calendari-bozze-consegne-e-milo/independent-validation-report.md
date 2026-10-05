# Independent QA validation

**READY FOR CODEX QA**

Frozen candidate: `e4edd2bf29b6e31199c85509e5cfd68f31ee29e2`. Baseline: `19f1e36d8cd049a83cee4282f2ee1d4593d6f549`. Source fingerprint: `1b7f06bdb6586068627f2f653c0a53e06ffc1b4de504cabbc07a09ecd0628fee` over 1413 hashed inputs. Root remained sole implementation writer; this QA session wrote only evidence/scripts and checked out the candidate in its isolated QA worktree. Unrelated dirty `start-claude-team.ps1` was preserved.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | [task-contract.md](task-contract.md), including resumed AC3/AC4. Direct user/browser requirements; no GitHub issue was supplied. |
| 1 Full diff review | PASS | [final changed files](test-results/final-diff-files.txt); reviewed frontend changes, existing API boundaries and the final 14-file delta. Backend/Prisma/dependencies/config unchanged. Findings below were corrected and retested. |
| 2 Build and tests | PASS | Independent [TypeScript noEmit app/node](test-results/types-final.txt) and production Vite build, 677 modules: [build](test-results/build.txt). [70 focused](test-results/focused.txt), [65 discovery](test-results/discovery-focused.txt), [68 final targeted](test-results/widgets-final-focused.txt), all zero failures. Suites overlap; counts are not unique tests. |
| 3 UI/runtime | PASS | Every affected capability mapped below; screenshots, video, trace and JSON linked by the [HTML evidence index](playwright-report/index.html). No unexpected browser error or relevant HTTP failure in final runs. |
| 4 Security | PASS | [security-review.md](security-review.md), unchanged backend/Prisma trees and explicit role denial proof. |

Backend validation: [393 independent DB/API tests](test-results/db-tests.txt), [DB receipt](test-results/db-result.json), [2/10-user concurrency proof](test-results/concurrency-proof.json). These were run independently against a fresh synthetic database before the frontend-only final delta; Git backend and Prisma tree equality binds them to the final candidate. The demo backend update is a separate release and has not been published as part of this task. No backend deployment was performed.

| Criterion | Independent result / evidence |
|---|---|
| AC1 | Contacts inside admission, adjacent aligned widgets, sole complete patient print. All eight representative contact/admission field values asserted in actual print output: [full app](fullapp/test-results/fullapp.json), [print fixture](widgets/test-results/widgets-runtime.json). |
| AC2 | Settled full clinical page: same edges, 16px widget gaps. Individual keyboard/global collapse preserves mounted editor and selected attachment. Narrative sections and attachments close too: [widget metrics](fullapp/test-results/widget-metrics.json), [full app](fullapp/test-results/fullapp.json), [widgets](widgets/test-results/widgets-runtime.json). |
| AC3 | Actual PAINAD partial radio value survives reload, author isolation and confirmed delete persist. Three legacy adapters and Consegna refresh/delete/isolation pass. Actual Medicazioni shows compact actions, date/full author in both history views and Draft content after reload. Read-failure fence proves zero overwrite/delete and truthful warning: [PAINAD](modern-draft/test-results/painad.json), [new legacy UI](cycle9/test-results/cycle9.json), [failure path](legacy-read-failure/test-results/read-failure.json). |
| AC4 | Sidebar leaves patient context; Piano terapeutico follows Storico and is separate from calendar. Exact-time multi-drug summary opens details and permitted administration actions. Empty-slot + opens the existing form at selected 2026-11-12/11:00. Invalid save writes nothing; explicit valid save writes one exact payload, retains non-today date, and saved prescription is read after refresh. Explicit denied server capability hides creation controls: [calendar](calendar/test-results/calendar-runtime.json), [new creation](cycle9/test-results/cycle9.json), [administration reload](administration/test-results/administration.json). |
| AC5 | Shared grid renders 20 patients/21 doses in a bounded slot; popup details, patient entry and Back restore popup/date/week/scroll. Partial read failure retains known details and retry; failed day never represented as empty: [calendar](calendar/test-results/calendar-runtime.json). |
| AC6 | Full app names readable at 1150/768/390; measured width/height/line-wrap and no page overflow: [params](params/test-results/params.json). Dashboard density also measured at five widths: [dashboard](dashboard/test-results/density-runtime.json). |
| AC7 | Shared severity/narrative composer, automatic author/time, no editable Type/deadline; patient diary/filter/page windows remain bounded, including 120 legacy rows. Failed later page keeps cursor/data. Removed duplicate feed/topbar controls reviewed: [handover](handover/test-results/runtime.json), focused regression. |
| AC8 | Doctor proposal preview/cancel is nonmutating; explicit atomic confirm alone writes, nurse cannot prescribe. Ambiguous text never silently creates therapy: [handover](handover/test-results/runtime.json), [backend interpretation/API](test-results/db-tests.txt). |
| AC9 | Actual fullscreen Milo explains agentic AI and verification. Actual voice hook reads transcript and exact server proposal, blocks unsafe confirmation, explicit accept/reject, local Italian Natural voice at softer rate, releases mic on context change: [voice](test-results/voice.json), [fullscreen](fullapp/test-results/fullapp.json). |
| AC10 | Immutable originals/shared receipt/concurrency, role scope, pending idempotency and truthful failures covered by DB and focused regressions. Root ledger records nine consolidated engineering cycles, below maximum ten. Final source hash verification PASS. |

## Corrected findings

- Clinical Risk/Allergy spacing lacked a shared gap; exam attachments escaped collapse. Fixed by shared stack and moving attachments into their clinical sections.
- Direct Allergy CTS retained 16px margin on top of parent gap; nested content inherited flex growth. Final normalization resets direct CTS margins and disables content growth; all settled widget gaps are 16px.
- Legacy storage read failure could silently overwrite an unread draft. Final readFailed fence exposes warning and prevents both overwrite and delete.

These are resolved findings, not remaining failures. Technical QA retries corrected invalid synthetic API page envelopes, simulator login restoration and selectors; they did not alter implementation or expand the discovery-cycle count. All final listed runtime outputs pass. Earlier failure screenshots/traces and additional videos are retained as diagnostic history; current verdict is determined by the linked final result JSON, not historical captures.

## Limits / release handoff

- Verdict validates the local source-bound frontend candidate and unchanged backend compatibility. It does not certify the public demo backend or deployed website. Parent reported demo backend readiness/credential authorization still pending; deployment and online protocol checks remain a separate authorized release step.
- Preexisting sidebar Milo still opens the older drawer; the annotated agentic/voice experience and this acceptance evidence use the fullscreen topbar entry. Do not claim all Milo entry points are unified.
- Drafts survive reload within the same browser tab/session, are operator/patient scoped and cleared on explicit logout; server saving is required for availability after later sessions. Local storage failure is visible.
- Italian speech depends on browser/OS installed voices; synthetic proof verifies available natural Italian selection and softer pacing, not the user's device audio quality.
- No real browser clinical state, credential, patient data, online clinical write, commit, push or deployment was used by independent QA. No issue attachment was sent because no issue was supplied and this QA role is read-only outside its evidence scope.

The designated integration owner must perform the release gate and online verification under the user's existing publishing authorization.

# Independent QA3 — exact demo release and terminal publication

Verdict: **FAILED VALIDATION**. The candidate must not be published as approved. No source correction, commit, push, state/budget change, issue mutation, model/API call, deployment, Docker operation or secret access occurred in this review.

Dedicated reviewer `/root/release_guard_qa3`; baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`. All nineteen source files were reviewed and matched the candidate3 frozen manifest. All seventy original historical manifest records and all sixty-five unique files listed by candidate3 remain unchanged.

## Consolidated findings

**QA3-F1 — P1: the final premerge reread adopts a different PR or source membership without verifying that identity.** `agent-team/src/bug-pipeline/release.mjs:403` verifies the earlier batch against PR feedback/checks; after the awaited final trusted demo preflight, lines412–423 reload state but compare only phase, SHA, approved SHA and implementation/review status. Line427 then merges the newly loaded `batch.pr.number`. A durable PR9→PR10 change during that await causes a merge of PR10 even though only PR9/main was verified. The exact-head flag cannot establish the missing PR/base identity: two PRs can contain the same SHA and target different bases. The independent real `createGitHub` adapter reproduction emits `gh pr merge 10 --squash --match-head-commit a…a`; the synthetic transport confirms that PR10 targets `release`, while the verified PR9 targeted `main`. Adding issue6 with a structurally valid updated plan during the same await also proceeds to merge despite the committed evidence covering only issue5.

Remediation: capture and bind the complete verified candidate identity, PR coordinates/base/source membership/plan/evidence and approval before the relevant remote awaits. Recheck that same identity before any merge, never use a newly adopted PR with stale feedback. Cover mutations during both preflight/check phases, preserve fresh-hold checks and exact-head protection, and retain state CAS/cycle budgets.

**QA3-F2 — P1: deployment recording adopts changed PR/source membership and can close an unverified issue.** `release.mjs:510` verifies demo proof for the original release. Lines517–521 reload state but only compare merge SHA and the new release's reviewed SHA against its own new source SHA. Lines522–537 then attach that earlier proof to the newly loaded identity and persist deployed/pending. Publication correctly freezes its input identity, but now receives the already-adopted changed batch, so it cannot detect the earlier replacement. A PR9→PR10 mutation during the first live-proof await still closes issue5. Adding issue6, together with structurally valid plan acceptance/evidence declarations, issues actual PATCHclosed requests for both issue5 and issue6; no committed issue6 evidence was read or verified.

Remediation: preserve the exact pre-verification release/candidate identity through the live-proof await and reject any change before persisting deployed status or invoking publication. Bind reviewed/merged SHA, PR/release PR coordinates, source issues, plan/evidence and review authorization rather than accepting a fresh internally consistent replacement. Keep the publication guard, protected retry/CAS and exact live receipt checks.

Both findings concern avoidable awaits before irreversible requests, not a hold arriving after a merge/close request has already been sent.

## Objective reproductions

- `premerge-identity-race.test.mjs`: **0/1 pass**, initial isolated repro; output in matching `.log`.
- `identity-race-matrix.test.mjs`: **6 pass / 4 fail**. Four defects: premerge PR, premerge source issue, record PR, record source issue. Six correct blocks: premerge approved SHA; record hold; publication PR, source issue, approved SHA and artifact digest changes. Exact observed values in `identity-race-probes.json` and matrix log. Every case retains one implementation and one review round.
- `actual-adapter-identity-races.test.mjs`: **0/3 pass**, real production GitHub adapter with synthetic transport, proving the actual wrong-PR merge command and actual issue close PATCH boundaries. This is not a stub-only assertion.

No source fix was applied. These repros and logs are historical candidate3 evidence and must remain immutable through correction4.

## Five-phase record

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | `task-contract.md`, original frozen infrastructure contract/addenda and prior QA issue-context reports. No claim of completing issue470 or actual activation. |
| 1 Complete diff review | FAIL | All nineteen source files reviewed including all four workflows and new untracked helper/test files; QA3-F1/F2 above. Scope matches the frozen manifest, no product UI/schema/dependency changes. |
| 2 Independent tests/build | FAIL due to new regressions | Full existing CI command:334 total,331 pass,0 fail,3 native-Windows skips; backend/frontend TypeScript pass; frontend production build passes57.5s; actual readiness HTTP1/1 pass with injected dependencies and unreachable synthetic DB URL; unchanged original QA1/QA2 regressions6/6 pass. New ten-case matrix6/10; actual-adapter regressions0/3; initial repro0/1. All commands/logs retained. |
| 3 Playwright diagnostic | UNRUN / insufficient for READY | A safe localhost-only25-case harness was prepared, then queued under the global flock. Root explicitly canceled this owned waiting run after the certain P1 failures so correction4 could proceed; no browser, HTTP server or Docker was started by it. No screenshot, trace, video or runtime browser pass is claimed. Fresh independent QA4 must execute all five phases. |
| 4 Security review | FAIL on release-identity correctness; other controls reviewed | Fixed provider origins, no credential forwarding to signed artifact storage, trusted main provenance, bounded artifact parsing, dedicated target and protected credential jobs remain intact. No secrets/PHI/new logs/new dependency/raw SQL/product auth/CORS/TLS relaxation found. QA3-F1/F2 invalidate the intended verified-target authorization across awaits. |

## Extended audit and practical limits

All code paths in the nineteen-file candidate were inspected, including cache-directive grammar; native unique-active deployment/convergence; bounded ZIP receipt extraction and digest binding; dedicated demo target/source queries; preflight current-main trust; hold predicates; publication guards at actual comment/label/create/delete/PATCH boundaries; status-cache invalidation; publication pending/retry auto-selection; deployed recovery; CAS failure recovery; six effective required check bindings/pagination/idempotence; browser-cache environment isolation; and retained sandbox egress/filesystem/exit probes. No additional certain finding was identified in this audit. This does not constitute a pass for the failed candidate.

The three actual static Railway GraphQL documents independently pass AST validation against the exact cached official CLI5.66.0 schema (`railway-schema-qa.json`, schemaSHA256 `3c3d1448f2a746d6e5977ba3aa205889f959c427be5cfe37c72e79b1fa65f2be`). Zero Railway calls. All four workflow YAML files parse (`workflows-parse.json`); native actionlint is unavailable and is not claimed. Actual GitHub native Windows and isolated Codex/Chromium execution remain later CI gates; local unit/structural results do not certify them. No live deployment, actual settings application, frontend alias binding, Claude Max approval or issue closure is claimed.

Child test processes used `env -i` with only PATH/TMPDIR and known synthetic test variables as applicable. The unexecuted browser command additionally specified a task-local Playwright cache with a system ffmpeg symlink. No GH/model/deploy credentials entered children. The waiting flock was terminated only after matching its exact owned harness argument; no shared runner or unrelated service was terminated. Source and historical integrity is rechecked in `source-hashes-after.json` and `historical-integrity.json`.

The root coordinator owns explicit reservation of the fourth/last implementation correction and a new dedicated independent QA4. This review does not reset any ledger, request a fifth attempt or authorize release.

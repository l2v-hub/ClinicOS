# Independent QA — ClinicOS portable skill

Date: 2026-10-17 UTC. Independent reviewer: clinicos_skill_qa.
Base: origin/main 14dbcd353242b35a050c45cbed7978ac213edd62.
Subject: the three Markdown source files listed by SHA-256 in document-checks.json and final-seal.json. No source edits by QA.

This task comes directly from the user's request for a portable ClinicOS skill published on main; it has no dedicated GitHub issue. The contract, rather than a fabricated issue/comment history, supplies acceptance criteria.

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | ../task-contract.md; logs/contract.log; AC1–AC4 reviewed. Initial generated plan omitted mandatory browser/security flags; coordinator corrected contract before final QA verification. |
| 1 Full diff | PASS | Existing canonical skill rewrite plus both untracked source files inspected in full. Scope is documentation, preserving application/controller/workflow bytes. No debug code, hardcoded developer machine, credentials or live-state claims. |
| 2 Independent build/tests | PASS | logs/typecheck.log: tsc --noEmit zero exit; logs/build.log: frontend build zero exit, 740 modules, 35.30s. Explicit loopback VITE_API_URL; build only, no application server/database. document-checks.json: YAML, local links, copy outside checkout and companion playbook lookup PASS. |
| 3 Safe documentation browser | PASS | verify.mjs executed under shared flock; real marked rendering of actual Markdown, follow canonical skill→playbook link, ordered nine sections, key budget/QA/release values, reload, no browser/page/HTTP errors. skill.png, review-playbook.png, playbook-full.png, trace.zip, video/*.webm. |
| 4 Security | PASS | Source and rendered contents human-reviewed. No actual PHI/secrets/DSNs. No executable endpoints or auth/config/dependency changes. QA HTTP server loopback-only, fixed routes, CSP default-src none; never part of product. Source regex scan and ZIP member scan found no credential patterns; trace CRC PASS. |

AC1 PASS: canonical package contains SKILL.md plus its relative references; copied to an unrelated temporary directory and link resolved; .agents entry points to canonical package and accurately warns that wrapper alone is not portable. Repository-dependent complementary skills are explicitly fetched from checkout rather than falsely bundled.

AC2 PASS: current queue authorization, pre-freeze aggregation/file interaction, occupied ownership, deep full-path analysis, adaptive model choice, bounded worktree delegation and independent implementation/review budgets present. Compared pipeline.mjs MAX_CYCLES guards and .agents/skills/codex-bug-triage instructions; no reset or competing controller prescribed.

AC3 PASS: explicit QA ownership, clinical requirements, isolated runtime ownership and whole-stack serialization, evidence provenance per AC/issue/SHA, simplification, exact-SHA Claude report and protected-release-only closure. Review labels cross-checked against issue-review-communication.mjs; worker role restrictions cross-checked against bug-final-review; current read-only reviewer cannot itself post GitHub comments. Release-only Risolto matches release.mjs. Six check names are a reconcilable list, not an assertion of immutable future repository policy.

AC4 PASS: no runtime mutation, remote credentials, provider API, cron, personal-PC assumptions or bypass instructions. Native sync workflow confirms trusted default branch and existing BOT token; skill does not promise automatically installed workers or successful Max authentication. Clinical blocked issues and exhausted budgets remain unchanged.

Build emitted existing large-chunk and plugin timing warnings, no errors. No new dependency was installed. No frontend/backend unit suites repeated because no runtime sources changed. Browser evidence proves documentation rendering/navigation and usability of package contents; it does not prove a live issue→Max→deploy cycle. No remote requests, mutation, database, container, model invocation, PR action or issue closure were performed by QA. No screenshots claim product behavior.

Media integrity: actual review screenshot visually inspected; PNG headers/decode checked; trace ZIP CRC valid (17 members); entire video decoded with ffmpeg -v error without errors. All source/evidence hashes are sealed in final-seal.json. Build/typecheck created only ignored outputs. Temporary dependency symlink removed after testing.

## Verdict

READY FOR CODEX QA

All local documentation acceptance criteria pass. Publishing/merge remains the coordinator's decision under actual protected-branch checks; preexisting clinical release/Claude/Railway blockers are outside this docs task and are not resolved by this verdict.

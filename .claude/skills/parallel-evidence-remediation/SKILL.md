---
name: parallel-evidence-remediation
description: Use when Codex marks ClinicOS issues as QA FAILED / MISSING OBJECTIVE EVIDENCE, or labels them needs-evidence / playwright-required, or an issue can't be closed (issue non chiudibile) for lack of objective evidence (screenshot mancanti / trace mancanti). Handles evidence remediation against the Codex QA gate — the reference request "Produci evidenze oggettive per le issue marcate da Codex come QA FAILED — MISSING OBJECTIVE EVIDENCE" must fire this skill. Produces objective Playwright evidence (final screenshot + trace + report + test-results + video) per issue via a parallel agent-team / batch approach. Claude never closes issues — Codex is the sole QA Gatekeeper.
---

# Parallel Evidence Remediation

Produce **objective Playwright evidence** for ClinicOS GitHub issues that Codex rejected as
**QA FAILED — MISSING OBJECTIVE EVIDENCE** (or labelled `needs-evidence` / `playwright-required`).
The deliverable per issue is a self-contained evidence bundle attached to the issue so Codex can
re-run its QA Gate without asking for anything more.

Companion docs: `docs/parallel-evidence-remediation.md`.

---

## 0. Start immediately — no waiting

The moment this skill fires, **begin work**. Do not ask for further instructions or confirmation.
Collect the target issues (from the request, or `gh issue list` filtered by the QA-fail /
`needs-evidence` / `playwright-required` labels), then dispatch the parallel agent-team.

## 1. Parallel batch strategy (agent-team)

Divide the issues into parallel batches and dispatch one sub-agent per batch:

- **Batch A** — internal / Agnos (LLM reads, tool-calling, composable queries, internal engines).
- **Batch B** — frontend / UI (React/Vite screens, navigation, editors, modals).
- **Batch C** — routine / persistence (CRU flows, save + reload assertions, agenda, cartella).
- **Batch D** — import / OCR / voice (discharge import, AI import, voice intake).

**Parallelize** ANALYSIS, SPEC/CONTRACT authoring and REPORTING across batches.

**SERIALIZE Playwright EXECUTION.** All tests run against the **single shared local stack + one
Postgres**. Running Playwright in parallel corrupts refresh/persistence assertions (shared DB
state, port contention). Use a single execution lane / mutex: batches queue their runs one at a
time against the running stack. Only test authoring and evidence write-up happen concurrently.

## 2. Governance (hard rules)

- **Codex is the sole QA Gatekeeper.** Claude produces code + tests + objective evidence only.
- Claude **NEVER** closes GitHub issues, **never** merges, **never** deploys, never applies
  `qa-passed` / `closed-verified`.
- Claude declares exactly one of: **READY FOR CODEX QA**, **BLOCKED**, or **FAILED VALIDATION**.
  Never say "done", "fixed", or "closed".

## 3. Evidence contract (per issue)

Save every artifact under:

```
artifacts/task-validation/<issue-number>-<slug>/
```

Required contents:

- `task-contract.md` — acceptance criteria, scope, chosen QA surface, how success is asserted.
- `validation-report.md` — decision + **REAL, existing paths** to every artifact below.
- **final screenshot** of the verified **RESULT** (the actual outcome of the issue — NOT a
  homepage, NOT a generic dashboard, NOT the login page).
- **trace** — `trace.zip`.
- `playwright-report/` — the HTML report.
- `test-results/` — raw run output.
- **video** — `.webm`, required whenever the issue touches UI / chatbot / voice.

**NOT acceptable** as evidence: textual comments alone, a `validation-report.md` without real
proof files, references to a SPEC or to another issue's evidence, or bare "AC satisfied" claims.

## 4. Attach evidence to the GitHub issue

Pushing a branch is **NOT enough** — Codex reads the **issue**. For each issue:

1. Commit + push the test and evidence; capture the pushed commit SHA.
2. Embed the final result screenshot in an issue comment via a `raw.githubusercontent.com` URL
   **pinned to that commit SHA** (not a branch ref), e.g.
   `https://raw.githubusercontent.com/l2v-hub/ClinicOS/<SHA>/artifacts/task-validation/<n>-<slug>/result.png`.
3. Add links to `trace.zip`, `playwright-report/`, `test-results/`, and the video.
4. State the decision: **READY FOR CODEX QA** / **BLOCKED** / **FAILED VALIDATION**.
5. **Do NOT close the issue.**

## 5. Playwright minimum bar (REAL assertions)

Every test must, at minimum:

- `await expect(locator).toBeVisible()` on the element that proves the result.
- Verify the **actual result value** (assert the concrete text/number/state, not mere presence).
- Assert **no console errors**: register `page.on('console', ...)` and fail on `type === 'error'`.
- Assert **no relevant HTTP 4xx/5xx**: register `page.on('response', ...)` / check `response.ok()`
  for the endpoints exercised by the flow.
- When data is created or updated, verify **persistence AFTER reload** (`page.reload()` then
  re-assert the value survived).
- The **final screenshot** must capture the issue's result state.

## 6. Internal features without a UI

Never refuse to produce a screenshot because "there is no UI". Build a **safe, QA/test-only
surface** that Playwright can open, assert on, and screenshot:

- an internal **test-only endpoint**, or
- a **non-production QA page**, or
- an **HTML/JSON report generated by the test itself**.

Requirements for any QA surface: **disabled in production** or protected by env flag; **no PHI /
no secrets** in output or logs; **synthetic fixtures only**.

## 7. Privacy

- **Synthetic fixtures only** — never real patient data.
- Logs may contain **only**: `correlationId`, issue number, test name, provider/model, outcome,
  sanitized error. Nothing else.

## 8. Per-issue workflow

For each issue, in order:

1. Read the issue **and Codex's comments**.
2. Identify the **acceptance criteria**.
3. Create/update `task-contract.md`.
4. Create/update the **Playwright test** covering those criteria.
5. **Run** it against the current code on the shared serialized lane.
6. Generate the evidence bundle (screenshot, trace, report, test-results, video).
7. Update `validation-report.md` with the **real paths**.
8. Mark **READY FOR CODEX QA** / **BLOCKED** / **FAILED VALIDATION**.
9. **Attach** the evidence to the GitHub issue (section 4).
10. **Do NOT close the issue.**

## 9. Local run stack

- **Postgres**: Podman container `clinicos-postgres` (localhost:5432).
- **Backend**: `http://localhost:3001`.
- **Frontend**: `http://localhost:5173`.
- **Harness**: `@playwright/test`.

(See the `run-clinicos` skill for launching the stack; keep a single stack instance up for the
serialized execution lane.)

## 10. Output format

**Per-issue table:**

| Issue | Type | Test | Screenshot | Trace | Report | Video | Decision |
| ----- | ---- | ---- | ---------- | ----- | ------ | ----- | -------- |

**Final rollup:**

- batches run (A/B/C/D) and what each covered;
- issues completed / blocked / failed;
- files changed;
- tests created;
- commands run;
- **all** screenshot / trace / report / `validation-report.md` paths;
- residual risks.

End the rollup with exactly:

> **Codex must now re-run the QA Gate.**

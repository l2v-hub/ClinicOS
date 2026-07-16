---
name: qa-gate
description: Use when a PR is ready for review or about to be opened, when the user asks for a QA gate / verifica qualità / validazione di una PR o issue, and ALWAYS at the end of any development done in agent teams — before the lead reports the work to the user. Also fires when someone is about to declare an issue implemented ("fatto", "completato", "done") without objective evidence. Covers diff review, tests, Playwright evidence for UI features, and security validation against the issue's acceptance criteria.
---

# QA Gate

Structured quality gate for ClinicOS PRs and agent-team deliveries. The gate has **5 phases,
all mandatory** — a PR passes the gate only when every phase produces a recorded PASS.

**Verdicts** (the only allowed final states, per the Codex Gate): **READY FOR CODEX QA**,
**BLOCKED**, or **FAILED VALIDATION**. Never "done". Never close issues, merge, or deploy —
Codex is the sole QA Gatekeeper.

## Who runs the gate

**The gate runs in a dedicated QA session, never by whoever wrote or coordinated the code.**

- Agent-team development: when the implementer reports completion, the lead MUST spawn a
  **new QA teammate** (name `qa-gate`, e.g. agentType `clinicos-qa` for build/diff phases +
  a `general-purpose` agent for Playwright execution) and pass it: the issue number, the
  branch/diff range, and this skill. The lead waits for the QA verdict before reporting
  anything to the user.
- Solo development: spawn a QA subagent the same way. Self-certification is not a gate.

## Phase 0 — Contract

Read the GitHub issue (`gh issue view <n>`) **and its comments**. Extract the acceptance
criteria into `artifacts/task-validation/<issue-number>-<slug>/task-contract.md`. Every later
phase asserts against this contract, not against the implementer's summary.

## Phase 1 — Diff review

Review the full diff (`git diff main...HEAD` or `gh pr diff`):

- **Scope**: only files the issue requires. No backend / Prisma schema / API route /
  `VITE_API_URL` changes unless the issue explicitly asks.
- **Patterns**: design-system compliance (medical-blue palette, no red as brand, unified nav,
  expandable widgets), small components, existing idioms.
- **Hygiene**: no leftover debug code, no `console.log`, no commented-out blocks, no unrelated
  reformatting.
- Record findings file:line. Any correctness bug → **FAILED VALIDATION** (back to implementer).

## Phase 2 — Build & tests

Run independently — never trust the implementer's report:

```bash
cd frontend && npx tsc --noEmit && npm run build   # zero errors required
```

Plus the test suites the issue touches (backend `tsx --test`, unit tests, existing e2e).
Any failure → **FAILED VALIDATION** with the exact output.

## Phase 3 — Playwright evidence (every UI feature touched)

For **each** graphical/UI capability the issue introduces or changes, produce objective
Playwright evidence proving the objective was reached. Follow the evidence contract and
minimum assertion bar of the `parallel-evidence-remediation` skill (§3 and §5):

- real assertions on the result element **and its value**, no console errors, no relevant
  HTTP 4xx/5xx, persistence after `page.reload()` when data is written;
- bundle under `artifacts/task-validation/<issue-number>-<slug>/`: final result screenshot,
  `trace.zip`, `playwright-report/`, `test-results/`, video for UI/chatbot/voice;
- **serialize** Playwright runs against the single shared local stack (see `run-clinicos`);
- internal features without UI: build a safe QA-only surface — never skip the screenshot.

"The UI change is too small for Playwright" is not a pass — it is a missing-evidence FAIL.

## Phase 4 — Security validation

Explicit checklist over the diff and the running feature (healthcare app — this phase is
never N/A, not even for frontend-only changes):

| Check | What to verify |
|-------|----------------|
| Secrets | No tokens/keys/passwords/connection strings in diff, fixtures, or logs |
| PHI | No real patient data in code, tests, logs, or evidence — synthetic fixtures only |
| Logging | New logs limited to correlationId / ids / outcomes — no clinical payloads |
| Input validation | New/changed endpoints validate and bound their inputs (types, lengths) |
| AuthZ | New routes/actions respect role gating (operator vs manager); no auth bypass |
| Injection/XSS | No raw SQL (Prisma only), no `dangerouslySetInnerHTML` with user content |
| Dependencies | No new packages unless required by the issue; no license/typo-squat risk |
| Config | CORS, env handling, and prod flags not weakened; QA-only surfaces env-gated |

Any finding → **BLOCKED** (security) with file:line and remediation.

## Phase 5 — Verdict & report

Produce `validation-report.md` in the evidence folder and report:

| Phase | Result | Evidence |
|-------|--------|----------|
| 0 Contract | criteria list | task-contract.md |
| 1 Diff review | PASS/FAIL + findings | file:line list |
| 2 Build & tests | PASS/FAIL | command output |
| 3 Playwright | PASS/FAIL per UI feature | real artifact paths |
| 4 Security | PASS/BLOCKED | checklist results |

Then one verdict: **READY FOR CODEX QA** / **BLOCKED** / **FAILED VALIDATION**. Attach
evidence to the GitHub issue per `parallel-evidence-remediation` §4. Do not close anything.

## Red flags — the gate is being skipped

| Rationalization | Reality |
|-----------------|---------|
| "tsc and build pass, it's done" | Build passing is Phase 2 of 5. Three phases remain. |
| "The user is in a hurry, open the PR now" | A PR without evidence bounces off Codex as QA FAILED — slower than running the gate. |
| "The implementer already tested it" | Whoever wrote the code never certifies it. Spawn the QA session. |
| "Security doesn't apply, it's only frontend" | Healthcare app: PHI, XSS, and logging checks apply to every diff. |
| "Screenshot exists from development" | Evidence comes from the QA run's Playwright artifacts, not dev screenshots. |
| "I'll do QA after opening the PR" | The gate runs BEFORE reporting/opening. FAILED means the PR does not open. |

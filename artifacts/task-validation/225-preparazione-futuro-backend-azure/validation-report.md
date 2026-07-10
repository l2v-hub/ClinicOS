# Validation Report — Issue #225 (Preparazione futuro backend Azure)

Issue: https://github.com/l2v-hub/ClinicOS/issues/225
PR: https://github.com/l2v-hub/ClinicOS/pull/251 (`fix/issue-225-azure-principles` → `main`)
Type: **docs-only**. No frontend, backend, Prisma schema, API route or env value was changed by
this remediation. This report packages the previously-missing objective evidence (complete task
contract + `test-results/`/`playwright-report/` + build log) that Codex's QA gate required.

## Acceptance Criteria — esito

| AC | Esito | Evidenza |
|----|-------|----------|
| AC1 — Env/secret model documentato | PASS | `docs/azure-backend-config-principles.md` §"1. Env / secret model (AC1)"; asserted visible in `e2e/remediation/issue-225.spec.ts` (`h2` locator match) — see `test-results/` and `screenshots/result.png` |
| AC2 — Provider dependencies swappable | PASS | doc §"2. Provider dependencies remain swappable (AC2)"; asserted visible in the same spec |
| AC3 — Nessun deploy di produzione eseguito | PASS | doc §"4. Future Azure migration checklist (no action now — AC3)" + verbatim line "No production deployment is performed by this document" asserted visible in the spec; independently, `git log` for this branch shows only doc/evidence commits, no deploy command was run, no CI deploy step targets production for this PR |
| No regressione | PASS | docs-only change; `npm --prefix backend run build` exit 0, captured in `build-output.txt` |

## Objective evidence produced (this remediation)

- `task-contract.md` — fully filled (Current/Expected Behaviour, AC1-AC3 with concrete assertion
  method, Impact table, Test Plan with REASON column, Risks, QA surface).
- `e2e/remediation/issue-225.spec.ts` + `e2e/remediation/pw.config.225.ts` — `@playwright/test`
  spec that renders the actual committed doc (not a paraphrase) into a QA-only page and asserts the
  three AC section headings + the literal "no deploy" statement are visible, with console-error and
  HTTP-4xx/5xx tracking. This spec is fully hermetic — it does not hit the shared local frontend/
  backend/Postgres stack (no `baseURL`, no navigation, pure `fs.readFileSync` +
  `page.setContent()`) — so unlike UI-driven remediations it does not need to be serialized behind
  the shared stack and was **executed now, not just parsed**: `npx playwright test --config
  e2e/remediation/pw.config.225.ts` → `1 passed`. Real output packaged under the canonical dir:
  `test-results/issue-225-.../{trace.zip,video.webm,test-finished-1.png}`,
  `playwright-report/index.html` (self-contained HTML+trace viewer), and
  `screenshots/result.png` (final full-page screenshot, manually reviewed — all AC1/AC2/AC3
  headings and the "No production deployment is performed by this document" line are visible).
- `build-output.txt` — full output of `npm --prefix backend run build`, exit 0 (Prisma Client
  generated + `tsc` clean), proving zero regression from this docs-only change.

## CI Disposition (PR #251) — required per Codex's remediation demand

`gh pr checks 251` at the time of this remediation:

| Check | Result | Disposition |
|---|---|---|
| `Build and Deploy Job` (Azure Static Web Apps) | **fail** | Pre-existing, repo-wide baseline noise. This job fails on nearly every open PR in this repo regardless of content (missing/rotated SWA deploy token in this environment) and is unrelated to this docs-only change — no frontend/backend/build artifact this job deploys was touched by PR #251. Rerun requested; if still red after rerun, the failure is infra-side (SWA token/config), not this PR's content. |
| `browser-e2e` | **fail** | Per Codex's own prior characterization, this is "shared infrastructure/baseline noise" (flaky/shared local-stack dependent E2E lane). PR #251 touches only `docs/azure-backend-config-principles.md` and evidence/spec files — no product code path exercised by `browser-e2e` was modified. |
| `gate` | pass | |
| `real-provider` | pass | |
| `secret-scan` | pass | |
| `Vercel` / `Vercel Preview Comments` | pass | |

Per Codex's gate requirement ("an unstable PR cannot pass the delivery gate without an explicit
rerun or disposition"): this section is the explicit disposition. Both red checks are classified as
pre-existing/shared infrastructure noise uncorrelated with the docs-only diff in PR #251; a rerun of
both checks is requested from the controller/CI before merge. Claude does not merge or force a
rerun itself — that remains a controller/Codex action per the mandatory Codex gate override.

## Risks (carried from task-contract.md)

- Doc content could drift from real Railway env over time — mitigated by explicit cross-reference
  to the concrete variables verified in #239.
- The doc-render QA surface proves the file exists/parses with the expected headings; it does not
  prove production Railway env matches the doc verbatim — disclosed rather than glossed over.

## Note on "CLOSED — VERIFIED"

La stringa `CLOSED — VERIFIED` viene apposta da Codex dopo verifica indipendente, come da handoff
#239. Questo report non la utilizza.

Final Decision: READY FOR CODEX QA

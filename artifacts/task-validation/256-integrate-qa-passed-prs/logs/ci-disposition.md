# CI Disposition — Issue #256 (PRs #247–#252)

Read-only investigation. Repo: `l2v-hub/ClinicOS`. Generated 2026-07-10. Sanitized (no tokens/secrets/PHI).

## Verdict (one line)

Every failing check across all six PRs is a **GitHub Actions account BILLING BLOCK** (cause category **b — missing Actions entitlement**), not code, not workflow YAML, not a real secret leak. **External, not repo-fixable.**

## Evidence signature (identical on all six PRs)

Every failing job reports `steps: 0` and starts+completes within **1–3 seconds**. At the run level `gh run view` prints:

> "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings"

A `steps=0`, sub-3-second job **never executed any step** — it died at job startup before checkout. The two affected workflows both **pass on `main`** with unchanged YAML (e.g. AI Import E2E Gate run `28979030024` OK, Azure run `28979030005` OK), which rules out YAML/permissions/content. Only runs from 2026-07-10 onward (run IDs `2908xxxxxxx`+) are blocked → an account-level billing event, not a per-PR difference.

## Consolidated table

| PR | Failing checks | Skipped (downstream) | Cause | Repo-fixable? | Operator action |
|----|----------------|----------------------|-------|---------------|-----------------|
| 247 | Build and Deploy Job (Azure), secret-scan | Close PR Job, gate, browser-e2e, real-provider | b — Actions billing block | No (external) | Clear GitHub billing / raise Actions spending limit, then re-run |
| 248 | Build and Deploy Job (Azure), secret-scan ×2 | Close PR Job, gate, browser-e2e, real-provider | b — Actions billing block | No (external) | Same |
| 249 | Build and Deploy Job (Azure), secret-scan ×2 | Close PR Job, gate, browser-e2e, real-provider | b — Actions billing block | No (external) | Same |
| 250 | Build and Deploy Job (Azure), secret-scan ×2 | Close PR Job, gate, browser-e2e, real-provider | b — Actions billing block | No (external) | Same |
| 251 | Build and Deploy Job (Azure), secret-scan | Close PR Job, gate, browser-e2e, real-provider | b — Actions billing block | No (external) | Same |
| 252 | Build and Deploy Job (Azure), secret-scan ×2 | Close PR Job, gate, browser-e2e, real-provider | b — Actions billing block | No (external) | Same |

(secret-scan appears twice on some PRs because `ai-import-e2e.yml` triggers on both the PR event and a push event, producing two runs; both fail identically at startup.)

## Secret-scan zero-step failures — explicit ruling

The `secret-scan` job (`.github/workflows/ai-import-e2e.yml`, job `secret-scan`) is a trivial `grep -rInE 'AIza…'` over tracked files. On PRs #247–#252 it executed **0 steps** — the grep **never ran**.

- This is **NOT** proof that a secret was found.
- This is **NOT** a pass.
- It is a **runner-never-started** failure caused by the account billing block.

Any content-level judgment on secrets is impossible from these runs. The scan is deterministic and passes on `main`; there is no evidence of a leaked key in these branches from CI.

## Azure Static Web Apps deploy failures — explicit ruling

The `Build and Deploy Job` (`.github/workflows/azure-static-web-apps-orange-hill-02285750f.yml`) also failed with `steps: 0` at startup on every PR — same billing block, before the `Azure/static-web-apps-deploy@v1` step (and its `AZURE_STATIC_WEB_APPS_API_TOKEN_…` secret) could ever be reached. So the failure is **NOT** a missing/expired Azure SWA token (category d) and **NOT** a content/build failure — it is the **same account-wide Actions billing block**. Azure deploy passes on `main` with identical YAML.

## Why Vercel passes

`Vercel` and `Vercel Preview Comments` run on Vercel's own external GitHub App / build infrastructure, independent of GitHub-hosted Actions runners. The Actions billing block does not touch them, so they deploy and report success normally.

## Repo-fixable in the integration branch?

**No.** No edit to workflow YAML, permissions, `needs:`, or `if:` conditions can start a runner that the account billing block is refusing to provision. The only remedy is the account/org owner clearing the GitHub billing / raising the Actions spending limit (GitHub → Settings → Billing & plans), then re-running the checks. Once billing is restored, these same PRs should produce real `secret-scan`, `gate`, and Azure deploy results with executed steps.

## Cited run URLs

- 247: https://github.com/l2v-hub/ClinicOS/actions/runs/29081426263 (secret-scan) · https://github.com/l2v-hub/ClinicOS/actions/runs/29081426267 (Azure)
- 248: https://github.com/l2v-hub/ClinicOS/actions/runs/29085650448 · https://github.com/l2v-hub/ClinicOS/actions/runs/29085650431
- 249: https://github.com/l2v-hub/ClinicOS/actions/runs/29083297048 · https://github.com/l2v-hub/ClinicOS/actions/runs/29083297075
- 250: https://github.com/l2v-hub/ClinicOS/actions/runs/29081987934 · https://github.com/l2v-hub/ClinicOS/actions/runs/29081988010
- 251: https://github.com/l2v-hub/ClinicOS/actions/runs/29082349227 · https://github.com/l2v-hub/ClinicOS/actions/runs/29082349288
- 252: https://github.com/l2v-hub/ClinicOS/actions/runs/29082330331 · https://github.com/l2v-hub/ClinicOS/actions/runs/29082330332
- Passing `main` baselines: AI Import E2E Gate `28979030024`, Azure `28979030005`

# Activation follow-up validation

Date: 2026-10-16. Draft PR: https://github.com/l2v-hub/ClinicOS/pull/471.

The user supplied CLINICOS_BOT_TOKEN and authorized repository configuration. No patient data, application source, dependency declarations or unrelated maintenance SQL changed.

## Verified results

| Check | Actual result | Evidence |
| --- | --- | --- |
| Relevant synthetic regressions | PASS, 81/81 locally and on a native GitHub runner | test-results/node-suite.txt, test-results/qa-complete-regressions.txt, test-results/native-38964221458.txt |
| Actual Codex sandbox on Ubuntu22.04 / CLI0.159.2 | PASS: production runner and direct invocation return exact sandbox-ready output, exit0 and expected marker contents | native run38964221458, PR regression38964221659 |
| Independent source/security review | PASS for scoped code, bound to source manifest | qa-gate.md, qa-reviewed-files.sha256 |
| Existing application build/browser evidence | Carried forward explicitly for unchanged application source, not rerun or used as live activation proof | ../codex-runner-activation/ |
| Actions credential availability | All model/bot/deployment entries and auto-release flag present | native availability booleans |
| Authorized repository mutation | BLOCKED: first PUT to actions/permissions/workflow returned403 after successful administrator/read preflights. No setting was mutated; no cumulative ruleset created | native run38964221458 |

The sandbox false negative was caused by missing asynchronous Node stdout despite actual successful execution. The supported readiness payload now writes synchronously; all original exact exit/output/marker assertions remain enforced. Bubblewrap isolation was not disabled or relaxed.

The administrative helper requires an exact reviewed SHA and administrator caller. It preserves default workflow permissions and existing protections, adding only a cumulative main ruleset for the GitHub Actions-owned bug-pipeline-tests context. That required workflow now emits for every PR. The implementation is prepared; the unsuccessful first mutation does not mean those settings were applied.

## Outstanding verification

The final actual dispatch [38964563242](https://github.com/l2v-hub/ClinicOS/actions/runs/38964563242), source cf6be8198946230821685a2309554fff07894b59, confirms:

- Regression job PASS81/81 and actual sandbox PASS again.
- OpenAI GET for configured planner model returned200 with matching model ID. This establishes authenticated model metadata access only.
- Anthropic GET models returned401. The available ANTHROPIC_API_KEY is not accepted for API authentication; authenticated Claude review cannot start.
- GitHub's first PUT returned403 with the whitelisted reason bot-token-permission-denied (the actual GitHub error is Resource not accessible by personal access token). That operation requires repository Administration write permission. No successful write occurred.
- The main branch still reports protected:false; neither the checkbox nor the new ruleset was applied.

Exact selected output is in test-results/native-38964563242.txt. Required external corrections: grant the existing bot effective Administration read/write authorization for this repository, and supply a valid Anthropic API credential in the existing Actions secret. Never send credentials in issue comments or chat. After those changes, rerun the exact reviewed-SHA manual validation; no unchanged retries or budget resets. Model metadata access, if successful, proves neither paid inference nor completed Claude review. Default-branch integration, real issue processing, final Claude approval and release remain unverified. No merge, deploy or counter reset occurred.

## Reusable cloud configuration

The existing cloud startup draft was updated and saved successfully with the native sandbox result, current Actions credential availability, exact remaining403/401 failures and separate local subscription limitations. It is saved, not applied or published. Future cloud reuse requires reviewing/saving the changes in environment settings and publishing; this is separate from correcting Actions credentials and does not activate GitHub workflows.

## Verdict

**BLOCKED** for full live activation. Native runtime readiness is now established; actual repository authorization is still denied and Anthropic API authentication fails401. Preserve durable budgets and resume only after the relevant permission change, without bypassing gates.

# Author report: cloud review skill alignment

The complete replacement for `.claude/skills/clinicos/references/bug-delivery.md` is derived from merged base `e431990b8e28830972f7f5ab36379e3b1023b9cc`. It updates only the two Claude Max location passages.

The playbook now permits a supported authenticated local host or the trusted GitHub-hosted worker on `main`. The hosted path uses `CLAUDE_CODE_OAUTH_TOKEN`; a real `probe` must return `probe-passed` and qualify actual subscription OAuth plus the supported model profile before `CLAUDE_CLOUD_REVIEW_ENABLED=true` is set. It explicitly rules out inherited local GUI authentication, Anthropic API billing fallback, and an extra API key.

The existing native request/claim, current SHA, checks, budget and report guards remain; labels and schedule only wake the worker. The existing source-as-data boundary remains: reviewed code/settings/tools are not executed and Claude receives no GitHub or deployment credentials. The separate canonical cloud review guide and workflow confirm the variable, secret, probe mode, trusted `main` checkout and wake events.

Verification: reviewed the unified diff and exact source paragraphs; confirmed the change is documentation-only and affects exactly those two passages. No tests or application E2E were run for this reversible documentation change. No Git/API/provider/state write, installation, publication, or source/test/runtime edit was performed.

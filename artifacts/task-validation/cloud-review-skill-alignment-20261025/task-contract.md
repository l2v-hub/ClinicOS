# Task contract: cloud review skill alignment

Base: `e431990b8e28830972f7f5ab36379e3b1023b9cc`.
Target output: complete replacement for `.claude/skills/clinicos/references/bug-delivery.md` in this private author directory only.

## Included

- Change exactly the two obsolete passages that say Claude Max review must use an already-authenticated local session and cannot run in GitHub Actions.
- Document both supported paths conditionally: an authenticated local session on a supported host, or the trusted `main` GitHub-hosted worker using `CLAUDE_CODE_OAUTH_TOKEN` after a real authentication/model-profile probe succeeds.
- State that setting `CLAUDE_CLOUD_REVIEW_ENABLED=true` is appropriate only after that successful probe. Preserve the no Anthropic API billing fallback and no extra API key.
- Preserve the native request/claim, current SHA, checks, budget, ownership and report guards; wake labels or a schedule do not authorize review by themselves.
- Preserve source-as-data and no execution of reviewed code/settings/tools, plus all unrelated existing policy and gates.
- Provide source patch, hashes, and a concise report in the private output directory.

## Excluded

- Any Git checkout/worktree edit, commit, API call, provider/state mutation, installation, publishing, or runtime/test change.
- Any edit outside `/workspace/.clinicos-cloud/cloud-review-activation-20261025/skill-cloud-author`.
- Changes to the `.agents/` wrapper, other skills, or any policy unrelated to Claude Max authentication location.

## Acceptance

1. The replacement is derived byte-for-byte from the named merged source except for the two intended passages.
2. The local-auth and hosted-worker paths both require positive evidence of actual OAuth authentication and a supported model profile before review enablement.
3. The text makes clear that review wakeups do not grant authority; the current native request/claim/SHA/check/budget requirements remain.
4. No API billing fallback, extra API key, hardcoded current version/count/status, secret, or PHI is added.
5. Hash manifest identifies base blob and output SHA256. The patch applies to the base version. `STOP.json` seals final artifact hashes.

## Verification boundary

Review the small documentation diff, confirm target paths/commands/variables against the frozen base documents, verify exactly two changed passages and no source/test/runtime files, and scan the outputs for credential/PHI-like content. Do not run tests or application E2E for this documentation-only change.

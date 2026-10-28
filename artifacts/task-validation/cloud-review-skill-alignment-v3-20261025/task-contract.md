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


## Amendment after actual Claude513 review1

# Shared documentation correction after real Claude review

Actual Claude1 on PR513 head e26f4cdf2060b5e3cdac64ca9d60d56cd22e8db4 comment6403448078 requests one low documentation fix: docs/cloud-claude-review.md incorrectly states jobs disabled until activationvariabletrue. The reviewed gate already correctly accepts unset or true; false/invalid stop reviews, manual authenticationprobe bypass unchanged. Actual Actions context40232274585 isUNSET; officialmain4f probe40232898341PASSED. No credential or billing changes.

Grouped scope: correct operatorREADME on PR513 and the same semantics in pending portable skill PR511 so both models receive one consistent process. Exactly2documentation files allowed: docs/cloud-claude-review.md baselinePR513e26; .claude/skills/clinicos/references/bug-delivery.md baselinePR511d6d23302e999a435c1b4d912ed563e42ab33c60e. Preserve every other paragraph/rule, auth/claim/ownership/history/trustroot/quality/release constraint, model-profile/capacity and noAnthropicAPI fallback. No runtime/workflow/tests/dependency changes.

AC: both documents clearly state absent/empty or true enables queuedreviews, false/invalid disables them; probe dispatch stays available and actualprobe/profile proof required before declaring activation operational; no manual variable creation required. Explain reviewedmain merge mayactivate this default, verifyprobe andevent beforedeclaringready. Existingmanualhosted alternatives and noGUI/noAPIfallback preserved. NativeCI andgenuinepeer/newfinalCodex remain required forboth publishedheads; no clinicaldeploy/issueclosure claimed.

Validation: inspect exact two bounded diffs against their own baseheads; compare new text to actual workflow expressions/probecontract; frozenbaseline/source hashes and report/STOP. Documentationonly: no mirroring tests or local fullapp/E2E; nativechecks separatelyrun afterpublication. Independent NEW QA session afterauthorSTOP. No sourcecheckout/Git/API/state/provider writes byauthor; outputonly this directory. Parentattempts andrealClaude finding remain immutable; one sharedactualLuna correction maps PR513implementation2 andPR511implementation2, parentmanualtaskround3.

This PR includes only its mapped documentation file; the sibling PR contains the other shared-author output. Previous runtime changes are byte-preserved. Historical artifact files appear in the complete source manifest because they remain outside the new revision packet.

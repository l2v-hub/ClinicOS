# Task contract: Repository-owned Claude cloud activation

User authorizes fully autonomous cloud Max reviews. Actual ActionsPAT variable reads403; no new tokens/manual permission requests. Current workflow only true; need allow unset OR true, preserving explicitfalse/invalid emergencyoff. Authentication probe bypass remains as is. Existing repo/ref/event gates, source-trust, OAuth/PAT isolation, native claims/CAS/history/release/ownership remain unchanged.

Source baseline exactmain e431990b8e28830972f7f5ab36379e3b1023b9cc. Separate priorPR512 numeric modelID fix untouched. Exactly two sourcepaths allowed: .github/workflows/claude-cloud-review.yml and NEW agent-team/tests/bug-pipeline/cloud-review-activation.test.mjs. Add minimal clause and explanatorycomment, meaningful truth-table reading actual activation expression. No other code/dependency edits.

AC: unset/true enable eligible reviews; false/invalid never consume evenmanualreview, probe bypass unchanged; caseinsensitive GHA comparisons explicitlymodeled; repository/ref/eventfilters unchanged; fixedtrustedcheckout/read-only permissions/pinnedsteps unchanged. Gate tests fail oldbaseline and passcandidate; actionlintpasses. Metadatajob actualenum first and genuinepostmergecloudreview proveactivation separately; code itself not proof operational.

No UI/clinical/API/database changes; no screenshot meaningful. Evidence: sourcehashes/diff, focusedtestsRED/GREEN, actionlint; NEWindependentQA and genuineClaude report+Codex final before normalprotectedmerge. No Git/API/provider/canonical writes byauthor. No secrets in logs.


## Amendment after actual Claude513 review1

# Shared documentation correction after real Claude review

Actual Claude1 on PR513 head e26f4cdf2060b5e3cdac64ca9d60d56cd22e8db4 comment6403448078 requests one low documentation fix: docs/cloud-claude-review.md incorrectly states jobs disabled until activationvariabletrue. The reviewed gate already correctly accepts unset or true; false/invalid stop reviews, manual authenticationprobe bypass unchanged. Actual Actions context40232274585 isUNSET; officialmain4f probe40232898341PASSED. No credential or billing changes.

Grouped scope: correct operatorREADME on PR513 and the same semantics in pending portable skill PR511 so both models receive one consistent process. Exactly2documentation files allowed: docs/cloud-claude-review.md baselinePR513e26; .claude/skills/clinicos/references/bug-delivery.md baselinePR511d6d23302e999a435c1b4d912ed563e42ab33c60e. Preserve every other paragraph/rule, auth/claim/ownership/history/trustroot/quality/release constraint, model-profile/capacity and noAnthropicAPI fallback. No runtime/workflow/tests/dependency changes.

AC: both documents clearly state absent/empty or true enables queuedreviews, false/invalid disables them; probe dispatch stays available and actualprobe/profile proof required before declaring activation operational; no manual variable creation required. Explain reviewedmain merge mayactivate this default, verifyprobe andevent beforedeclaringready. Existingmanualhosted alternatives and noGUI/noAPIfallback preserved. NativeCI andgenuinepeer/newfinalCodex remain required forboth publishedheads; no clinicaldeploy/issueclosure claimed.

Validation: inspect exact two bounded diffs against their own baseheads; compare new text to actual workflow expressions/probecontract; frozenbaseline/source hashes and report/STOP. Documentationonly: no mirroring tests or local fullapp/E2E; nativechecks separatelyrun afterpublication. Independent NEW QA session afterauthorSTOP. No sourcecheckout/Git/API/state/provider writes byauthor; outputonly this directory. Parentattempts andrealClaude finding remain immutable; one sharedactualLuna correction maps PR513implementation2 andPR511implementation2, parentmanualtaskround3.

This PR includes only its mapped documentation file; the sibling PR contains the other shared-author output. Previous runtime changes are byte-preserved. Historical artifact files appear in the complete source manifest because they remain outside the new revision packet.

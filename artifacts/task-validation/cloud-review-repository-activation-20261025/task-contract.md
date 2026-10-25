# Task contract: Repository-owned Claude cloud activation

User authorizes fully autonomous cloud Max reviews. Actual ActionsPAT variable reads403; no new tokens/manual permission requests. Current workflow only true; need allow unset OR true, preserving explicitfalse/invalid emergencyoff. Authentication probe bypass remains as is. Existing repo/ref/event gates, source-trust, OAuth/PAT isolation, native claims/CAS/history/release/ownership remain unchanged.

Source baseline exactmain e431990b8e28830972f7f5ab36379e3b1023b9cc. Separate priorPR512 numeric modelID fix untouched. Exactly two sourcepaths allowed: .github/workflows/claude-cloud-review.yml and NEW agent-team/tests/bug-pipeline/cloud-review-activation.test.mjs. Add minimal clause and explanatorycomment, meaningful truth-table reading actual activation expression. No other code/dependency edits.

AC: unset/true enable eligible reviews; false/invalid never consume evenmanualreview, probe bypass unchanged; caseinsensitive GHA comparisons explicitlymodeled; repository/ref/eventfilters unchanged; fixedtrustedcheckout/read-only permissions/pinnedsteps unchanged. Gate tests fail oldbaseline and passcandidate; actionlintpasses. Metadatajob actualenum first and genuinepostmergecloudreview proveactivation separately; code itself not proof operational.

No UI/clinical/API/database changes; no screenshot meaningful. Evidence: sourcehashes/diff, focusedtestsRED/GREEN, actionlint; NEWindependentQA and genuineClaude report+Codex final before normalprotectedmerge. No Git/API/provider/canonical writes byauthor. No secrets in logs.

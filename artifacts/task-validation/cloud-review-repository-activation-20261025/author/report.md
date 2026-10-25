# Cloud review activation candidate

The candidate changes only the workflow activation clause and adds one focused regression test. The workflow now permits reviews when `CLAUDE_CLOUD_REVIEW_ENABLED` is unset or equals `true`; an explicit `false` and every unrecognized value remain blocked. GitHub Actions comparisons are case insensitive, so `FALSE` is also blocked. The existing workflow-dispatch probe bypass remains unchanged. Repository/ref, event, checkout, permissions, pinned actions, and execution steps are unchanged in the source diff.

The new test reads the actual activation expression out of the workflow and evaluates it with a deliberately small parser that rejects unsupported syntax. It covers unset, `true`/`TRUE`, `false`/`FALSE`, malformed values, scheduled reviews, manual review dispatches, and probe dispatches, and asserts the existing repository/ref/event and trusted checkout guards remain present.

## Evidence

- Trusted baseline: `e431990b8e28830972f7f5ab36379e3b1023b9cc`.
- Focused test against baseline: RED, 2 passed and 1 failed because unset does not enable.
- Focused test against candidate: GREEN, 3 passed.
- `actionlint -shellcheck= -pyflakes=` on candidate workflow: passed.
- Node 22 syntax check on new test: passed.
- Source diff is in `source.patch`; source files and hashes are in `source-manifest.sha256`.
- No provider/API/network calls, installations, source checkout mutations, Git writes, or secret output were made. No clinical/UI/database code was touched.

This is a source candidate only. It does not establish the live Actions variable state or prove cloud review activation operational. The independently run finite-enum probe and a genuine post-merge cloud review remain separate root-level evidence requirements.

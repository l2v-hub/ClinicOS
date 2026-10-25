# Implementation plan

Review Claude on GitHub-hosted runner with Max subscription only. No local PC required. Event label claude-review-ready plus scheduled catchup every ten minutes; preserve native claim/request/SHA/budget and all existing reports. Never execute PR code/settings/hooks or give reviewer GitHub/deploy/API credentials. Persist genuine review then return codex-review-ready and wake Codex. Test credential in real hosted runner before attempting a review; no Anthropic API fallback. Ownership and final independent Codex/deploy gates remain.

Analysis, bounded implementation, independent QA, hosted qualification, genuine peer review, protected merge and observed activation. Preserve all failed attempts.

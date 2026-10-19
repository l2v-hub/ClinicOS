# Reproduce the independent checks

From the frozen checkout, run `node --test --test-reporter=tap agent-team/tests/bug-pipeline/*.test.mjs scripts/quality-gate/*.test.mjs`. Run the17public independent probes with `node --test --test-reporter=tap /path/to/publication/independent-negative-cases.mjs`; imports use the existing checkout absolute path recorded in the source. No dependency installation or actual GitHub/model access is required.

The optional actual-state-local-validation.mjs and full-state-local-validation.mjs require the root-supplied private snapshot files one directory above publication; those fixtures are deliberately not published. They perform pure candidate validation and local `git show`/`git ls-tree` reads. Native API responses in these probes are explicit synthetic observations, not current hosted-state assertions.

After obtaining the shared browser lane, use `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/clinicos-batch450-playwright flock -n /tmp/clinicos-browser-qa.lock node /path/to/publication/browser-receipt-recovery.mjs`. It launches only a temporary loopback HTTP surface and existing Chromium, uses fixed synthetic data, then closes its context/browser/server. Generated video initially receives Playwright's filename; this publication uses receipt-recovery.webm. Read concrete results in test-results/browser-result.json. Never run into or overwrite this sealed publication; use a fresh owned evidence directory and adapt its output path.

The media/integrity scanner is audit-and-seal.py; it validates frozen source/proofs, decodes screenshots/video/all ZIP member images, CRC-checks and secret-scans all archive members, writes a manifest and ends with a seal. This sealed directory is immutable after QA completion.

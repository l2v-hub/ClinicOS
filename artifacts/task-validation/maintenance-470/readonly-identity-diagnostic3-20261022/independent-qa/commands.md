# Commands and read receipts

Read task-contract.md, reservation.json, source-freeze.json, repository .claude/skills/qa-gate/SKILL.md, complete author source.patch, complete independent git diff, helper/test relevant control flow.

- git diff 8e3c5fd48682766dbb34eb4b95699145b2d56965 fa88482503e08b191395473a599325831f7e4bd7 -- (read-only, full diff saved)
- git diff --name-only baseline source; git ls-tree baseline/source -- each of five paths
- Node22 validate-task-contract.js outputdir (contract.log)
- Node22 --check frozen/scripts/maintenance/demo-storage-inspect.mjs (exit0)
- Node22 --test frozen/scripts/maintenance/demo-storage-inspect.test.mjs frozen/scripts/maintenance/demo-storage-workflow.test.mjs (baseline-tests.log, exit0)
- Node22 probes.mjs (probes.log, exit0)
- Node22 browser.cjs (administrator file URL rejection preserved)
- Node22 browser-setcontent.cjs (browser-setcontent.log, exit0)
- Python hashlib source inventories, Git mode/blob assertions, PNG header and ZIP trace integrity validation (PASS)

All executable Node calls use /tmp/clinicos-node22-native12/node_modules/node/bin/node. Frozen snapshot /tmp/clinicos500-identity-diagnostic3-qa-source. QA writes exclusively this output directory. No source fixes or altered expectations after failures.

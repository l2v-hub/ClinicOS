# Packet11 validation and evidence report

## Candidate integrity

- Product source remains `42ecd1f9ecdaad7f9bdc847ec065ed6473725b3f`; current public head is `a8bc7a961ba8a73678bef123667f82961a0a49c5`.
- The source manifest is derived from the immutable Git trees at base `b062de3324661cf07fdd929b9bac48a27626f1e5` and current head, with 165 changed paths (21 non-artifact and 144 historical-artifact paths). The packet11 prefix is excluded.
- The candidate copies all 22 packet9 files; archives the five original root files before replacing their current root versions; copies the packet10 validation alias; preserves all eight required evidence keys; and adds bounded migration and negative-proof evidence.
- The manifest template uses the trusted 15-key schema. Its future `sha` is `null` until root creates the actual packet commit. No live SHA is invented.

## Source-bound prior QA

- Independent QA9: 23/23 assertions passed in the existing proactive HTTP/PostgreSQL test on source `57c192513dcf7cf55853381ac7337926cbdc90cb`. Its report explicitly says the historical race was not reproduced and preserves two setup-only failures plus an auxiliary watcher limitation.
- Packet10: 449 focused communication/GitHub/release/exact-demo-dispatch tests passed. Its report verifies the older sealed 1,072-pass suite, three Windows skips, and eight adversarial checks as reused historical evidence, not as a fresh run. Original hashes and source attribution remain in copied reports.
- No product tests or CI were rerun for packet11; the source is unchanged.

## Actual secret migration and follow-up

- Main helper run `39729875897`: all three jobs (`preflight`, `ensure_environment_copy`, `remove_repository_copy`) completed successfully. Protected-environment copy was ensured; repository copy was deleted after fresh environment readback; no secret values were read or printed.
- Post-migration metadata attempt `5`, run `39700640337`, comment `6333761827`: repository secret name absent, protected-environment secret name present, expected environment identity present. All three metadata probes returned HTTP 200; no secret value reads or writes occurred.
- Fresh negative run `39730182635`, attempt 1, head `bc697a95814a9aedff70eab190e500b333c7fdbd`, job `119663185102`: the fixed boolean-only assertion passed and required the ambient demo token to be unavailable outside the protected environment. The workflow was queued after the migration jobs completed and did not attach the protected environment.
- The negative run artifact upload succeeded, but an actual raw artifact download returned HTTP 403. The packet includes the source-bound assertion/metadata receipt and workflow, not fabricated artifact contents.
- Earlier positive exposure run `39667459014`, earlier failures, and all original history remain preserved.

## Pending

Packet11 has not been committed, independently adopted, or published. New-head native six, actual Claude 2, final Codex, deployment, and issue closure are pending. No new implementation round or review approval is claimed.

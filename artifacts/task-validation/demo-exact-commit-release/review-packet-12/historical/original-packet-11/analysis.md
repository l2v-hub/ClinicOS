# Packet11 adoption-envelope analysis

Packet11 repairs the evidence envelope needed by the trusted standalone review adopter. Product source remains exactly `42ecd1f9ecdaad7f9bdc847ec065ed6473725b3f`; current public source/head is `a8bc7a961ba8a73678bef123667f82961a0a49c5`. The adoption source manifest is derived from Git tree entries between merge base `b062de3324661cf07fdd929b9bac48a27626f1e5` and that current head. It contains 165 paths: 21 outside `artifacts/task-validation` and 144 historical artifact paths. The future packet11 path is excluded from that source manifest. Root will compute its published commit SHA later; no future SHA is fabricated.

The required prior evidence aliases are copied byte-for-byte at their exact path keys. Packet9's original `task-contract.md`, `analysis.md`, `implementation-plan.md`, `validation-report.md`, and `imported-history.json` are archived at `historical/original-packet-9/` before their root counterparts are replaced. The other packet9 files are retained unchanged. The full previous packet9 `source-manifest.json` remains as a historical file; the current 165-path manifest is recorded in the new `imported-history.json` and root-owned manifest template.

## Security remediation evidence

The actual helper migration run 39729875897 completed `preflight`, `ensure_environment_copy`, and `remove_repository_copy` successfully. It ensured a protected-environment copy and deleted the repository copy only after a fresh environment readback. Post-migration metadata run 39700640337, attempt 5, performed read-only metadata probes: repository secret name absent (HTTP 200), environment secret name present (HTTP 200), and expected environment identity/policy present (HTTP 200). No secret values were read and no secret writes occurred.

The fresh negative run 39730182635 used head `bc697a95814a9aedff70eab190e500b333c7fdbd` and completed successfully. Its fixed assertion step was `Check ambient availability as a boolean only`, and the recorded assertion passed while requiring the ambient demo token to be unavailable. It ran after all migration jobs completed and without attaching the protected environment. The workflow reads only a boolean comparison. The artifact upload succeeded, but the raw artifact download returned HTTP 403; this packet records the metadata and denial without claiming to have inspected artifact contents. The previous positive exposure run 39667459014 remains unchanged in historical evidence.

## Existing implementation and QA history

The canonical implementation contains two legacy rounds and operator continuations 3 through 10, including failed rounds 3 and 4 and passed evidence continuations 5 through 10. Packet11 imports those exact canonical values and the existing review prefix, review ledger, and review reports. No continuation11 is introduced.

QA9's report records one focused existing proactive HTTP/PostgreSQL file passing 23/23 on source `57c192513dcf7cf55853381ac7337926cbdc90cb`; it did not reproduce the historical race, and its setup-only limitations remain documented. Packet10 reports 449 focused communication/GitHub/release/exact-dispatch tests passing. It also records prior sealed 1,072-pass evidence, three Windows skips, and eight adversarial checks as reused and verified historical proof, not as a new execution. These results retain their original source attribution and do not substitute for native checks on the packet11 publication head.

Publication-head native checks, actual Claude 2 review, final Codex review, deployment, and closure remain pending. The packet does not change source, old evidence, or canonical status.

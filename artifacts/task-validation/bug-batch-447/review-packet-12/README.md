# Private review packet 12 — PR #497

This evidence-only packet binds the original eight actual issue recordings to the current plan destinations. Start with [validation-report.md](validation-report.md), [issue-proof-index.md](issue-proof-index.md), and [media-index.json](media-index.json). The root `evidence-manifest.json` records the release controller schema exactly.

Seven records come from independent QA4 canonical-seven source `8a27ef3`; #486 comes from the independent QA5 actual Milo capture from continuation-2 on source `b76eb6b`. Its continuation-5 report is a later scoped regression report referencing that capture, not a second recording. The private trace derivative is token-redacted; original screenshots and video bytes are preserved exactly.

The manifest is reviewable but not accepted by the current main verifier yet: the authentic #453 trace is above its 25 MiB limit. A separate 32 MiB author proposal is still unmerged and awaiting independent QA. Current source/native/reviewer/release/deployment/closure gates remain pending.

Packet11 is immutable: [its review summary](../review-packet-11/README.md), [independent backend51 report](../review-packet-11/independent-qa11/validation-report.md), and [retained QA10 import desktop/tablet report](../review-packet-11/retained-qa10/provenance/FOLLOWUP10-REPORT.md) remain separate evidence; none is described here as fresh UI coverage. Original issue receipts remain in the [immutable packet9 at 84402577](https://github.com/l2v-hub/ClinicOS/tree/84402577c0ae313e57dcdb22c1a8102ae16d6b46/artifacts/task-validation/bug-batch-447/review-packet-9). No raw traces, logs, SQL, cookies, credentials, or patient data are included.

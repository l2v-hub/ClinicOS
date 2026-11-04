# Public ClinicOS restoration evidence

Status: independently verified public profile chooser and role-specific routes.

Reviewed PR source R: `7a654c18bd1da77c82c100b3f12ce1e5f12e3ff6` (tree `131b244c873c521500f732d0615f4edd0f8a5731`).
Merged/deployed source M: `b5e79ae7bec869af894f12ed6676547f21172db4` (equal reviewed tree; no source rewrite).

## Required CI and process history

- Bug Pipeline: run 41813687027, success, source 7a654c18bd1da77c82c100b3f12ce1e5f12e3ff6
- AI Import: run 41813687017, success, source 7a654c18bd1da77c82c100b3f12ce1e5f12e3ff6
- Codex Process: run 41819041412, success, source 7a654c18bd1da77c82c100b3f12ce1e5f12e3ff6

- Codex process run 41819041412, attempt 1: cancelled before execution because a higher-priority request was queued.
- Same process run, attempt 2: success; execution started. The cancellation is retained as history, not erased.

## Max5 review provenance

Provider execution was subscription-backed and returned an approved, zero-finding report for R (canonical report SHA-256 387237dd88c52774ec0d206d25e13463add1333a531014916883bcfbd1704897). The review worker ran from trusted workflow base 6e3d880921653465ca0527b40f9fc09f6486ada2; it is distinct from reviewed subject R 7a654c18bd1da77c82c100b3f12ce1e5f12e3ff6. The published GitHub review is COMMENTED, not APPROVED, and the workflow is FAILURE with worker receipt `published-wake-blocked` (post-publication wake blocked). This is disclosed as a real failure; provider approval is not substituted for a GitHub approval. Request e4003c70-e06c-43a0-8207-d461b6605419, claim 1c76820c-8bd7-45ab-b879-4ffb58c1c9f2; native review 5767311890 body SHA-256 e5d65ebb338fbc8db5c8ace2bae353e729afeaf2d7035b7321ca4a1d6011da14; report comment 6629051882 body SHA-256 ec72c66d837aaa1e01beee1cb29eca89781e2ff1a46d0c65bb56a862ef166493; worker job 126531246051; artifact 13316630194 digest sha256:4687fa77c1a9aae43b022ea3ee2b9d9966b1817bb8d8719661f29a7128af4133, receipt SHA-256 6dba2c9980d0c6abd67f78e3a5facd4da688099ce3d4211562e810e9b6c018fd. At that review-time snapshot, final independent QA and release authorization were both false; these are not post-merge status claims.

## Merge-time release evidence

Final QA was verified for reviewed R 7a654c18bd1da77c82c100b3f12ce1e5f12e3ff6 (proof SHA-256 a066c4723c0ba0f4aeba6e33b08661ebbbdc7b6b838c3ede36ed657fccd01cbd). Protected PR 525 merge is merged: R 7a654c18bd1da77c82c100b3f12ce1e5f12e3ff6 → M b5e79ae7bec869af894f12ed6676547f21172db4; trees match and protected checks passed.

Privacy review receipt: actual-independent-review, reviewer /root/profiles_no_expiry_independent_qa, reviewed 2026-11-04T12:33:05Z; all 12 PNGs have bound SHA-256, metadata, visual, and sensitive-content checks.

## Deployment and public verification

Native exact deployment: success, run 41826195990 attempt 1, source M b5e79ae7bec869af894f12ed6676547f21172db4, deployment 6a6b5d5a-edad-434a-a074-db19b2051dbe, artifact 13319454844 (sha256:1865ff4742a8ffec9180d75bb0eb68bb6f79594566c63c8357765df5a58a640b), receipt SHA-256 c6bcc467ece9e222811c6320eccb79f3af5f7747884a60f44642e3f6d374ccc9.

Public verifier: API profiles 5/5; browser role/view cases 10/10; clinical writes 0; raw traces recorded: false.

### Immutable screenshot inventory

- desktop-chooser.png: SHA-256 c1b2dd5258f3f727ad9d4071865edb279d8efdf1e0246cb86931bb1ffb4e16a1
- mobile-chooser.png: SHA-256 4261ceb450a204ada4d67f4ed681554cd1de43f70e7c3920ab1dc7b50f520fc6
- desktop-administrator-avatar.png: SHA-256 df8335159676e12f8e9ba8f51a125ddbbe0961cb36fd55f151ab35cb7e372f82
- desktop-supervisor-avatar.png: SHA-256 2371510c5e3fa0433f432b748dcbcaece821b8a97ca0600cfd097fd4bfdb8afa
- desktop-doctor-avatar.png: SHA-256 e657a99c415ae8f3669d16acacbb9fc7117fd356f83ac80e25187101595dd2b0
- desktop-nurse-avatar.png: SHA-256 a0dc9b3467f2ba71421dee3b04521c8a45c04b448da2b4e9fda1919ec285ce78
- desktop-oss-avatar.png: SHA-256 5a73193dbf7a66be58f634854927299774fc35027e687fcca66cf6ccfa0e9345
- mobile-administrator-avatar.png: SHA-256 d78a5e8079c7e3eae2835ea96018dad332e2e215d6a090bc16c4b126ad13f0b9
- mobile-supervisor-avatar.png: SHA-256 a8a478385bcfcb3d10292a76ff0199130f29eebc487f7d6c9a9cb73116cad8cc
- mobile-doctor-avatar.png: SHA-256 13964fbff48173586bb49f4283e0bfd6e02314ba8d7ced7576944548dc5dd046
- mobile-nurse-avatar.png: SHA-256 0cfbc10675673aa108bf39847272a2631e8f8ef89272e2a74ada81e92c1c5797
- mobile-oss-avatar.png: SHA-256 4d58d1eddd55c0a1b36f02617ae3353a1cc8c62f1662390cffccbdc30f2df0a6

Only the sanitized public verification summary and these 12 PNG screenshots are included. No session tokens, HAR/network traces, provider secrets, or patient data are included.

# Root-owned adoption and release plan

1. Independently compare the candidate to the reservation, old packet9 bytes, exact evidence copy map, 165-path Git source manifest, imported-history values, and trusted 15-key schema. Preserve all old packet paths and continuation values.
2. Root commits only the new packet11 artifact tree, then fills the actual commit SHA into the standalone manifest template. Verify the product/source projection remains identical to `42ecd1f9ecdaad7f9bdc847ec065ed6473725b3f` and current source `a8bc7a961ba8a73678bef123667f82961a0a49c5`.
3. Independent QA runs the trusted standalone adopter against the exact candidate and canonical state, including persistence guard and preserved-packet checks. Do not live-adopt until it passes.
4. After root publishes the adopted artifact commit, run the required native six checks on the exact new head. Do not reuse the existing a8bc checks as new-head checks.
5. Request actual Claude review only for that exact adopted subject after required checks pass; preserve existing requests and reports on reruns. Then complete final Codex review and protected-release validation.
6. Keep deployment and issue closure pending until their separately authorized steps actually pass.

The six steps above are a plan, not evidence of commit, adoption, review, deployment, or closure.

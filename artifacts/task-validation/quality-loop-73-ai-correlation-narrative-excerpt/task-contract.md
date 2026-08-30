# Cycle 73 task contract — bound narrative correlation excerpts

## Objective

Prevent cross-patient structured correlation from transferring complete narrative-section PHI when the assistant needs only a short source excerpt around the match.

## Acceptance criteria

- Full narrative text remains only inside PostgreSQL for matching.
- The selected row contains a centered excerpt of at most `240 + query length` characters plus ellipses.
- Matches beyond the first 512 characters remain discoverable.
- Candidate patient ACL, section filter, latest-section ordering and result limit remain unchanged.
- `contentTruncated` propagates through `correlate_structured_data` to the assistant.
- No complete `originalText`/`reviewedText` field is selected or deserialized in Node.
- Focused tests, backend build/lint, diff checks and independent reviews pass.

## Safety envelope

- No schema, frontend, authentication, authorization or narrative-write change.
- Preserve result/source types and record IDs.
- Do not stage unrelated local changes.

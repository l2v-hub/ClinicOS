# Cycle 73 validation report — bound narrative correlation excerpts

## Result

PASS. Cross-patient structured correlation now keeps full narrative PHI inside PostgreSQL and transfers only a centered, bounded source excerpt with truthful truncation metadata.

## Evidence

- Cycle-specific tests: PASS, 4/4.
- Focused gateway compatibility tests: PASS, 29/29.
- Backend production build and Prisma client generation: PASS.
- Cycle-scoped ESLint: PASS, zero errors/warnings.
- `git diff --check`: PASS (line-ending conversion warnings only).
- Independent security review: PASS, no P0/P1.
- Independent UX/performance review found one P1 window-boundary defect; it was fixed and the final re-review is PASS.

## Contract checks

- Candidate patient IDs remain produced by the existing ACL-scoped, bounded correlation query.
- Full reviewed/original text participates in PostgreSQL matching but is not selected into Node.
- SQL `strpos` locates matches across the complete narrative, including beyond the first 512 characters.
- Excerpts use a 120-character radius plus query length; start is clamped and end derives from the actual clamped start.
- Ellipses and `contentTruncated` correspond to text genuinely omitted on either side.
- Latest matching section per patient, optional section key and record/source types remain unchanged.
- Correlation aggregates section truncation and assistant dispatch preserves it via the standard `truncated` contract.

## Residual risks

- No configured local PostgreSQL instance was available for seeded execution of the lateral excerpt SQL; build, source-contract tests and independent SQL reviews were used locally.
- Normalized SQL character positions are stable for the gateway's Italian one-character translation map. Broader Unicode normalization remains a P2 limitation.
- `searchClinicalSections` has a separate full-text projection path and remains a candidate for a later cycle.

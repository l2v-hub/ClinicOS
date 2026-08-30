# Cycle 52 validation report

## Result

The patient-allergy gateway now returns a bounded, allow-listed projection and reports truncation to the assistant.

## Automated evidence

- Focused gateway suite: **22/22 passed**.
- Backend TypeScript/Prisma production build: **passed**.
- Targeted ESLint for gateway service, filter and test: **passed**.
- The new test verifies 101→100, `truncated=true`, extra-field removal, malformed entries and non-array input.

## Security/performance evidence

- Tenant and patient ACL checks still precede cartella loading.
- Processing is limited to a 101-entry look-ahead, reads at most 241 characters per allowed field and emits at most 100 source references.
- Arbitrary JSON keys cannot reach the assistant result.
- The existing assistant aggregation consumes the gateway `truncated` flag for partial-result disclosure.

## Independent review

- Security review: **PASS**, no P0/P1 in scope.
- UX/performance review: **PASS** after moving the field slice before normalization; CPU work per allowed field is bounded.
- The full `Cartella.data` read remains a known relational-model limitation requiring a schema migration; it is not introduced by this bounded output cycle.

## Deployment status

- Production deployment remains coordinated with Railway; the authenticated CLI account exposes no backend project.

# Cycle 19 validation report

## Result

PASS for the locally executable safety envelope.

The cross-patient pressure search now performs one bounded patient-ID read and one batched chart read instead of one chart query per patient. Database scope is applied before `take`, a second in-memory scope check fails closed, results and source references have hard caps, and partial answers are explicitly announced in both the interface and speech summary.

## Evidence

- Backend focused gateway/planner tests: 50/50 passed.
- Frontend full tests: 193/193 passed.
- Backend production build: passed.
- Frontend production build: passed.
- Backend changed-file ESLint: passed.
- New frontend helper ESLint: passed.
- Touched assistant components pass ESLint with only their pre-existing `react-hooks/set-state-in-effect` findings disabled; no new lint finding remains.
- `git diff --check`: passed (repository line-ending warnings only).
- Independent security/privacy review: PASS, no P0/P1 finding.
- Independent UX/performance review initially found silent truncation as P1; after the interface and TTS remediation, the final review passed with no P0/P1 finding.
- Added a PostgreSQL integration test for ACL-before-cap behavior.

## Open validation gate

The PostgreSQL integration test was not executed because this environment has no target `DATABASE_URL`. The deterministic dependency-injected tests cover query count, scope, ordering, limits, malformed legacy data, and source alignment; the DB test must still run against the deployment-equivalent database before promotion.

## Residual risks

- The second query still projects the complete legacy `Cartella.data` JSON for at most 100 patients. Row count is bounded, but oversized charts can amplify memory and latency; a later cycle should project or normalize only vital-sign data.
- The two pre-existing synchronous state updates inside effects remain frontend lint debt and are outside this cycle's behavior change.
- Production deployment, Entra authentication, and database configuration remain external gates.

## Rollback

Revert the cycle commit. No database rollback or data migration is required.

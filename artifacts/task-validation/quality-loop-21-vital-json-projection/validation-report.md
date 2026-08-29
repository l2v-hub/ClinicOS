# Cycle 21 validation report

## Result

PASS for the locally executable safety envelope.

The second cross-patient read now uses parameterized PostgreSQL JSONB extraction. It returns only bounded vital objects for already-authorized patient IDs instead of transferring complete clinical charts. The pure helper keeps defence-in-depth authorization, deterministic ordering, global budgets, source alignment, and accurate truncation feedback.

## Evidence

- Focused cross-vital tests: 8/8 passed.
- Tests cover ACL-before-cap, maximum two reads, SQL reader look-ahead input, deterministic order, per-patient/global bounds, exact-cap without false truncation, cap+1 truncation, malformed legacy arrays, empty ACL, feature gate, unauthorized role, and invalid runtime label before reads.
- PostgreSQL-gated integration fixture asserts one projected vital, look-ahead truncation, authorized source references, and omission of arbitrary clinical fields.
- ESLint on all changed backend and test files: passed.
- Prettier verification on all changed backend and test files: passed.
- Backend Prisma generation and TypeScript build: passed.
- Full root frontend + backend production build: passed.
- Independent security review: PASS, no P0/P1 findings.
- Independent UX/performance review: PASS, no P0/P1 findings.

## Open validation gate

- The PostgreSQL integration test could not run locally because `DATABASE_URL` is absent. It remains a required deployment gate against the target schema.

## Residual risks

- PostgreSQL still expands the source JSONB array to evaluate filters. Transfer size and application memory are bounded, but database CPU/I/O scale with the stored array size.
- Worst-case bounded transfer is up to 100 patients times 51 projected vital objects before the helper applies its global result budget.
- The durable scale improvement is a normalized indexed vital-sign table with a compatibility migration from legacy `Cartella.data`.

## Rollback

Revert the cycle commit. No data rollback is required because this cycle does not change the schema or write clinical data.

# Cycle 86 task contract — Bounded assistant aggregations

## Problem

The assistant's validated `query_data` plans can execute Prisma `groupBy` and `countDistinct` operations without a database-side row bound. A high-cardinality grouping can materialize an arbitrarily large result in the database client and produce a slow, memory-heavy, confusing assistant response.

## Acceptance criteria

- Fetch at most one sentinel page for grouped aggregates: requested limit plus one, capped at 201 database rows.
- Return no more than 200 grouped rows and propagate `truncated: true` when a sentinel row exists.
- Apply deterministic ascending ordering across every grouping key.
- Permit at most two unique scalar grouping keys in an LLM-emitted plan.
- Keep `countDistinct` exact up to 200 distinct values; reject higher-cardinality plans fail-closed after one 201-row sentinel query instead of materializing every bucket.
- Preserve existing tenant, facility, patient, and filter predicates.
- Preserve normal row queries and non-grouped aggregate response shapes.
- Add no mutation capability, schema migration, Entra dependency, or deployment change.
- Focused tests, TypeScript build, lint, and independent reviews pass.

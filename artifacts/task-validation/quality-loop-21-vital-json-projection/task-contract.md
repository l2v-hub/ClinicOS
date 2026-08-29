# Cycle 21 — bounded cross-patient vital projection

## Baseline risk

The assistant's cross-patient vital search used two reads, but its second Prisma query transferred every selected patient's complete `Cartella.data` JSON document into the Node.js process. With large clinical charts this created avoidable database-to-application traffic, memory pressure, and exposure of unrelated clinical fields.

## Acceptance criteria

- Preserve the authorization gate and apply the signed patient ACL before patient caps.
- Keep the operation at a maximum of two database reads.
- Filter vital label and systolic threshold inside PostgreSQL using parameterized SQL.
- Transfer only the whitelisted vital fields used by the assistant.
- Bound the returned vital rows per patient with one-row look-ahead.
- Preserve source order and the existing global result/source limits.
- Report `truncated=false` at the exact cap and `truncated=true` when look-ahead finds another item.
- Tolerate malformed legacy JSON without throwing.
- Reject malformed or oversized labels before any read.

## Safety envelope

- No schema migration or production data mutation.
- No change to the role, tenant, patient-scope, or feature-gate policy.
- The TypeScript helper retains defence-in-depth ACL and filter checks after the SQL projection.
- Projection string caps are part of this gateway's bounded-output contract: id 128, label/unit/status 32, value/date 64 characters.
- Rollback is the single cycle commit.

# Cycle 18 — Room lifecycle concurrency

## Baseline risk

Room and bed deletion checked for active assignments before deleting, but did not serialize that check with concurrent assignment creation. A successful assignment response could therefore be followed by cascade deletion of the newly created assignment.

## Acceptance criteria

- Use one global advisory-lock order for room writes: room, bed, patient.
- Re-read protected state after acquiring locks.
- Serialize room update/delete, bed create/update/delete, and assignment create/update.
- Never allow a concurrent assignment to return 201 and then be lost through room or bed cascade deletion.
- Enforce the eight-bed room limit under the room lock.
- Preserve administrator-only authorization for room and bed mutations.
- Add focused unit and database-gated concurrency coverage.

## Safety envelope

- No schema migration.
- No destructive production operation.
- No change to read permissions or returned clinical data.
- Rollback is the single cycle commit.

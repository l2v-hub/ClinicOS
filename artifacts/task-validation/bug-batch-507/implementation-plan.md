# Implementation plan

1. Validate contract before application edits.
2. Add optional admission context to new-form factory with validated calendar-day normalization and facility-today fallback.
3. Pass chart admission at creation/reset; retain calendar-slot and saved-editor precedence.
4. Pass intake ingresso.dataPresa through therapy editors only at manual creation; retain existing/imported rows.
5. Add date and explicit-source regression coverage; run related tests, full frontend suite and build with synthetic data and explicit localhost API origin.
6. Hash sources, write implementation report, return IMPLEMENTED — NOT VERIFIED for independent QA. No commits, GitHub or canonical state writes.

Recovery: preserve all logs including failures. Surgical patch requires no data migration.

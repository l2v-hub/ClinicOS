# Root review follow-up attempt log

- Verified root reservation nonce and readback status before editing; verified prior v1 snapshot SHA-256 matched the reservation.
- Added an accessible select-value assertion that the route remains blank after AIFA package selection in both counted paths.
- Made positive SQL readback deterministic by snapshotting existing patient/AIC IDs before counted controls, querying those rows with schedules ordered by time, excluding prior IDs, and requiring exactly one new row.
- Trusted verification runner `node --check` passed. Static scope and action-count checks passed. No app, database, browser, or E2E command was run.

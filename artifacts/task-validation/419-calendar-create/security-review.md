# #419 scoped security review

Source: fa028c11ffe5dbfe514df8110e6ccf7f6b977602 against d028e1ee4c5c44d96b5005362b28f54e5c05fee1.

- Existing appointments.create checked in primary, daily and weekly slot eligibility; common opener rechecks role/date/time/occupied start. Capability revocation discards creation state; existing backend remains final authority. No policy expansion or role assignments.
- Form save and patient requirement unchanged; PatientCombobox now exposes existing requirement and helper text. AppointmentForm creation is shared by admin; this patch does not add operator time restrictions to admin calendar.
- No new endpoint, database schema, raw SQL/HTML, dependencies, logging, credentials, env/CORS/auth changes. React text rendering retained.
- Temporal comparison preserves former primary operator local-calendar/minute behavior; no new clinical threshold. Conflict/assignee/patient server validation remains unchanged (no claim of new backend patient-scope validation).
- Static frontend source/build credential scan PASS; candidate/public artifact scan includes actual configured credential values and expanded ZIP members before promotion/publication.
- Browser APIs intercepted before network; no real patient mutations. Production verification permits only deployed static SPA reads and read-only backend health; unexpected APIs/domain writes fail the fixture.

Root sole application writer; fresh independent reviewer may write own evidence only. Release separately gated after review/rerun; direct user authorization is source of publishing authority, coordination leases are not permission.

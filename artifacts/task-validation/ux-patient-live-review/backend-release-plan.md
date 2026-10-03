# Prepared backend dependency — not released

The online backend still uses the older overview and personal diary-read protocol.
A frontend-only release cannot persist shared handover confirmations.

The prepared source dependency is the complete urgency closure from 069fe805 plus
c39e2d10: 30 backend files, prisma/schema.prisma, and
prisma/migrations/20261003120000_urgency_take_charge/migration.sql relative to origin/main
4cb42d6e. ACK routes alone are insufficient: overview, diary projections, patient summary,
proactive signals, assistant output and capabilities must agree.

The additive migration adds nullable diary authorId and a handover acknowledgement table,
indexes and append-only triggers. It does not rewrite/delete existing clinical rows.
Existing personal diary acknowledgements can become the first shared reading evidence
under the new backend; that semantic change can remove an active urgency for all readers.
DDL/trigger privileges and the remote pending-migration inventory must be checked.

Railway deploy is triggered by the main GitHub workflow, uploads the entire selected ref,
and runs all pending Prisma migrations. It has no independent test gate. No main merge or
backend deployment has been performed by this follow-up.

Earlier W8 evidence is insufficient: the report says READY FOR QA, and its linked 350-test
log has 348 passes and two failures despite a PASS table. Before release, independently
rebuild and run fresh synthetic PostgreSQL migrations and related suites; rehearse upgrade
with existing personal reads; verify author rejection, scope rejection, retries, unchanged
stored status, exact counts and concurrent first readers. Local fixture PostgreSQL binaries
are available without production credentials. Fresh tests and live migration inventory
remain outstanding.

The user was asked explicitly whether to authorize backend and database publication.
Until answered, only authorized frontend work proceeds. This is a release preparation
receipt, not a claim that the backend release is validated or approved.

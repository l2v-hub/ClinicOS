---
name: clinicos-local-db-startup-gotcha
description: "Local stack won't serve /patients — backend/.env points at :5433 e2e DB, Prisma 7 schema has no url so migrate needs manual psql"
metadata:
  node_type: memory
  type: reference
  originSessionId: ae80c67e-9d76-4979-b9fa-5a7b303bb3ea
---

Bringing up the ClinicOS local stack (2026-07): the documented `clinicos-postgres` :5432 dev DB is
NOT what the backend uses. `backend/.env` `DATABASE_URL` points at **:5433 / clinicos_test / postgres:postgres**
(the `clinicos-e2e-265` Podman container, often exited). Symptoms: `/health`=ok but `/patients`→HTTP 500,
`{"error":"Failed to fetch patients"}`.

Fix sequence that worked:

1. `podman machine start` (VM was down) → `podman start clinicos-e2e-265` (matches .env :5433).
2. Both DBs start EMPTY (no schema). `prisma migrate deploy` FAILS on Prisma 7: schema `datasource db`
   block has **no `url`** (injected at runtime via `PrismaPg` adapter + `pg` Pool in backend/src/lib/prisma.ts),
   and there's no prisma.config.ts → CLI can't connect.
3. Apply schema by piping migration SQL directly:
   `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then for each `prisma/migrations/*/migration.sql`
   in sorted order: `podman exec -i clinicos-e2e-265 psql -U postgres -d clinicos_test -v ON_ERROR_STOP=1 < $sql`.
4. `npm run build:backend` (needs dist/seed.js) then `npm run db:seed` → 8 pazienti. `driver.mjs smoke` → OK.

Model is `Patient` (DB table); `Paziente` is only the frontend TS type. `backend/.env` is git-ignored (safe to edit).
Demo clinical data (cartelle/consegne) can be created at runtime via existing API (PUT `/patients/:id/cartella`,
POST `/consegne`) — but cartella item shapes must be well-formed (AllergiaItem/VitaleItem/IndicatoreRischio with
`id` + valid enums) or PatientDetail crashes on render. See [[clinicos-branch-topology]].

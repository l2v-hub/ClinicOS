-- #294: Patient.codiceFiscale as the unique patient key. Nullable so legacy/seed rows
-- (created before the constraint) keep working; Postgres UNIQUE allows multiple NULLs.
ALTER TABLE "Patient" ADD COLUMN "codiceFiscale" TEXT;

-- Prudent backfill from the cartella JSON: only structurally well-formed CFs (omocodia
-- substitution letters allowed in numeric positions) that appear for exactly one patient.
-- Ambiguous or malformed values stay NULL and will be fixed by operators via the UI.
UPDATE "Patient" p
SET "codiceFiscale" = src.cf
FROM (
  SELECT
    c."patientId" AS pid,
    upper(btrim(c."data" ->> 'codiceFiscale')) AS cf
  FROM "Cartella" c
  WHERE upper(btrim(c."data" ->> 'codiceFiscale'))
    ~ '^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$'
) src
WHERE p."id" = src.pid
  AND src.cf IN (
    SELECT cf FROM (
      SELECT upper(btrim("data" ->> 'codiceFiscale')) AS cf FROM "Cartella"
    ) all_cf
    WHERE cf IS NOT NULL
    GROUP BY cf
    HAVING count(*) = 1
  );

CREATE UNIQUE INDEX "Patient_codiceFiscale_key" ON "Patient"("codiceFiscale");

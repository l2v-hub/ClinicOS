-- Demo-only backfill: gives the synthetic roster valid, unique fiscal codes so the
-- production preview exercises the same canonical identity flow as newly-created patients.
UPDATE "Patient" SET "codiceFiscale" = 'FRRMRA48C15F205N'
WHERE "medicalRecordNumber" = 'MRN-DEMO-001' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'FRRMRA48C15F205N');
UPDATE "Patient" SET "codiceFiscale" = 'MRTNNA55L62F205I'
WHERE "medicalRecordNumber" = 'MRN-DEMO-002' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'MRTNNA55L62F205I');
UPDATE "Patient" SET "codiceFiscale" = 'BSSGRG42S03L219O'
WHERE "medicalRecordNumber" = 'MRN-DEMO-003' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'BSSGRG42S03L219O');
UPDATE "Patient" SET "codiceFiscale" = 'LMBTRS61E48A944N'
WHERE "medicalRecordNumber" = 'MRN-DEMO-004' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'LMBTRS61E48A944N');
UPDATE "Patient" SET "codiceFiscale" = 'NRECRL38P27H501U'
WHERE "medicalRecordNumber" = 'MRN-DEMO-005' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'NRECRL38P27H501U');
UPDATE "Patient" SET "codiceFiscale" = 'GTTLCU70B54D612J'
WHERE "medicalRecordNumber" = 'MRN-DEMO-006' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'GTTLCU70B54D612J');
UPDATE "Patient" SET "codiceFiscale" = 'MNCRRT58T01F205I'
WHERE "medicalRecordNumber" = 'MRN-DEMO-007' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'MNCRRT58T01F205I');
UPDATE "Patient" SET "codiceFiscale" = 'MRTLNE85H70F205A'
WHERE "medicalRecordNumber" = 'MRN-DEMO-008' AND "codiceFiscale" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "Patient" WHERE "codiceFiscale" = 'MRTLNE85H70F205A');

-- Patient is the only authoritative identity store. Once demo identities are backfilled,
-- remove any legacy duplicate without rewriting the other clinical JSON keys.
UPDATE "Cartella" AS c
SET "data" = c."data" - 'codiceFiscale'
FROM "Patient" AS p
WHERE c."patientId" = p."id"
  AND p."medicalRecordNumber" LIKE 'MRN-DEMO-%';

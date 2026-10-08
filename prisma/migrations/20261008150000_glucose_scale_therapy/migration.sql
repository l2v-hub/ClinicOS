ALTER TABLE "PatientTherapy"
ADD COLUMN "doseMode" TEXT NOT NULL DEFAULT 'fixed',
ADD COLUMN "doseProtocol" JSONB;

ALTER TABLE "PatientTherapy"
ADD CONSTRAINT "PatientTherapy_doseMode_check"
CHECK ("doseMode" IN ('fixed', 'glucose_scale')),
ADD CONSTRAINT "PatientTherapy_doseProtocol_check"
CHECK (
  ("doseMode" = 'fixed' AND "doseProtocol" IS NULL)
  OR ("doseMode" = 'glucose_scale' AND "doseProtocol" IS NOT NULL)
);

ALTER TABLE "MedicationAdministration"
ADD COLUMN "doseContext" JSONB;
